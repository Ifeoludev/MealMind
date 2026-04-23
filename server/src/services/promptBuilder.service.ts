// Builds the prompt sent to Claude Haiku based on user input and preferences

import { GenerateMealPlanInput } from "../validators/mealPlan.validator";
import { UserPreferences } from "../generated/prisma/client";

// week = 7 dates, day/slot = just the one date
function buildDateRange(input: GenerateMealPlanInput): string[] {
  const start = new Date(input.date);
  const dates: string[] = [];
  const dayCount = input.scope === "week" ? 7 : 1;

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  return dates;
}

// Formats preferences into readable lines — fallback if user has no preferences set
function formatPreferences(prefs: UserPreferences | null): string {
  if (!prefs) return "No preferences set — generate a balanced, general-purpose meal plan.";

  const lines: string[] = [];
  if (prefs.dietary_restrictions.length > 0) lines.push(`Dietary restrictions: ${prefs.dietary_restrictions.join(", ")}`);
  if (prefs.allergies.length > 0) lines.push(`Allergies (must avoid completely): ${prefs.allergies.join(", ")}`);
  if (prefs.cuisine_preferences.length > 0) lines.push(`Preferred cuisines: ${prefs.cuisine_preferences.join(", ")}`);
  if (prefs.disliked_ingredients.length > 0) lines.push(`Disliked ingredients (avoid if possible): ${prefs.disliked_ingredients.join(", ")}`);
  lines.push(`Servings per meal: ${prefs.servings_per_meal}`);

  return lines.join("\n");
}

export function buildMealPlanPrompt(input: GenerateMealPlanInput, preferences: UserPreferences | null): string {
  const dates = buildDateRange(input);
  const slots = input.slots.join(", ");
  const preferencesBlock = formatPreferences(preferences);

  const scopeDescription =
    input.scope === "week"
      ? `a 7-day meal plan starting from ${input.date}`
      : input.scope === "day"
        ? `a single day meal plan for ${input.date}`
        : `specific meal slots (${slots}) for ${input.date}`;

  return `You are a professional meal planner and nutritionist. Generate ${scopeDescription}.

MEAL SLOTS TO GENERATE: ${slots}
DATES: ${dates.join(", ")}
TOTAL BUDGET: ₦${input.budget} for the entire plan (Nigerian Naira)

USER PREFERENCES:
${preferencesBlock}

${input.user_prompt ? `SPECIAL INSTRUCTIONS FROM USER:\n${input.user_prompt}\nNote: The user's instructions may contain typos or incomplete words — interpret their intent intelligently.` : ""}

RULES YOU MUST FOLLOW:
1. Stay strictly within the ₦${input.budget} budget — all costs are in Nigerian Naira (₦). Include an estimated cost per recipe and a total cost
2. Respect all allergies — never include an allergen even as a minor ingredient
3. Reuse ingredients across meals where possible to reduce waste and cost (leftover intelligence)
4. Vary the meals — do not repeat the same recipe more than once across the entire plan
5. Match recipes to the user's dietary restrictions and cuisine preferences
6. Each recipe must have clear step-by-step instructions
7. The grocery list must consolidate all ingredients across all recipes — combine duplicates and sum quantities

RESPOND WITH ONLY VALID JSON — no explanation, no markdown, no code block. Just raw JSON.

The JSON must follow this exact structure:
{
  "plan_title": "string",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "slot_type": "breakfast" | "lunch" | "dinner",
          "recipe": {
            "name": "string",
            "description": "string",
            "cuisine": "string",
            "prep_time": 10,
            "cook_time": 20,
            "servings": 2,
            "calories": 450,
            "estimated_cost": 5.50,
            "ingredients": [
              { "name": "string", "quantity": 1.5, "unit": "cup" }
            ],
            "instructions": ["Step 1", "Step 2"]
          }
        }
      ]
    }
  ],
  "grocery_list": [
    {
      "name": "string",
      "quantity": 2.5,
      "unit": "cup",
      "category": "grains | dairy | meat | vegetables | fruits | spices | other"
    }
  ],
  "total_estimated_cost": 45.00
}`;
}
