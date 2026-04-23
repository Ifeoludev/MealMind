// All database queries related to meal plans live here
// findMealPlansByUserId — paginated history query

import prisma from "../config/db";
import { GenerateMealPlanInput } from "../validators/mealPlan.validator";
import { AIMealPlan } from "../services/outputValidator.service";
import { UserPreferences } from "../generated/prisma/client";

function resolvePlanType(scope: string) {
  if (scope === "week") return "weekly" as const;
  if (scope === "day") return "daily" as const;
  return "custom" as const;
}

// Saves MealPlan + MealSlots + Recipes + GroceryList + GroceryItems atomically
// If any save fails, everything rolls back — no partial data is ever written
export async function saveMealPlanTransaction(
  userId: string,
  input: GenerateMealPlanInput,
  aiPlan: AIMealPlan,
  preferences: UserPreferences | null,
) {
  return prisma.$transaction(async (tx) => {
    const dates = aiPlan.days.map((d) => new Date(d.date));

    const mealPlan = await tx.mealPlan.create({
      data: {
        user_id: userId,
        plan_type: resolvePlanType(input.scope),
        start_date: dates[0],
        end_date: dates[dates.length - 1],
        budget: input.budget,
        total_estimated_cost: aiPlan.total_estimated_cost,
        user_prompt: input.user_prompt ?? null,
        // Snapshot preserves preferences at generation time — unaffected by future edits
        preferences_snapshot: preferences ?? {},
      },
    });

    for (const day of aiPlan.days) {
      for (const slot of day.slots) {
        const recipe = await tx.recipe.create({
          data: {
            name: slot.recipe.name,
            description: slot.recipe.description,
            cuisine: slot.recipe.cuisine,
            prep_time: slot.recipe.prep_time,
            cook_time: slot.recipe.cook_time,
            servings: slot.recipe.servings,
            calories: slot.recipe.calories,
            estimated_cost: slot.recipe.estimated_cost,
            ingredients: slot.recipe.ingredients,
            instructions: slot.recipe.instructions,
          },
        });

        await tx.mealSlot.create({
          data: {
            meal_plan_id: mealPlan.id,
            date: new Date(day.date),
            slot_type: slot.slot_type,
            recipe_id: recipe.id,
          },
        });
      }
    }

    const groceryList = await tx.groceryList.create({
      data: { meal_plan_id: mealPlan.id },
    });

    for (const item of aiPlan.grocery_list) {
      await tx.groceryItem.create({
        data: {
          grocery_list_id: groceryList.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
        },
      });
    }

    // Return the full plan with all relations for the API response
    return tx.mealPlan.findUnique({
      where: { id: mealPlan.id },
      include: {
        meal_slots: { include: { recipe: true } },
        grocery_list: { include: { items: true } },
      },
    });
  });
}

const PLAN_INCLUDE = {
  meal_slots: { include: { recipe: true } },
  grocery_list: { include: { items: true } },
} as const;

export async function findMealPlansByUserId(
  userId: string,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;

  const [plans, total] = await prisma.$transaction([
    prisma.mealPlan.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: PLAN_INCLUDE,
    }),
    prisma.mealPlan.count({ where: { user_id: userId } }),
  ]);

  return { plans, total };
}
