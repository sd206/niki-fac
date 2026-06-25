import { getDb, schema, writeAuditLog } from "@niki/db";
import type {
  CreateMealRequest,
  CreateRecipeRequest,
  CreateShoppingItemRequest,
  ListMealsQuery,
  Meal,
  Recipe,
  ShoppingListItem,
  UpdateMealRequest,
  UpdateShoppingItemRequest,
} from "@niki/shared-types";
import { and, asc, eq, gte, lte } from "drizzle-orm";

export async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.firebaseUid, firebaseUid))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function isFamilyMember(familyId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ userId: schema.familyMembers.userId })
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.familyId, familyId),
        eq(schema.familyMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ---- Recipes ----

export async function listRecipes(familyId: string): Promise<Recipe[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.familyId, familyId))
    .orderBy(asc(schema.recipes.title));
  return rows.map(rowToRecipe);
}

export async function createRecipe(userId: string, input: CreateRecipeRequest): Promise<Recipe> {
  const db = getDb();
  const inserted = await db
    .insert(schema.recipes)
    .values({
      familyId: input.familyId,
      title: input.title,
      description: input.description ?? null,
      ingredients: input.ingredients ?? null,
      steps: input.steps ?? null,
      prepTimeMin: input.prepTimeMin ?? null,
      cookTimeMin: input.cookTimeMin ?? null,
      servings: input.servings ?? 4,
      createdBy: userId,
    })
    .returning();
  const recipe = rowToRecipe(inserted[0]!);
  await writeAuditLog({ familyId: input.familyId, actorId: userId, action: "created", entity: "recipe", entityId: recipe.id, after: { title: recipe.title } });
  return recipe;
}

export async function getRecipe(recipeId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.id, recipeId))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.recipes).where(eq(schema.recipes.id, recipeId));
}

// ---- Meals ----

export async function listMeals(params: ListMealsQuery): Promise<Meal[]> {
  const db = getDb();
  const conditions = [eq(schema.meals.familyId, params.familyId)];
  if (params.from) conditions.push(gte(schema.meals.date, new Date(params.from)));
  if (params.to) conditions.push(lte(schema.meals.date, new Date(params.to)));

  const rows = await db
    .select()
    .from(schema.meals)
    .where(and(...conditions))
    .orderBy(asc(schema.meals.date));

  return rows.map(rowToMeal);
}

export async function createMeal(userId: string, input: CreateMealRequest): Promise<Meal> {
  const db = getDb();
  const inserted = await db
    .insert(schema.meals)
    .values({
      familyId: input.familyId,
      date: new Date(input.date),
      mealType: input.mealType,
      title: input.title ?? null,
      recipeId: input.recipeId ?? null,
      notes: input.notes ?? null,
      createdBy: userId,
    })
    .returning();
  const meal = rowToMeal(inserted[0]!);
  await writeAuditLog({ familyId: input.familyId, actorId: userId, action: "created", entity: "meal", entityId: meal.id, after: { title: meal.title, mealType: meal.mealType } });
  return meal;
}

export async function getMeal(mealId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.meals)
    .where(eq(schema.meals.id, mealId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateMeal(mealId: string, patch: UpdateMealRequest): Promise<Meal | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.mealType !== undefined) values.mealType = patch.mealType;
  if (patch.notes !== undefined) values.notes = patch.notes;

  const updated = await db
    .update(schema.meals)
    .set(values)
    .where(eq(schema.meals.id, mealId))
    .returning();
  return updated[0] ? rowToMeal(updated[0]) : null;
}

export async function deleteMeal(mealId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.meals).where(eq(schema.meals.id, mealId));
}

// ---- Shopping List ----

export async function listShoppingItems(familyId: string): Promise<ShoppingListItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.shoppingListItems)
    .where(eq(schema.shoppingListItems.familyId, familyId))
    .orderBy(asc(schema.shoppingListItems.createdAt));
  return rows.map(rowToShoppingItem);
}

export async function createShoppingItem(input: CreateShoppingItemRequest): Promise<ShoppingListItem> {
  const db = getDb();
  const inserted = await db
    .insert(schema.shoppingListItems)
    .values({
      familyId: input.familyId,
      name: input.name,
      quantity: input.quantity ?? null,
      category: input.category ?? null,
      mealId: input.mealId ?? null,
    })
    .returning();
  return rowToShoppingItem(inserted[0]!);
}

export async function updateShoppingItem(
  itemId: string,
  patch: UpdateShoppingItemRequest,
): Promise<ShoppingListItem | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.quantity !== undefined) values.quantity = patch.quantity;
  if (patch.category !== undefined) values.category = patch.category;
  if (patch.checked !== undefined) values.checked = patch.checked ? 1 : 0;

  const updated = await db
    .update(schema.shoppingListItems)
    .set(values)
    .where(eq(schema.shoppingListItems.id, itemId))
    .returning();
  return updated[0] ? rowToShoppingItem(updated[0]) : null;
}

export async function deleteShoppingItem(itemId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.shoppingListItems).where(eq(schema.shoppingListItems.id, itemId));
}

/** Auto-generates shopping list items from a recipe's ingredients. */
export async function generateShoppingListFromRecipe(
  familyId: string,
  recipeId: string,
): Promise<ShoppingListItem[]> {
  const recipe = await getRecipe(recipeId);
  if (!recipe || !recipe.ingredients) return [];

  const items: ShoppingListItem[] = [];
  for (const ingredient of recipe.ingredients) {
    const item = await createShoppingItem({
      familyId,
      name: ingredient,
      category: "auto",
    });
    items.push(item);
  }
  return items;
}

// ---- Mappers ----

function rowToRecipe(row: typeof schema.recipes.$inferSelect): Recipe {
  return {
    id: row.id,
    familyId: row.familyId,
    title: row.title,
    description: row.description,
    ingredients: row.ingredients,
    steps: row.steps,
    prepTimeMin: row.prepTimeMin,
    cookTimeMin: row.cookTimeMin,
    servings: row.servings ?? 4,
    source: row.source,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToMeal(row: typeof schema.meals.$inferSelect): Meal {
  return {
    id: row.id,
    familyId: row.familyId,
    date: row.date.toISOString(),
    mealType: row.mealType as Meal["mealType"],
    title: row.title,
    recipeId: row.recipeId,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToShoppingItem(row: typeof schema.shoppingListItems.$inferSelect): ShoppingListItem {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    quantity: row.quantity,
    category: row.category,
    checked: row.checked === 1,
    mealId: row.mealId,
    createdAt: row.createdAt.toISOString(),
  };
}
