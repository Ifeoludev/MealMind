import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { generateMealPlan, getMealPlanHistory } from "../controllers/mealPlan.controller";

const router = Router();

router.get("/", protect, getMealPlanHistory);
router.post("/generate", protect, generateMealPlan);

export default router;
