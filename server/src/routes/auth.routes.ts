import { Router } from "express";
import { register, login, googleAuth, refresh, logout } from "../controllers/auth.controller";
import { authLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
