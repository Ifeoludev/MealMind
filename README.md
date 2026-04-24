# MealMind

An AI-powered meal planning and grocery optimisation application. Users describe what they need, set a weekly budget in Nigerian Naira, and MealMind generates a full personalised meal plan with a consolidated grocery list — in under 30 seconds.

**Live demo:** https://meal-mind-sigma.vercel.app  
**Backend API:** https://mealmind-production-b7ed.up.railway.app  
**Repository:** https://github.com/Ifeoludev/MealMind

---

## What it does

1. User sets dietary preferences once (restrictions, allergies, cuisine preferences, budget)
2. User requests a plan — single day or full week, choosing which meal slots to include
3. The AI generates recipes, estimates costs per ingredient, and builds an aggregated shopping list
4. Every subsequent identical request is served from cache instead of calling the AI again
5. All generated plans are stored and accessible through a paginated history view

---

## Engineering highlights

These are the decisions that make this more than a basic CRUD app:

**Idempotency via Redis caching.** Before any AI call, the server hashes `(user_id + scope + date + budget + slots + user_prompt)` with SHA-256 and checks Redis. Identical requests within 7 days return the cached result instantly, with zero AI cost. This protects against accidental double-submits, client retries, and API credit drain.

**Immutable meal plans.** Meal plans are never mutated. Regenerating creates a new version and archives the old one, referenced via `parent_id`. This preserves a complete audit trail and prevents history from becoming inconsistent.

**Hybrid constraint-based AI generation.** The prompt is programmatically constructed from the user's stored preferences snapshot (diet, allergies, cuisine, servings) combined with the per-request parameters (budget, date range, slots). The AI never sees raw user input — it receives a structured, validated prompt. The preferences snapshot is stored on each plan so history remains accurate even if preferences change later.

**Validated AI output with retry.** The AI response is parsed against a strict Zod schema. If the output is malformed — which language models occasionally produce — the system retries up to 3 times with the same prompt before failing. Markdown code fences are stripped before parsing, since models sometimes wrap JSON in triple backticks.

**Atomic database writes.** The entire plan — MealPlan, MealSlots, Recipes, GroceryList, and GroceryItems — is written in a single Prisma transaction. If any insert fails, nothing is committed. This prevents orphaned records and partial plans.

**Google OAuth with email/password fallback.** Authentication supports both flows. Google users are identified by `google_id` (Google's permanent sub claim). If a user who originally registered with email later signs in with Google, the system links the accounts by attaching `google_id` to the existing user rather than creating a duplicate.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Express 5, TypeScript, Node.js 20 |
| Database | PostgreSQL 16 (Railway) |
| Cache | Redis 7 (Railway) |
| ORM | Prisma 7 |
| AI | Google Gemini 2.5 Flash (via REST, SSE streaming) |
| Auth | JWT (jsonwebtoken), bcrypt, Google OAuth 2.0 |
| Deployment | Railway (backend + DB + Redis), Vercel (frontend) |
| Containerisation | Docker (multi-stage build) |

---

## Architecture

```
Browser (Vercel)
    |
    | HTTPS
    v
Express API (Railway)
    |
    |-- Redis: idempotency cache (SHA-256 key, 7-day TTL)
    |
    |-- PostgreSQL: persistent storage
    |       User, UserPreferences, MealPlan, MealSlot,
    |       Recipe, GroceryList, GroceryItem
    |
    |-- Gemini API: AI generation (SSE streaming)
    |
    |-- Google OAuth: token verification
```

### Request pipeline for meal plan generation

```
POST /api/meal-plans/generate
    |
    1. Zod validation (scope, date, slots, budget, user_prompt)
    |
    2. Idempotency check (Redis)
       - HIT  -> return cached plan immediately
       - MISS -> continue
    |
    3. Load UserPreferences from DB (nullable — defaults used if not set)
    |
    4. Build prompt (preferences snapshot + request params)
    |
    5. Call Gemini via SSE (up to 4 retries on 503)
    |
    6. Validate AI output against Zod schema (up to 3 retries)
    |
    7. Atomic DB transaction:
       MealPlan + MealSlots + Recipes + GroceryList + GroceryItems
    |
    8. Cache result in Redis
    |
    9. Return plan
```

---

## Database schema

```
User
  id, email, name, password (nullable), google_id (unique, nullable)

UserPreferences
  user_id (FK), dietary_restrictions[], allergies[], cuisine_preferences[],
  disliked_ingredients[], servings_per_meal, budget_per_week

MealPlan
  user_id (FK), plan_type (daily/weekly/custom), status (draft/active/archived),
  start_date, end_date, budget, total_estimated_cost, user_prompt,
  preferences_snapshot (JSON), version, parent_id (self-ref for versioning)

MealSlot
  meal_plan_id (FK), date, slot_type (breakfast/lunch/dinner), recipe_id (FK)

Recipe
  name, description, cuisine, prep_time, cook_time, servings, calories,
  estimated_cost, ingredients (JSON), instructions (JSON), prompt_hash (unique)

GroceryList
  meal_plan_id (FK, unique)

GroceryItem
  grocery_list_id (FK), recipe_id (FK), name, quantity, unit, category, checked
```

---

## Security

- **CORS** — explicit origin allowlist from env, rejects all unlisted origins
- **Rate limiting** — 200 req/15min general, 20 req/15min on auth routes, 10 req/hr on generate
- **JWT** — 7-day expiry, 128-character cryptographically random secret
- **Passwords** — bcrypt with 10 salt rounds
- **Google tokens** — verified server-side via `google-auth-library` `verifyIdToken` with audience check
- **Environment secrets** — validated at server startup; process exits immediately if any required variable is missing
- **SQL injection** — not possible; all queries go through Prisma's parameterised query engine

---

## Local development

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (for Postgres and Redis)
- A Google Cloud project with OAuth 2.0 credentials
- A Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Ifeoludev/MealMind.git
cd MealMind
```

### 2. Start the database and cache

```bash
docker compose up -d
```

This starts PostgreSQL on port 5433 and Redis on port 6379.

### 3. Configure the server

```bash
cd server
cp .env.example .env
```

Fill in `server/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/mealmind?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3001
JWT_SECRET="generate-a-64-byte-hex-string"
GEMINI_API_KEY="your-gemini-api-key"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
ALLOWED_ORIGINS="http://localhost:5173"
```

To generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Run database migrations and generate Prisma client

```bash
cd server
npm install
npx prisma migrate deploy
npx prisma generate
```

### 5. Start the backend

```bash
npm run dev
```

The server runs at `http://localhost:3001`.

### 6. Configure the frontend

```bash
cd client
```

Create `client/.env`:

```env
VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
```

Leave `VITE_API_URL` unset in development — Vite proxies `/api` to `localhost:3001` automatically.

### 7. Start the frontend

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Environment variables reference

### Server

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `PORT` | No | Server port (default 3000) |
| `JWT_SECRET` | Yes | 64-byte hex string for signing JWTs |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 client ID |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins |

### Client

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Production only | Backend origin without `/api` suffix |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 client ID (same value as server) |

---

## API endpoints

All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register with email and password |
| POST | `/api/auth/login` | Public | Login with email and password |
| POST | `/api/auth/google` | Public | Authenticate with Google ID token |

### Meal plans

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/meal-plans/generate` | Required | Generate a new meal plan |
| GET | `/api/meal-plans` | Required | Get paginated plan history |

**Generate request body:**
```json
{
  "scope": "week",
  "date": "2026-04-21",
  "slots": ["breakfast", "lunch", "dinner"],
  "budget": 15000,
  "user_prompt": "Include Nigerian soups"
}
```

### Preferences

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/preferences` | Required | Save or update preferences |
| GET | `/api/preferences` | Required | Get current preferences |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Server health check |

---

## Deployment

The backend is containerised with a multi-stage Docker build. Stage 1 compiles TypeScript and generates the Prisma client. Stage 2 copies only the compiled JavaScript and production dependencies into a minimal Alpine Linux image (~200MB vs ~1GB for a single-stage build).

On startup, the container runs `prisma migrate deploy` before starting the server — so schema migrations are applied automatically on every deployment without manual intervention.

**Backend:** Railway (auto-deploys on push to `master`)  
**Frontend:** Vercel (auto-deploys on push to `master`, root directory: `client/`)

---

## Project structure

```
MealMind/
├── client/                        # React frontend
│   ├── src/
│   │   ├── api/api.ts             # Axios instance with JWT interceptor
│   │   ├── components/            # DayCard, RecipeModal, GroceryListPanel,
│   │   │                          # Navbar, TagInput, ProtectedRoute
│   │   ├── context/AuthContext.tsx
│   │   ├── pages/                 # Dashboard, Generate, History,
│   │   │                          # Preferences, Login, Register
│   │   └── types/mealPlan.ts      # Shared TypeScript interfaces
│   └── vercel.json                # SPA rewrites + CORS headers
│
├── server/                        # Express backend
│   ├── src/
│   │   ├── app.ts                 # Express app, CORS, rate limiting
│   │   ├── config/                # db.ts, redis.ts, gemini.ts
│   │   ├── controllers/           # auth, mealPlan, preferences
│   │   ├── middleware/            # auth (JWT), rateLimit
│   │   ├── repositories/          # Data access layer (Prisma queries)
│   │   ├── routes/                # auth, mealPlan, preferences
│   │   ├── services/
│   │   │   ├── mealPlanAI.service.ts      # Gemini SSE streaming
│   │   │   ├── promptBuilder.service.ts   # Structured prompt construction
│   │   │   ├── outputValidator.service.ts # Zod validation + retry
│   │   │   └── idempotency.service.ts     # Redis SHA-256 caching
│   │   ├── types/express.d.ts     # Request augmentation (req.user)
│   │   └── validators/            # Zod input schemas
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── Dockerfile                 # Multi-stage production build
│
└── docker-compose.yml             # Local Postgres + Redis
```
