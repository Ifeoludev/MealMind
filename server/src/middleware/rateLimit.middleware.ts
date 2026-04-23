import rateLimit from "express-rate-limit";

// Applied to all routes — broad protection against general abuse
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again in a few minutes." },
});

// Applied to /auth/login and /auth/register — prevents brute-force and account enumeration
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait 15 minutes before trying again." },
});

// Applied only to POST /meal-plans/generate — each call hits the Gemini API
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "You have reached the generation limit. Please wait an hour before generating again." },
});
