import "dotenv/config";
import express from "express";
import cors from "cors";
import { setDefaultResultOrder } from "dns";
import authRoutes from "./routes/auth.routes";
import preferencesRoutes from "./routes/preferences.routes";
import mealPlanRoutes from "./routes/mealPlan.routes";
import { generalLimiter } from "./middleware/rateLimit.middleware";

setDefaultResultOrder("ipv4first");

// Fail fast at startup if any required env var is missing — better than a
// cryptic runtime crash mid-request when a user is actually using the app
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL", "REDIS_URL", "GEMINI_API_KEY", "GOOGLE_CLIENT_ID"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env["PORT"] || 3000;

// Parse ALLOWED_ORIGINS from env — comma-separated list of allowed frontend URLs
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!requestOrigin) return callback(null, true);
      if (allowedOrigins.includes(requestOrigin)) return callback(null, true);
      callback(new Error(`CORS: origin '${requestOrigin}' not allowed`));
    },
    credentials: true, // allow cookies / Authorization headers cross-origin
  })
);

app.use(express.json());
app.use(generalLimiter);

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
