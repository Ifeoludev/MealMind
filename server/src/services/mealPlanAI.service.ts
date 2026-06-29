import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.7,
    responseMimeType: "application/json",
  },
});

export async function callGemini(prompt: string): Promise<string> {
  // Non-streaming: generateContentStream + responseMimeType "application/json"
  // hits a known parser bug in @google/generative-ai ("Failed to parse stream").
  // The 180s client-side timeout already covers slow generations without it.
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
