import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import Navbar from "../components/Navbar";
import DayCard from "../components/DayCard";
import RecipeModal from "../components/RecipeModal";
import GroceryListPanel from "../components/GroceryListPanel";
import api from "../api/api";
import type { MealPlan, MealSlot, Recipe } from "../types/mealPlan";

// Returns today's date as YYYY-MM-DD using local time, not UTC
function todayLocal(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

interface DayGroup {
  date: string;
  slots: MealSlot[];
}

// Groups flat meal_slots array into per-day buckets, sorted by date
function groupSlotsByDate(mealSlots: MealSlot[]): DayGroup[] {
  const map = new Map<string, MealSlot[]>();
  for (const slot of mealSlots) {
    const dateKey = slot.date.split("T")[0];
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(slot);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slots]) => ({ date, slots }));
}

const SLOT_OPTIONS = ["breakfast", "lunch", "dinner"] as const;

function BudgetSummary({ budget, estimated }: { budget: number; estimated: number }) {
  const diff = budget - estimated;
  const under = diff >= 0;
  return (
    <div className={`rounded-xl border px-5 py-4 ${under ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <p className="text-sm font-semibold text-black mb-1">Budget summary</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
        <span>Set: <span className="font-medium text-black">₦{budget.toLocaleString()}</span></span>
        <span>Estimated: <span className="font-medium text-black">₦{estimated.toLocaleString()}</span></span>
        <span className={`font-medium ${under ? "text-green-700" : "text-red-600"}`}>
          {under ? `₦${diff.toLocaleString()} under budget` : `₦${Math.abs(diff).toLocaleString()} over budget`}
        </span>
      </div>
    </div>
  );
}

const LOADING_MESSAGES = [
  "Checking your preferences...",
  "Picking the best recipes for you...",
  "Getting ingredients ready...",
  "Sorting your meal slots...",
  "Estimating prices in Naira...",
  "Building your grocery list...",
  "Putting it all together...",
  "Almost done...",
];

export default function GeneratePage() {
  // Form fields
  const [scope, setScope] = useState<"day" | "week">("week");
  const [date, setDate] = useState(todayLocal());
  const [slots, setSlots] = useState<string[]>(["breakfast", "lunch", "dinner"]);
  const [budget, setBudget] = useState("");
  const [userPrompt, setUserPrompt] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState("");
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Cycles through status messages while loading
  useEffect(() => {
    if (!loading) {
      setStatusIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  function toggleSlot(slot: string) {
    setSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (slots.length === 0) {
      setError("Please select at least one meal slot.");
      return;
    }
    setError("");
    setMealPlan(null);
    setLoading(true);

    try {
      const { data } = await api.post("/meal-plans/generate", {
        scope,
        date,
        slots,
        budget: Number(budget),
        user_prompt: userPrompt.trim() || undefined,
      });
      setMealPlan(data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(
        axiosErr.response?.data?.message ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const days = mealPlan ? groupSlotsByDate(mealPlan.meal_slots) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">Generate a meal plan</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tell MealMind what you need and it will build a personalised plan for you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-6 space-y-6">

            {/* Scope toggle */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Plan duration
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
                {(["day", "week"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`px-6 py-2 text-sm font-medium transition cursor-pointer ${
                      scope === s
                        ? "bg-green-600 text-white"
                        : "bg-white text-gray-500 hover:text-black"
                    }`}
                  >
                    {s === "day" ? "Single day" : "Full week"}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                {scope === "week" ? "Starting date" : "Date"}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 text-black text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition"
              />
            </div>

            {/* Meal slots */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Meal slots
              </label>
              <div className="flex gap-2">
                {SLOT_OPTIONS.map((slot) => {
                  const active = slots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(slot)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition cursor-pointer capitalize ${
                        active
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Budget
              </label>
              <div className="relative w-full sm:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  ₦
                </span>
                <input
                  type="number"
                  min={1}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 15000"
                  required
                  className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-200 text-black placeholder-gray-400 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition"
                />
              </div>
            </div>

            {/* Special instructions */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Special instructions{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="e.g. Include Nigerian soups, make breakfast light, use affordable market ingredients..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-black placeholder-gray-400 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {userPrompt.length}/500
              </p>
            </div>

          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || slots.length === 0}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium text-sm rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? LOADING_MESSAGES[statusIndex] : "Generate meal plan"}
          </button>

          {loading && (
            <p className="text-center text-xs text-gray-400">
              This usually takes 15–30 seconds — hang tight.
            </p>
          )}

        </form>

        {/* Results */}
        {mealPlan && (
          <div className="mt-12 space-y-6">

            <h2 className="text-lg font-bold text-black">Your meal plan</h2>

            {/* Budget summary */}
            {mealPlan.total_estimated_cost != null && (
              <BudgetSummary
                budget={mealPlan.budget}
                estimated={mealPlan.total_estimated_cost}
              />
            )}

            {/* Day cards */}
            <div className="space-y-4">
              {days.map((day) => (
                <DayCard
                  key={day.date}
                  date={day.date}
                  slots={day.slots}
                  onRecipeClick={setSelectedRecipe}
                />
              ))}
            </div>

            {/* Grocery list */}
            {mealPlan.grocery_list && mealPlan.grocery_list.items.length > 0 && (
              <GroceryListPanel items={mealPlan.grocery_list.items} />
            )}

          </div>
        )}

      </main>

      {/* Recipe detail modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

    </div>
  );
}
