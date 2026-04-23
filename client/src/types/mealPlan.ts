// Shared types for the meal plan API response

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  calories: number;
  estimated_cost: number | null;
  ingredients: Ingredient[];
  instructions: string[];
}

export interface MealSlot {
  id: string;
  date: string;
  slot_type: "breakfast" | "lunch" | "dinner";
  recipe: Recipe;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked?: boolean;
}

export interface MealPlan {
  id: string;
  plan_type: string;
  start_date: string;
  end_date: string;
  budget: number;
  total_estimated_cost: number | null;
  created_at: string;
  meal_slots: MealSlot[];
  grocery_list: {
    id: string;
    items: GroceryItem[];
  } | null;
}

export interface PaginatedHistory {
  data: MealPlan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
