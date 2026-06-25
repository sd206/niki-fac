"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { startOfMonth, endOfMonth, formatDayLabel } from "@/lib/date";
import {
  useCreateMeal,
  useCreateRecipe,
  useCreateShoppingItem,
  useCurrentFamily,
  useDeleteMeal,
  useDeleteShoppingItem,
  useMeals,
  useRecipes,
  useShoppingList,
  useUpdateShoppingItem,
} from "@/lib/queries";
import type { Meal, MealType, ShoppingListItem } from "@niki/shared-types";
import { useState } from "react";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-100 text-amber-800",
  lunch: "bg-blue-100 text-blue-800",
  dinner: "bg-indigo-100 text-indigo-800",
  snack: "bg-gray-100 text-gray-600",
};

function MealsInner() {
  const { family } = useCurrentFamily();
  const month = new Date();
  const from = startOfMonth(month).toISOString();
  const to = endOfMonth(month).toISOString();
  const { data: meals = [] } = useMeals(family?.familyId, from, to);
  const { data: recipes = [] } = useRecipes(family?.familyId);
  const { data: shopping = [] } = useShoppingList(family?.familyId);
  const createMeal = useCreateMeal();
  const delMeal = useDeleteMeal();
  const createRecipe = useCreateRecipe();
  const createShopping = useCreateShoppingItem();
  const updateShopping = useUpdateShoppingItem();
  const delShopping = useDeleteShoppingItem();

  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState("");
  const [shoppingName, setShoppingName] = useState("");

  if (!family) {
    return <div className="p-8 text-gray-600">No family yet. Create one from the home screen first.</div>;
  }

  const mealsByDate = new Map<string, Meal[]>();
  for (const m of meals) {
    const key = new Date(m.date).toDateString();
    const arr = mealsByDate.get(key) ?? [];
    arr.push(m);
    mealsByDate.set(key, arr);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + i);
    return d;
  });

  async function addMeal(date: Date, mealType: MealType) {
    await createMeal.mutateAsync({
      familyId: family!.familyId,
      date: date.toISOString(),
      mealType,
      title: `${mealType}`,
    });
  }

  async function addRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeTitle) return;
    await createRecipe.mutateAsync({
      familyId: family!.familyId,
      title: recipeTitle,
      ingredients: recipeIngredients.split("\n").filter(Boolean),
    });
    setRecipeTitle(""); setRecipeIngredients(""); setShowRecipe(false);
  }

  async function addShoppingItem(e: React.FormEvent) {
    e.preventDefault();
    if (!shoppingName) return;
    await createShopping.mutateAsync({ familyId: family!.familyId, name: shoppingName });
    setShoppingName("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Meal Planner</h1>
        <button
          onClick={() => setShowRecipe(!showRecipe)}
          className="rounded-card bg-primary px-3 py-1 text-sm font-semibold text-white"
        >
          New recipe
        </button>
      </div>

      {showRecipe && (
        <form onSubmit={addRecipe} className="mx-6 mb-4 space-y-2 rounded-card border border-gray-200 p-4">
          <input value={recipeTitle} onChange={(e) => setRecipeTitle(e.target.value)} placeholder="Recipe title" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
          <textarea value={recipeIngredients} onChange={(e) => setRecipeIngredients(e.target.value)} placeholder="Ingredients (one per line)" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" rows={4} />
          <button type="submit" className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Save recipe</button>
        </form>
      )}

      {recipes.length > 0 && (
        <div className="px-6 pb-2">
          <details className="rounded-card border border-gray-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">Recipes ({recipes.length})</summary>
            <ul className="mt-2 space-y-1">
              {recipes.map((r) => (
                <li key={r.id} className="text-sm text-gray-600">
                  <span className="font-medium">{r.title}</span>
                  {r.ingredients && <span className="text-gray-400"> - {r.ingredients.length} ingredients</span>}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      <div className="px-6 pb-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">This Week</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {days.map((d) => {
            const dayMeals = mealsByDate.get(d.toDateString()) ?? [];
            return (
              <div key={d.toISOString()} className="rounded-card border border-gray-200 p-2">
                <div className="mb-2 text-xs font-semibold text-gray-700">{formatDayLabel(d)}</div>
                <div className="space-y-1">
                  {dayMeals.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded bg-gray-50 px-1.5 py-1 text-xs">
                      <span className={`rounded px-1 ${MEAL_COLORS[m.mealType]}`}>{m.mealType}</span>
                      <span className="ml-1 truncate">{m.title}</span>
                      <button onClick={() => delMeal.mutate(m.id)} className="text-danger">x</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1">
                    {MEAL_TYPES.map((mt) => (
                      <button
                        key={mt}
                        onClick={() => addMeal(d, mt)}
                        className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/20"
                      >
                        +{mt[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-8">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Shopping List</h2>
        <form onSubmit={addShoppingItem} className="mb-3 flex gap-2">
          <input value={shoppingName} onChange={(e) => setShoppingName(e.target.value)} placeholder="Add item..." className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Add</button>
        </form>
        <ul className="space-y-1">
          {shopping.map((item: ShoppingListItem) => (
            <li key={item.id} className="flex items-center justify-between rounded-card border border-gray-200 p-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => updateShopping.mutate({ id: item.id, patch: { checked: !item.checked } })}
                  className="h-4 w-4"
                />
                <span className={`text-sm ${item.checked ? "line-through text-gray-400" : "text-gray-900"}`}>
                  {item.name}
                  {item.category && <span className="ml-2 text-xs text-gray-400">{item.category}</span>}
                </span>
              </div>
              <button onClick={() => delShopping.mutate(item.id)} className="text-xs text-danger">Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function MealsPage() {
  return (
    <RequireAuth>
      <NavBar />
      <MealsInner />
    </RequireAuth>
  );
}
