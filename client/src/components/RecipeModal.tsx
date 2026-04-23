import type { Recipe } from "../types/mealPlan";

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeModal({ recipe, onClose }: Props) {
  return (
    // Backdrop— click outside the card to close
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      {/* Card — stop clicks from bubbling to the backdrop */}
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-black">{recipe.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{recipe.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black text-2xl leading-none cursor-pointer shrink-0 mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Stats row */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-100 bg-gray-50">
          {[
            { label: "Cuisine", value: recipe.cuisine },
            { label: "Prep", value: `${recipe.prep_time}m` },
            { label: "Cook", value: `${recipe.cook_time}m` },
            { label: "Calories", value: `${recipe.calories} kcal` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-black mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Ingredients */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-black mb-3">
            Ingredients{" "}
            <span className="text-gray-400 font-normal">
              ({recipe.servings} serving{recipe.servings !== 1 ? "s" : ""})
            </span>
          </h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-black">{ing.name}</span>
                <span className="text-gray-400">
                  {ing.quantity} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-black mb-4">
            Instructions
          </h3>
          <ol className="space-y-4">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
