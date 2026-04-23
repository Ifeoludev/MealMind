import type { GroceryItem } from "../types/mealPlan";

interface Props {
  items: GroceryItem[];
}

// Controls display order of categories
const CATEGORY_ORDER = [
  "meat",
  "vegetables",
  "fruits",
  "grains",
  "dairy",
  "spices",
  "other",
];

function groupByCategory(items: GroceryItem[]): Record<string, GroceryItem[]> {
  return items.reduce(
    (acc, item) => {
      const cat = item.category.toLowerCase();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, GroceryItem[]>,
  );
}

export default function GroceryListPanel({ items }: Props) {
  const grouped = groupByCategory(items);

  const categories = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-black">Grocery list</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {items.length} item{items.length !== 1 ? "s" : ""} across all meals
        </p>
      </div>

      {/* Categories */}
      <div className="divide-y divide-gray-100">
        {categories.map((cat) => (
          <div key={cat} className="px-6 py-4">
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">
              {cat}
            </h3>
            <ul className="space-y-2">
              {grouped[cat].map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-black">{item.name}</span>
                  <span className="text-gray-400">
                    {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

    </div>
  );
}
