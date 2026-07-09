import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteMeal, logMeal, validateLogMealInput } from "../../src/meals/log";
import { getUsualMeals } from "../../src/meals/usual-meals";
import { applyMigrations } from "../helpers/setup";

const MACROS = { calories: 300, proteinG: 15, carbsG: 40, fatG: 8 };

beforeEach(async () => {
	await applyMigrations(env.DB);
});

async function createUser(phone: string): Promise<string> {
	const id = crypto.randomUUID();
	await env.DB.prepare("INSERT INTO users (id, phone_number) VALUES (?, ?)").bind(id, phone).run();
	return id;
}

describe("deleteMeal", () => {
	it("deletes a meal that belongs to the user and returns true", async () => {
		const userId = await createUser("+919876543210");
		const { id } = await logMeal(env.DB, userId, {
			dishLabels: ["Roti"],
			portionEstimate: {},
			macros: MACROS,
			mealType: "lunch",
		});

		const deleted = await deleteMeal(env.DB, userId, id);

		expect(deleted).toBe(true);
		const row = await env.DB.prepare("SELECT id FROM meals_logged WHERE id = ?").bind(id).first();
		expect(row).toBeNull();
	});

	it("returns false for a meal id that doesn't exist", async () => {
		const userId = await createUser("+919876543210");

		const deleted = await deleteMeal(env.DB, userId, crypto.randomUUID());

		expect(deleted).toBe(false);
	});

	it("does not delete (and returns false for) a meal belonging to a different user", async () => {
		const ownerId = await createUser("+919876543210");
		const otherUserId = await createUser("+919876500000");
		const { id } = await logMeal(env.DB, ownerId, {
			dishLabels: ["Roti"],
			portionEstimate: {},
			macros: MACROS,
			mealType: "lunch",
		});

		const deleted = await deleteMeal(env.DB, otherUserId, id);

		expect(deleted).toBe(false);
		const row = await env.DB.prepare("SELECT id FROM meals_logged WHERE id = ?").bind(id).first();
		expect(row).not.toBeNull();
	});

	it("does not change usual_meals' frequency_count when a meal is deleted", async () => {
		const userId = await createUser("+919876543210");
		const { id } = await logMeal(env.DB, userId, {
			dishLabels: ["Roti"],
			portionEstimate: {},
			macros: MACROS,
			mealType: "lunch",
		});

		await deleteMeal(env.DB, userId, id);

		const usualMeals = await getUsualMeals(env.DB, userId);
		expect(usualMeals).toHaveLength(1);
		expect(usualMeals[0].frequency_count).toBe(1);
	});
});

describe("validateLogMealInput - mealType", () => {
	const validBase = { dishLabels: ["Roti"], portionEstimate: {}, macros: MACROS };

	it("rejects a missing mealType", () => {
		expect(validateLogMealInput(validBase)).toMatch(/mealType/);
	});

	it("rejects an invalid mealType", () => {
		expect(validateLogMealInput({ ...validBase, mealType: "brunch" })).toMatch(/mealType/);
	});

	it.each(["breakfast", "morning_snack", "lunch", "evening_snack", "dinner"])(
		"accepts a valid mealType: %s",
		(mealType) => {
			expect(validateLogMealInput({ ...validBase, mealType })).toBeNull();
		},
	);
});

describe("logMeal - mealType storage", () => {
	it("stores the given mealType on the meals_logged row", async () => {
		const userId = await createUser("+919876543210");
		const { id } = await logMeal(env.DB, userId, {
			dishLabels: ["Boiled egg"],
			portionEstimate: {},
			macros: MACROS,
			mealType: "morning_snack",
		});

		const row = await env.DB.prepare("SELECT meal_type FROM meals_logged WHERE id = ?").bind(id).first<{
			meal_type: string;
		}>();
		expect(row!.meal_type).toBe("morning_snack");
	});
});
