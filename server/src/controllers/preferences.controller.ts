import { Request, Response } from "express";
import { upsertPreferences, findPreferencesByUserId } from "../repositories/preferences.repository";

export const savePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const {
      dietary_restrictions,
      allergies,
      cuisine_preferences,
      disliked_ingredients,
      servings_per_meal,
      budget_per_week,
    } = req.body;

    if (servings_per_meal !== undefined && (typeof servings_per_meal !== "number" || servings_per_meal < 1)) {
      res.status(400).json({ message: "servings_per_meal must be a positive integer" });
      return;
    }

    if (budget_per_week !== undefined && (typeof budget_per_week !== "number" || budget_per_week <= 0)) {
      res.status(400).json({ message: "budget_per_week must be a positive number" });
      return;
    }

    const preferences = await upsertPreferences(userId, {
      dietary_restrictions,
      allergies,
      cuisine_preferences,
      disliked_ingredients,
      servings_per_meal,
      budget_per_week,
    });

    res.status(200).json({ message: "Preferences saved", preferences });
  } catch (error) {
    console.error("Save preferences error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const preferences = await findPreferencesByUserId(userId);

    if (!preferences) {
      res.status(404).json({ message: "No preferences set yet" });
      return;
    }

    res.status(200).json({ preferences });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
