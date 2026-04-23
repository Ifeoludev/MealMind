import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import Navbar from "../components/Navbar";
import DayCard from "../components/DayCard";
import GroceryListPanel from "../components/GroceryListPanel";
import RecipeModal from "../components/RecipeModal";
import { useAuth } from "../context/AuthContext";
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

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name.split(" ")[0];
  return `${prefix}, ${firstName}`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-black">{value}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-start gap-4 hover:border-green-400 hover:shadow-sm transition group"
    >
      <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-black">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [latestPlan, setLatestPlan] = useState<MealPlan | null>(null);
  const [totalPlans, setTotalPlans] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get<PaginatedHistory>("/meal-plans?page=1&limit=1");
        setTotalPlans(data.pagination.total);
        setLatestPlan(data.data[0] ?? null);
      } catch (err) {
        const axiosErr = err as AxiosError<{ message: string }>;
        console.error(axiosErr.response?.data?.message ?? "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const days = latestPlan ? groupSlotsByDate(latestPlan.meal_slots) : [];

  const lastGeneratedLabel = latestPlan
    ? new Date(latestPlan.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-black">
            {user ? getGreeting(user.name) : "Welcome back"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's an overview of your meal planning activity.
          </p>
        </div>

        {/* Stats strip */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-16 mb-2" />
                <div className="h-6 bg-gray-100 rounded w-10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total plans" value={totalPlans} />
            <StatCard
              label="Total meals"
              value={
                totalPlans === 0
                  ? 0
                  : latestPlan
                  ? `${latestPlan.meal_slots.length} (latest)`
                  : "—"
              }
            />
            <StatCard label="Last generated" value={lastGeneratedLabel} />
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickAction
              to="/generate"
              title="Generate plan"
              description="Create a new AI meal plan"
              icon={
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            />
            <QuickAction
              to="/history"
              title="View history"
              description="Browse all past plans"
              icon={
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <QuickAction
              to="/preferences"
              title="Preferences"
              description="Update dietary settings"
              icon={
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Latest plan */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Latest plan
          </h2>

          {loading && (
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          )}

          {!loading && !latestPlan && (
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 text-center">
              <p className="text-gray-400 text-sm">You haven't generated any plans yet.</p>
              <Link
                to="/generate"
                className="mt-3 inline-block text-sm font-medium text-green-600 hover:underline"
              >
                Generate your first plan →
              </Link>
            </div>
          )}

          {!loading && latestPlan && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-black">
                    {formatDateRange(latestPlan.start_date, latestPlan.end_date)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {latestPlan.plan_type === "weekly" ? "Full week" : "Single day"} ·{" "}
                    {latestPlan.meal_slots.length} meal
                    {latestPlan.meal_slots.length !== 1 ? "s" : ""}
                    {latestPlan.total_estimated_cost != null && (
                      <> · ₦{latestPlan.total_estimated_cost.toLocaleString()} est.</>
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
                      onRecipeClick={setSelectedRecipe}
                    />
                  ))}
                  {latestPlan.grocery_list && latestPlan.grocery_list.items.length > 0 && (
                    <GroceryListPanel items={latestPlan.grocery_list.items} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  );
}
