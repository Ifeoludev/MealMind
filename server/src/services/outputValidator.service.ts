// Parses and validates Claude's raw JSON response — retries up to 2x on failure

import { z } from "zod";
import { callGemini } from "./mealPlanAI.service";

const ingredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
});

const recipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  cuisine: z.string(),
  prep_time: z.number(),
  cook_time: z.number(),
  servings: z.number(),
  calories: z.number(),
  estimated_cost: z.number(),
  ingredients: z.array(ingredientSchema),
  instructions: z.array(z.string()),
});

const slotSchema = z.object({
  slot_type: z.enum(["breakfast", "lunch", "dinner"]),
  recipe: recipeSchema,
});

const daySchema = z.object({
  date: z.string(),
  slots: z.array(slotSchema),
});

const groceryItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  category: z.string(),
});

// Top-level shape Gemini must return
export const aiMealPlanSchema = z.object({
  plan_title: z.string(),
  days: z.array(daySchema),
  grocery_list: z.array(groceryItemSchema),
  total_estimated_cost: z.number(),
});

export type AIMealPlan = z.infer<typeof aiMealPlanSchema>;

// Strips markdown code fences Gemini sometimes wraps around JSON
function stripMarkdown(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

// Parses raw text as JSON then validates against the schema
function parseAndValidate(raw: string): AIMealPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdown(raw));
  } catch {
    throw new Error("Gemini returned non-JSON text");
  }

  const result = aiMealPlanSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Invalid AI response: ${issue.path.join(".")} — ${issue.message}`,
    );
  }

  return result.data;
}

// Validates and retries the Claude call up to 3 attempts total
export async function validateWithRetry(
  prompt: string,
  initialRaw: string,
): Promise<AIMealPlan> {
  const MAX_ATTEMPTS = 3;
  let raw = initialRaw;
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return parseAndValidate(raw);
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_ATTEMPTS) raw = await callGemini(prompt);
    }
  }

  throw new Error(
    `AI validation failed after ${MAX_ATTEMPTS} attempts: ${lastError.message}`,
  );
}
