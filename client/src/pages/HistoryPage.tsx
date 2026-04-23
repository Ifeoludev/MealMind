import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import Navbar from "../components/Navbar";
import DayCard from "../components/DayCard";
import GroceryListPanel from "../components/GroceryListPanel";
import RecipeModal from "../components/RecipeModal";
import api from "../api/api";
import type { MealPlan, PaginatedHistory, MealSlot, Recipe } from "../types/mealPlan";

interface DayGroup {
  date: string;
  slots: MealSlot[];
}

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

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return s.toDateString() === e.toDateString() ? fmt(s) : `${fmt(s)} — ${fmt(e)}`;
}

function PlanCard({
  plan,
  onRecipeClick,
}: {
  plan: MealPlan;
  onRecipeClick: (r: Recipe) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const days = groupSlotsByDate(plan.meal_slots);
  const mealCount = plan.meal_slots.length;
  const label = plan.plan_type === "weekly" ? "Full week" : "Single day";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-black">
            {formatDateRange(plan.start_date, plan.end_date)}
          </span>
          <span className="text-xs text-gray-400">
            {label} · {mealCount} meal{mealCount !== 1 ? "s" : ""}
            {plan.total_estimated_cost != null && (
              <> · ₦{plan.total_estimated_cost.toLocaleString()} est.</>
            )}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
          {days.map((day) => (
            <DayCard
              key={day.date}
              date={day.date}
              slots={day.slots}
              onRecipeClick={onRecipeClick}
            />
          ))}
          {plan.grocery_list && plan.grocery_list.items.length > 0 && (
            <GroceryListPanel items={plan.grocery_list.items} />
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  async function fetchPage(pageNum: number, append: boolean) {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const { data } = await api.get<PaginatedHistory>(
        `/meal-plans?page=${pageNum}&limit=10`,
      );
      setPlans((prev) => (append ? [...prev, ...data.data] : data.data));
      setTotalPages(data.pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(axiosErr.response?.data?.message ?? "Failed to load history.");
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }

  useEffect(() => {
    fetchPage(1, false);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">Meal plan history</h1>
          <p className="text-gray-500 text-sm mt-1">
            All your previously generated plans, most recent first.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No meal plans yet.</p>
            <a
              href="/generate"
              className="mt-3 inline-block text-sm font-medium text-green-600 hover:underline"
            >
              Generate your first plan
            </a>
          </div>
        )}

        {plans.length > 0 && (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onRecipeClick={setSelectedRecipe} />
            ))}

            {page < totalPages && (
              <button
                onClick={() => fetchPage(page + 1, true)}
                disabled={loadingMore}
                className="w-full py-3 mt-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-green-400 hover:text-green-600 disabled:opacity-50 transition cursor-pointer"
              >
                {loadingMore ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    Loading more...
                  </span>
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </div>
        )}
      </main>

      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  );
}
