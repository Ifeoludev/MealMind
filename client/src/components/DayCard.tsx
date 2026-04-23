import type { MealSlot, Recipe } from "../types/mealPlan";

const SLOT_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2 };

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface Props {
  date: string;
  slots: MealSlot[];
  onRecipeClick: (recipe: Recipe) => void;
}

export default function DayCard({ date, slots, onRecipeClick }: Props) {
  const sorted = [...slots].sort(
    (a, b) => SLOT_ORDER[a.slot_type] - SLOT_ORDER[b.slot_type],
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

      {/* Date header */}
      <div className="px-5 py-3 border-b border-gray-100 bg-green-50">
        <h3 className="text-sm font-semibold text-green-800">{formatDate(date)}</h3>
      </div>

      {/* Meal rows */}
      <div className="divide-y divide-gray-100">
        {sorted.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onRecipeClick(slot.recipe)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-gray-400 uppercase w-16 shrink-0">
                {slot.slot_type}
              </span>
              <span className="text-sm font-medium text-black group-hover:text-green-700 transition">
                {slot.recipe.name}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="text-xs text-gray-400">{slot.recipe.calories} kcal</span>
              <span className="text-gray-300 text-sm">›</span>
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}
