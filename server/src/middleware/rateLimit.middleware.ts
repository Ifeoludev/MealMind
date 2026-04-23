import rateLimit from "express-rate-limit";

// Applied to all routes — blocks abuse of auth, preferences, and history endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,  // sends RateLimit-* headers so clients know their status
  legacyHeaders: false,   // disables the old X-RateLimit-* headers
  message: { message: "Too many requests. Please try again in a few minutes." },
});

// Applied only to POST /meal-plans/generate — each call hits the Gemini API
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "You have reached the generation limit. Please wait an hour before generating again." },
});
