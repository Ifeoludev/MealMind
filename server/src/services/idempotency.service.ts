// Handles Redis caching for meal plan generation to avoid duplicate AI calls

import crypto from "crypto";
import redis from "../config/redis";
import { GenerateMealPlanInput } from "../validators/mealPlan.validator";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const KEY_PREFIX = "mealmind:mealplan:";

// Builds a unique SHA-256 key from userId + request inputs
// Slots are sorted so order doesn't affect the hash
export function buildIdempotencyKey(userId: string, input: GenerateMealPlanInput): string {
  const normalized = {
    userId,
    scope: input.scope,
    date: input.date,
    slots: [...input.slots].sort(),
    budget: input.budget,
    user_prompt: input.user_prompt ?? "",
  };

  const hash = crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  return `${KEY_PREFIX}${hash}`;
}

// Returns the cached plan or null if not found
export async function getCachedPlan(key: string): Promise<object | null> {
  const cached = await redis.get(key);
  if (!cached) return null;
  return JSON.parse(cached);
}

// Stores the completed plan in Redis with a 7-day TTL
export async function cachePlan(key: string, plan: object): Promise<void> {
  await redis.set(key, JSON.stringify(plan), "EX", CACHE_TTL_SECONDS);
}
