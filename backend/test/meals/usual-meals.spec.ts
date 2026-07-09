import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { logMeal } from "../../src/meals/log";
import { computeMealSignature, getUsualMeals } from "../../src/meals/usual-meals";
import { applyMigrations } from "../helpers/setup";

const MACROS = { calories: 300, proteinG: 15, carbsG: 40, fatG: 8 };

beforeEach(async () => {
	await applyMigrations(env.DB);
});

describe("computeMealSignature", () => {
	it("is order-independent - the same dishes in any order match", () => {
		expect(computeMealSignature(["Roti", "Dal (tadka)"])).toBe(computeMealSignature(["Dal (tadka)", "Roti"]));
	});

	it("is case-insensitive", () => {
		expect(computeMealSignature(["ROTI", "dal"])).toBe(computeMealSignature(["roti", "DAL"]));
	});

	it("treats a different set of dishes as a different signature", () => {
		expect(computeMealSignature(["Roti", "Dal (tadka)"])).not.toBe(computeMealSignature(["Roti", "Paneer curry"]));
	});

	it("treats dropping or adding a dish as a different signature", () => {
		expect(computeMealSignature(["Roti", "Dal (tadka)"])).not.toBe(computeMealSignature(["Roti"]));
	});
});

async function createUser(phone: string): Promise<string> {
	const id = crypto.randomUUID();
	await env.DB.prepare("INSERT INTO users (id, phone_number) VALUES (?, ?)").bind(id, phone).run();
	return id;
}

describe("logMeal - usual_meals tracking", () => {
	it("creates a new usual_meals row the first time a meal combination is logged", async () => {
		const userId = await createUser("+919876543210");

		await logMeal(env.DB, userId, { dishLabels: ["Roti", "Dal (tadka)"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });

		const usualMeals = await getUsualMeals(env.DB, userId);
		expect(usualMeals).toHaveLength(1);
		expect(usualMeals[0].frequency_count).toBe(1);
	});

	it("increments frequency_count rather than creating a duplicate row for a repeat meal", async () => {
		const userId = await createUser("+919876543210");

		await logMeal(env.DB, userId, { dishLabels: ["Roti", "Dal (tadka)"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });
		await logMeal(env.DB, userId, { dishLabels: ["Dal (tadka)", "Roti"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });

		const usualMeals = await getUsualMeals(env.DB, userId);
		expect(usualMeals).toHaveLength(1);
		expect(usualMeals[0].frequency_count).toBe(2);
	});

	it("creates a separate row for a genuinely new meal combination", async () => {
		const userId = await createUser("+919876543210");

		await logMeal(env.DB, userId, { dishLabels: ["Roti", "Dal (tadka)"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });
		await logMeal(env.DB, userId, {
			dishLabels: ["White rice (cooked)", "Chicken curry"],
			portionEstimate: {},
			macros: MACROS,
			mealType: "lunch",
		});

		const usualMeals = await getUsualMeals(env.DB, userId);
		expect(usualMeals).toHaveLength(2);
		expect(usualMeals.every((row) => row.frequency_count === 1)).toBe(true);
	});

	it("sorts usual meals by frequency_count descending", async () => {
		const userId = await createUser("+919876543210");

		await logMeal(env.DB, userId, { dishLabels: ["Roti"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });
		await logMeal(env.DB, userId, { dishLabels: ["Boiled egg"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });
		await logMeal(env.DB, userId, { dishLabels: ["Boiled egg"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });
		await logMeal(env.DB, userId, { dishLabels: ["Boiled egg"], portionEstimate: {}, macros: MACROS, mealType: "lunch" });

		const usualMeals = await getUsualMeals(env.DB, userId);
		expect(usualMeals[0].meal_signature).toBe(computeMealSignature(["Boiled egg"]));
		expect(usualMeals[0].frequency_count).toBe(3);
		expect(usualMeals[1].frequency_count).toBe(1);
	});
});
