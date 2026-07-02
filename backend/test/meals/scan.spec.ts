import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { scanMeal } from "../../src/meals/scan";
import { applyMigrations } from "../helpers/setup";

beforeEach(async () => {
	await applyMigrations(env.DB);
});

describe("scanMeal", () => {
	it("returns matched macros for a single high-confidence dish", async () => {
		const result = await scanMeal(env.DB, "fake-image", {
			visionProvider: async () => ({
				dishes: [{ label: "White rice (cooked)", confidence: 0.95, portionMultiplier: 1 }],
			}),
		});

		expect(result.visionFailed).toBe(false);
		expect(result.dishes).toHaveLength(1);
		expect(result.dishes[0]).toMatchObject({
			label: "White rice (cooked)",
			matched: true,
			needsDisambiguation: false,
		});
		expect(result.dishes[0].macros).toEqual({ calories: 150, proteinG: 3, carbsG: 33, fatG: 0.3 });
	});

	it("returns all dishes for a multi-dish plate", async () => {
		const result = await scanMeal(env.DB, "fake-image", {
			visionProvider: async () => ({
				dishes: [
					{ label: "Roti (whole wheat, plain)", confidence: 0.9, portionMultiplier: 2 },
					{ label: "Paneer curry", confidence: 0.85, portionMultiplier: 1 },
					{ label: "White rice (cooked)", confidence: 0.88, portionMultiplier: 1 },
				],
			}),
		});

		expect(result.dishes).toHaveLength(3);
		expect(result.dishes.map((d) => d.label)).toEqual([
			"Roti (whole wheat, plain)",
			"Paneer curry",
			"White rice (cooked)",
		]);
		expect(result.dishes.every((d) => d.matched && !d.needsDisambiguation)).toBe(true);
	});

	it("asks for disambiguation instead of guessing when confidence is low for an oil-variable dish", async () => {
		const result = await scanMeal(env.DB, "fake-image", {
			visionProvider: async () => ({
				dishes: [{ label: "Dal (tadka)", confidence: 0.4, portionMultiplier: 1 }],
			}),
		});

		expect(result.dishes[0].needsDisambiguation).toBe(true);
		expect(result.dishes[0].disambiguationQuestion).toMatch(/ghee|oil/i);
		expect(result.dishes[0].macros).toBeUndefined();
	});

	it("does not ask for disambiguation on a low-confidence fixed dish - there's no oil to ask about", async () => {
		const result = await scanMeal(env.DB, "fake-image", {
			visionProvider: async () => ({
				dishes: [{ label: "Boiled egg", confidence: 0.3, portionMultiplier: 1 }],
			}),
		});

		expect(result.dishes[0].needsDisambiguation).toBe(false);
		expect(result.dishes[0].macros).toBeDefined();
	});

	it("does not ask for disambiguation when confidence is high, even for an oil-variable dish", async () => {
		const result = await scanMeal(env.DB, "fake-image", {
			visionProvider: async () => ({
				dishes: [{ label: "Chicken curry", confidence: 0.9, portionMultiplier: 1 }],
			}),
		});

		expect(result.dishes[0].needsDisambiguation).toBe(false);
		expect(result.dishes[0].macros).toBeDefined();
	});

	it("marks an unrecognized dish label as unmatched, without crashing", async () => {
		const result = await scanMeal(env.DB, "fake-image", {
			visionProvider: async () => ({
				dishes: [{ label: "Pizza", confidence: 0.9, portionMultiplier: 1 }],
			}),
		});

		expect(result.dishes[0]).toMatchObject({ label: "Pizza", matched: false, needsDisambiguation: false });
		expect(result.dishes[0].macros).toBeUndefined();
	});

	it("falls back gracefully (not a crash) when the vision provider throws", async () => {
		const result = await scanMeal(env.DB, "fake-image", {
			visionProvider: async () => {
				throw new Error("Gemini timed out");
			},
		});

		expect(result).toEqual({ visionFailed: true, dishes: [] });
	});

	it("uses the stub provider by default (no options passed)", async () => {
		const result = await scanMeal(env.DB, "fake-image");
		expect(result.visionFailed).toBe(false);
		expect(result.dishes.length).toBeGreaterThan(0);
	});
});
