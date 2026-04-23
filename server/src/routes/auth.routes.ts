import { Router } from "express";
import { register, login, googleAuth } from "../controllers/auth.controller";
import { authLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);

export default router;
