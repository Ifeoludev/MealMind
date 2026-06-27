import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { setDefaultResultOrder } from "dns";
import authRoutes from "./routes/auth.routes";
import preferencesRoutes from "./routes/preferences.routes";
import mealPlanRoutes from "./routes/mealPlan.routes";

setDefaultResultOrder("ipv4first");

// Fail fast at startup if any required env var is missing — better than a
// cryptic runtime crash mid-request when a user is actually using the app
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL", "GEMINI_API_KEY", "GOOGLE_CLIENT_ID"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env["PORT"] || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  process.env["FRONTEND_URL"],
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/meal-plans", mealPlanRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
