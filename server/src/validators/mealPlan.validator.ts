// Zod schema that validates the body of POST /api/meal-plans/generate

import { z } from "zod";

export const generateMealPlanSchema = z.object({
  // Determines the range of the plan — a full week, a single day, or specific meal slots
  scope: z.enum(["week", "day", "slot"]),

  // Always treated as Day 1 of the plan regardless of scope
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
    .refine(
      (val) => !isNaN(new Date(val).getTime()),
      "date must be a valid calendar date",
    ),

  // The user must explicitly pick which meals to generate — no defaults
  slots: z
    .array(z.enum(["breakfast", "lunch", "dinner"]))
    .min(1, "slots must contain at least one value")
    .max(3, "slots can have at most 3 values")
    .refine(
      (arr) => new Set(arr).size === arr.length,
      "slots must not contain duplicates",
    ),

  // Budget for the entire plan in the user's currency
  budget: z.number().positive("budget must be a positive number"),

  // Optional free-text instruction from the user
  user_prompt: z
    .string()
    .max(500, "user_prompt must be at most 500 characters")
    .optional(),
});

export type GenerateMealPlanInput = z.infer<typeof generateMealPlanSchema>;
