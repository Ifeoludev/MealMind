import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import TagInput from "../components/TagInput";
import api from "../api/api";
import { AxiosError } from "axios";

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Halal",
  "Kosher",
  "Gluten-free",
];

const CUISINE_OPTIONS = [
  "Nigerian",
  "Italian",
  "Asian",
  "Mediterranean",
  "Mexican",
  "American",
  "African",
];

export default function PreferencesPage() {
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [dislikedIngredients, setDislikedIngredients] = useState<string[]>([]);
  const [servings, setServings] = useState(2);
  const [budget, setBudget] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load existing preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      setLoading(true);
      try {
        const { data } = await api.get("/preferences");
        const p = data.preferences;
        setDietaryRestrictions(p.dietary_restrictions ?? []);
        setAllergies(p.allergies ?? []);
        setCuisinePreferences(p.cuisine_preferences ?? []);
        setDislikedIngredients(p.disliked_ingredients ?? []);
        setServings(p.servings_per_meal ?? 2);
        setBudget(p.budget_per_week ? String(p.budget_per_week) : "");
      } catch {
        // 404 means no preferences saved yet — keep the defaults, that's fine
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  // Toggle a checkbox option in/out of an array
  function toggle(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      await api.post("/preferences", {
        dietary_restrictions: dietaryRestrictions,
        allergies,
        cuisine_preferences: cuisinePreferences,
        disliked_ingredients: dislikedIngredients,
        servings_per_meal: servings,
        budget_per_week: budget ? Number(budget) : undefined,
      });
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(
        axiosErr.response?.data?.message ?? "Failed to save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
        <Navbar />
        <div className="flex items-center justify-center mt-32">
          <p className="text-gray-400 text-sm">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">Your preferences</h1>
          <p className="text-gray-500 text-sm mt-1">
            These are used by MealMind every time it generates a meal plan for
            you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dietary restrictions */}
          <section className="bg-white rounded-2xl border border-gray-200 px-6 py-6">
            <h2 className="text-sm font-semibold text-black mb-1">
              Dietary restrictions
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              MealMind will only suggest meals that fit these.
            </p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((option) => {
                const active = dietaryRestrictions.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setDietaryRestrictions(
                        toggle(dietaryRestrictions, option),
                      )
                    }
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition cursor-pointer ${
                      active
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Allergies */}
          <section className="bg-white rounded-2xl border border-gray-200 px-6 py-6">
            <h2 className="text-sm font-semibold text-black mb-1">Allergies</h2>
            <p className="text-xs text-gray-400 mb-4">
              These ingredients will never appear in your meals — not even in
              small amounts.
            </p>
            <TagInput
              tags={allergies}
              onChange={setAllergies}
              placeholder="e.g. peanuts, shellfish, dairy"
            />
          </section>

          {/* Cuisine preferences */}
          <section className="bg-white rounded-2xl border border-gray-200 px-6 py-6">
            <h2 className="text-sm font-semibold text-black mb-1">
              Cuisine preferences
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              MealMind will lean towards these cuisines when generating your
              plans.
            </p>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map((option) => {
                const active = cuisinePreferences.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setCuisinePreferences(toggle(cuisinePreferences, option))
                    }
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition cursor-pointer ${
                      active
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Disliked ingredients */}
          <section className="bg-white rounded-2xl border border-gray-200 px-6 py-6">
            <h2 className="text-sm font-semibold text-black mb-1">
              Disliked ingredients
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              MealMind will avoid these where possible — not a hard rule like
              allergies.
            </p>
            <TagInput
              tags={dislikedIngredients}
              onChange={setDislikedIngredients}
              placeholder="e.g. cilantro, liver, bitter leaf"
            />
          </section>

          {/* Servings + Budget */}
          <section className="bg-white rounded-2xl border border-gray-200 px-6 py-6">
            <h2 className="text-sm font-semibold text-black mb-4">
              Serving & budget defaults
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Servings */}
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Servings per meal
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.max(1, s - 1))}
                    className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600 flex items-center justify-center text-lg font-medium transition cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-black font-semibold text-lg w-4 text-center">
                    {servings}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.min(10, s + 1))}
                    className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600 flex items-center justify-center text-lg font-medium transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Default weekly budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    ₦
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-200 text-black placeholder-gray-400 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
              Preferences saved successfully.
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium text-sm rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </form>
      </main>
    </div>
  );
}
