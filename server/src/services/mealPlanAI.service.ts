// Calls Gemini REST API with streaming to avoid timeout on large plans

import axios, { AxiosError } from "axios";

const MODEL = "gemini-2.5-flash-lite";
const TEMPERATURE = 0.7;
const API_KEY = process.env.GEMINI_API_KEY!;
// alt=sse tells Gemini to stream Server-Sent Events instead of one big response
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?key=${API_KEY}&alt=sse`;

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Collects all SSE chunks from the stream into a single complete string
async function collectStream(stream: NodeJS.ReadableStream): Promise<string> {
  let fullText = "";

  return new Promise((resolve, reject) => {
    let buffer = "";

    stream.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;

        try {
          const json = JSON.parse(raw);
          const parts: { text?: string; thought?: boolean }[] =
            json.candidates?.[0]?.content?.parts ?? [];
          // Skip thought parts — only accumulate actual response text
          const chunk = parts.find((p) => !p.thought)?.text ?? "";
          fullText += chunk;
        } catch {
          // Ignore malformed SSE lines — Gemini occasionally sends metadata lines
        }
      }
    });

    stream.on("end", () => resolve(fullText));
    stream.on("error", reject);
  });
}

export async function callGemini(prompt: string): Promise<string> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        GEMINI_URL,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: TEMPERATURE,
            responseMimeType: "application/json",
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          responseType: "stream",
          timeout: 120000,
        },
      );

      const text = await collectStream(response.data);

      if (!text) throw new Error("Gemini returned an empty response");

      return text;
    } catch (err) {
      lastError = err as Error;
      const status = (err as AxiosError)?.response?.status;

      if (status === 503 && attempt < MAX_RETRIES) {
        console.warn(`Gemini 503 on attempt ${attempt} — retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}
