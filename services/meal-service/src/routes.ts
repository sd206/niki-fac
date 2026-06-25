import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  createMeal,
  createRecipe,
  createShoppingItem,
  deleteMeal,
  deleteRecipe,
  deleteShoppingItem,
  generateShoppingListFromRecipe,
  getMeal,
  getRecipe,
  isFamilyMember,
  listMeals,
  listRecipes,
  listShoppingItems,
  resolveUserId,
  updateMeal,
  updateShoppingItem,
} from "./repository.js";

const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const createRecipeSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ingredients: z.array(z.string().max(200)).max(100).optional(),
  steps: z.array(z.string().max(2000)).max(50).optional(),
  prepTimeMin: z.number().int().min(0).max(600).optional(),
  cookTimeMin: z.number().int().min(0).max(600).optional(),
  servings: z.number().int().min(1).max(50).optional(),
});

const createMealSchema = z.object({
  familyId: z.string().uuid(),
  date: z.string().datetime(),
  mealType: mealTypeSchema,
  title: z.string().max(200).optional(),
  recipeId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

const updateMealSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  mealType: mealTypeSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const listMealsSchema = z.object({
  familyId: z.string().uuid(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const createShoppingSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(200),
  quantity: z.string().max(50).optional(),
  category: z.string().max(60).optional(),
  mealId: z.string().uuid().optional(),
});

const updateShoppingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.string().max(50).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  checked: z.boolean().optional(),
});

export const mealRouter: ExpressRouter = Router();
mealRouter.use(withCaller);

async function requireMembership(
  req: Request,
  res: Response,
  familyId: string,
): Promise<string | null> {
  const userId = await resolveUserId(req.caller!.uid);
  if (!userId || !(await isFamilyMember(familyId, userId))) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return null;
  }
  return userId;
}

// ---- Recipes ----

mealRouter.get("/recipes", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const recipes = await listRecipes(parsed.data.familyId);
  res.json({ data: recipes });
});

mealRouter.post("/recipes", async (req, res) => {
  const parsed = createRecipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const recipe = await createRecipe(userId, parsed.data);
  res.status(201).json({ data: recipe });
});

mealRouter.delete("/recipes/:id", async (req, res) => {
  const recipe = await getRecipe(req.params.id);
  if (!recipe) {
    res.status(404).json({ error: { code: "not_found", message: "Recipe not found" } });
    return;
  }
  const userId = await requireMembership(req, res, recipe.familyId);
  if (!userId) return;
  await deleteRecipe(req.params.id);
  res.status(204).end();
});

mealRouter.post("/recipes/:id/shopping-list", async (req, res) => {
  const recipe = await getRecipe(req.params.id);
  if (!recipe) {
    res.status(404).json({ error: { code: "not_found", message: "Recipe not found" } });
    return;
  }
  const userId = await requireMembership(req, res, recipe.familyId);
  if (!userId) return;
  const items = await generateShoppingListFromRecipe(recipe.familyId, recipe.id);
  res.status(201).json({ data: items });
});

// ---- Meals ----

mealRouter.get("/meals", async (req, res) => {
  const parsed = listMealsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const meals = await listMeals(parsed.data);
  res.json({ data: meals });
});

mealRouter.post("/meals", async (req, res) => {
  const parsed = createMealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const meal = await createMeal(userId, parsed.data);
  res.status(201).json({ data: meal });
});

mealRouter.patch("/meals/:id", async (req, res) => {
  const parsed = updateMealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getMeal(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Meal not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  const meal = await updateMeal(req.params.id, parsed.data);
  res.json({ data: meal });
});

mealRouter.delete("/meals/:id", async (req, res) => {
  const existing = await getMeal(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Meal not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  await deleteMeal(req.params.id);
  res.status(204).end();
});

// ---- Shopping List ----

mealRouter.get("/shopping-list", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const items = await listShoppingItems(parsed.data.familyId);
  res.json({ data: items });
});

mealRouter.post("/shopping-list", async (req, res) => {
  const parsed = createShoppingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const item = await createShoppingItem(parsed.data);
  res.status(201).json({ data: item });
});

mealRouter.patch("/shopping-list/:id", async (req, res) => {
  const parsed = updateShoppingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const updated = await updateShoppingItem(req.params.id, parsed.data);
  if (!updated) {
    res.status(404).json({ error: { code: "not_found", message: "Item not found" } });
    return;
  }
  res.json({ data: updated });
});

mealRouter.delete("/shopping-list/:id", async (req, res) => {
  await deleteShoppingItem(req.params.id);
  res.status(204).end();
});
