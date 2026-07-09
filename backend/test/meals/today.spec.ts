import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { applyMigrations } from "../helpers/setup";
import { signUpAndGetToken } from "../helpers/signup";

const PHONE = "+919876543210";

beforeEach(async () => {
	await applyMigrations(env.DB);
});

function authedFetch(path: string, token: string, init: RequestInit = {}) {
	return SELF.fetch(`https://example.com${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...init.headers,
		},
	});
}

function patchJson(path: string, token: string, body: unknown) {
	return authedFetch(path, token, { method: "PATCH", body: JSON.stringify(body) });
}

function postJson(path: string, token: string, body: unknown) {
	return authedFetch(path, token, { method: "POST", body: JSON.stringify(body) });
}

async function completeOnboarding(token: string) {
	await patchJson("/onboarding/goal", token, { goal: "lose_weight" });
	await patchJson("/onboarding/diet-type", token, { dietType: "vegetarian" });
	await patchJson("/onboarding/protein-preferences", token, { proteinIds: ["paneer"] });
	await patchJson("/onboarding/body-stats", token, {
		height: 175,
		weight: 80,
		age: 35,
		activityLevel: "moderate",
		sex: "male",
	});
}

describe("GET /meals/today", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/meals/today");
		expect(response.status).toBe(401);
	});

	it("rejects a request before onboarding is complete", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await authedFetch("/meals/today", token);
		expect(response.status).toBe(400);
	});

	it("shows zero consumed and full remaining macros with no meals logged yet", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token);

		const response = await authedFetch("/meals/today", token);
		expect(response.status).toBe(200);
		const body = await response.json<{
			targets: { calories: number };
			consumed: { calories: number; proteinG: number; carbsG: number; fatG: number };
			remaining: { calories: number };
			meals: unknown[];
		}>();

		expect(body.consumed).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
		expect(body.remaining.calories).toBe(body.targets.calories);
		expect(body.meals).toEqual([]);
	});

	it("updates consumed and remaining correctly after logging a meal", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token);

		const macros = { calories: 300, proteinG: 15, carbsG: 40, fatG: 8 };
		await postJson("/meals/log", token, {
			dishLabels: ["Dal (tadka)"],
			portionEstimate: {},
			macros,
			mealType: "lunch",
		});

		const response = await authedFetch("/meals/today", token);
		const body = await response.json<{
			targets: { calories: number };
			consumed: typeof macros;
			remaining: { calories: number };
			meals: { dishLabels: string[]; macros: typeof macros; mealType: string }[];
		}>();

		expect(body.consumed).toEqual(macros);
		expect(body.remaining.calories).toBe(body.targets.calories - macros.calories);
		expect(body.meals).toHaveLength(1);
		expect(body.meals[0].dishLabels).toEqual(["Dal (tadka)"]);
		expect(body.meals[0].mealType).toBe("lunch");
	});

	it("sums macros across multiple meals logged today", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token);

		await postJson("/meals/log", token, {
			dishLabels: ["Dal (tadka)"],
			portionEstimate: {},
			macros: { calories: 200, proteinG: 10, carbsG: 20, fatG: 5 },
			mealType: "lunch",
		});
		await postJson("/meals/log", token, {
			dishLabels: ["Boiled egg"],
			portionEstimate: {},
			macros: { calories: 78, proteinG: 6.5, carbsG: 0.5, fatG: 5 },
			mealType: "morning_snack",
		});

		const response = await authedFetch("/meals/today", token);
		const body = await response.json<{ consumed: { calories: number }; meals: unknown[] }>();
		expect(body.consumed.calories).toBeCloseTo(278, 5);
		expect(body.meals).toHaveLength(2);
	});

	it("does not count a meal logged on a different day", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token);

		const user = await env.DB.prepare("SELECT id FROM users WHERE phone_number = ?").bind(PHONE).first<{
			id: string;
		}>();
		await env.DB.prepare(
			"INSERT INTO meals_logged (id, user_id, timestamp, dish_labels, portion_estimate, macros, source_image_ref) VALUES (?, ?, ?, ?, ?, ?, NULL)",
		)
			.bind(
				crypto.randomUUID(),
				user!.id,
				"2020-01-01T08:00:00.000Z",
				JSON.stringify(["Old meal"]),
				JSON.stringify({}),
				JSON.stringify({ calories: 999, proteinG: 99, carbsG: 99, fatG: 99 }),
			)
			.run();

		const response = await authedFetch("/meals/today", token);
		const body = await response.json<{ consumed: { calories: number }; meals: unknown[] }>();
		expect(body.consumed.calories).toBe(0);
		expect(body.meals).toEqual([]);
	});
});

describe("GET /meals/usual", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/meals/usual");
		expect(response.status).toBe(401);
	});

	it("returns usual meals sorted by frequency, with original-cased dish labels", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token);

		const macros = { calories: 100, proteinG: 5, carbsG: 10, fatG: 2 };
		await postJson("/meals/log", token, { dishLabels: ["Roti"], portionEstimate: {}, macros, mealType: "lunch" });
		await postJson("/meals/log", token, {
			dishLabels: ["Boiled Egg"],
			portionEstimate: {},
			macros,
			mealType: "morning_snack",
		});
		await postJson("/meals/log", token, {
			dishLabels: ["Boiled Egg"],
			portionEstimate: {},
			macros,
			mealType: "morning_snack",
		});

		const response = await authedFetch("/meals/usual", token);
		expect(response.status).toBe(200);
		const body = await response.json<{ usualMeals: { dishLabels: string[]; frequencyCount: number }[] }>();

		expect(body.usualMeals[0]).toEqual(
			expect.objectContaining({ dishLabels: ["Boiled Egg"], frequencyCount: 2 }),
		);
		expect(body.usualMeals[1]).toEqual(expect.objectContaining({ dishLabels: ["Roti"], frequencyCount: 1 }));
	});
});
