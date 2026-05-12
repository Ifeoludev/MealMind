import { Request, Response } from "express";
import { generateMealPlanSchema } from "../validators/mealPlan.validator";
import { findPreferencesByUserId } from "../repositories/preferences.repository";
import { buildMealPlanPrompt } from "../services/promptBuilder.service";
import { callGemini } from "../services/mealPlanAI.service";
import { validateWithRetry } from "../services/outputValidator.service";
import { saveMealPlanTransaction, findMealPlansByUserId } from "../repositories/mealPlan.repository";

export const getMealPlanHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await findMealPlansByUserId(req.user!.id);
    res.status(200).json({ data: plans });
  } catch (error) {
    console.error("Get meal plan history error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const generateMealPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    // Step 1: Validate request body
    const result = generateMealPlanSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
      return;
    }

    const input = result.data;
    const userId = req.user!.id;

    // Step 2: Load user preferences — null if not set yet
    const preferences = await findPreferencesByUserId(userId);

    // Step 3: Build the prompt from input + preferences
    const prompt = buildMealPlanPrompt(input, preferences);

    // Step 4: Call Gemini and get raw text response
    const rawAIResponse = await callGemini(prompt);

    // Step 5: Parse and validate — retries up to 2x if Gemini returns bad output
    const validatedPlan = await validateWithRetry(prompt, rawAIResponse);

    // Step 6: Save everything atomically to the DB
    const savedPlan = await saveMealPlanTransaction(userId, input, validatedPlan, preferences);

    res.status(201).json({ data: savedPlan });
  } catch (error) {
    console.error("Generate meal plan error:", error);
    if (error instanceof Error && "cause" in error) {
      console.error("Root cause:", (error as Error & { cause: unknown }).cause);
    }
    res.status(500).json({ message: "Internal server error" });
  }
};
