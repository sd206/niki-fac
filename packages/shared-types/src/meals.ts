export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Recipe {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  ingredients: string[] | null;
  steps: string[] | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number;
  source: string;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateRecipeRequest {
  familyId: string;
  title: string;
  description?: string;
  ingredients?: string[];
  steps?: string[];
  prepTimeMin?: number;
  cookTimeMin?: number;
  servings?: number;
}

export interface Meal {
  id: string;
  familyId: string;
  date: string;
  mealType: MealType;
  title: string | null;
  recipeId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateMealRequest {
  familyId: string;
  date: string;
  mealType: MealType;
  title?: string;
  recipeId?: string;
  notes?: string;
}

export interface UpdateMealRequest {
  title?: string | null;
  mealType?: MealType;
  notes?: string | null;
}

export interface ListMealsQuery {
  familyId: string;
  from?: string;
  to?: string;
}

export interface ShoppingListItem {
  id: string;
  familyId: string;
  name: string;
  quantity: string | null;
  category: string | null;
  checked: boolean;
  mealId: string | null;
  createdAt: string;
}

export interface CreateShoppingItemRequest {
  familyId: string;
  name: string;
  quantity?: string;
  category?: string;
  mealId?: string;
}

export interface UpdateShoppingItemRequest {
  name?: string;
  quantity?: string | null;
  category?: string | null;
  checked?: boolean;
}
