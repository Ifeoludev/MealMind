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
  const result = await model.generateContentStream(prompt);
  let text = "";
  for await (const chunk of result.stream) {
    text += chunk.text();
  }
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
