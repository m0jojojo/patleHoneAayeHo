import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { calculateDishMacros, getDishByName } from "../../src/nutrition/dishes";
import { applyMigrations } from "../helpers/setup";

beforeEach(async () => {
	await applyMigrations(env.DB);
});

describe("getDishByName", () => {
	it("finds a seeded dish", async () => {
		const dish = await getDishByName(env.DB, "Dal (tadka)");
		expect(dish?.id).toBe("dal_tadka");
	});

	it("returns null for an unknown dish", async () => {
		const dish = await getDishByName(env.DB, "Pizza");
		expect(dish).toBeNull();
	});
});

describe("calculateDishMacros", () => {
	it("returns the seeded base macros for a fixed dish (no oil variance) at standard portion", async () => {
		const rice = await getDishByName(env.DB, "White rice (cooked)");
		const macros = calculateDishMacros(rice!);
		expect(macros).toEqual({ calories: 150, proteinG: 3, carbsG: 33, fatG: 0.3 });
	});

	it("is unaffected by oilLevel for a fixed dish", async () => {
		const egg = await getDishByName(env.DB, "Boiled egg");
		const low = calculateDishMacros(egg!, { oilLevel: "low" });
		const high = calculateDishMacros(egg!, { oilLevel: "high" });
		expect(low).toEqual(high);
	});

	it("scales protein, carbs, fat, and calories by the portion multiplier", async () => {
		const rice = await getDishByName(env.DB, "White rice (cooked)");
		const doublePortion = calculateDishMacros(rice!, { portionMultiplier: 2 });
		expect(doublePortion).toEqual({ calories: 300, proteinG: 6, carbsG: 66, fatG: 0.6 });
	});

	describe("dal (tadka) - the high-variance dish - at different oil assumptions", () => {
		it("low oil", async () => {
			const dal = await getDishByName(env.DB, "Dal (tadka)");
			expect(calculateDishMacros(dal!, { oilLevel: "low" })).toEqual({
				calories: 142.5,
				proteinG: 7,
				carbsG: 18,
				fatG: 4.5,
			});
		});

		it("medium oil (also the default when no oilLevel is given)", async () => {
			const dal = await getDishByName(env.DB, "Dal (tadka)");
			const explicit = calculateDishMacros(dal!, { oilLevel: "medium" });
			const defaulted = calculateDishMacros(dal!);
			expect(explicit).toEqual({ calories: 187.5, proteinG: 7, carbsG: 18, fatG: 9.5 });
			expect(defaulted).toEqual(explicit);
		});

		it("high oil", async () => {
			const dal = await getDishByName(env.DB, "Dal (tadka)");
			expect(calculateDishMacros(dal!, { oilLevel: "high" })).toEqual({
				calories: 255,
				proteinG: 7,
				carbsG: 18,
				fatG: 17,
			});
		});

		it("protein and carbs never change with oil level - only fat/calories do", async () => {
			const dal = await getDishByName(env.DB, "Dal (tadka)");
			const low = calculateDishMacros(dal!, { oilLevel: "low" });
			const high = calculateDishMacros(dal!, { oilLevel: "high" });
			expect(low.proteinG).toBe(high.proteinG);
			expect(low.carbsG).toBe(high.carbsG);
			expect(low.fatG).not.toBe(high.fatG);
			expect(low.calories).not.toBe(high.calories);
		});
	});
});
