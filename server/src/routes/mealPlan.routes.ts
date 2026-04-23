import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { generateMealPlan, getMealPlanHistory } from "../controllers/mealPlan.controller";
import { generateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.get("/", protect, getMealPlanHistory);
router.post("/generate", protect, generateLimiter, generateMealPlan);

export default router;
