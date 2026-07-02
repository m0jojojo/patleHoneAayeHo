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

function postJson(path: string, token: string, body: unknown) {
	return authedFetch(path, token, { method: "POST", body: JSON.stringify(body) });
}

describe("POST /meals/scan", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/meals/scan", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ imageBase64: "abc" }),
		});
		expect(response.status).toBe(401);
	});

	it("rejects a missing imageBase64", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/scan", token, {});
		expect(response.status).toBe(400);
	});

	it("returns scan results for an authenticated request (using the stub vision provider)", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/scan", token, { imageBase64: "fake-base64-image-data" });
		expect(response.status).toBe(200);

		const body = await response.json<{ visionFailed: boolean; dishes: unknown[] }>();
		expect(body.visionFailed).toBe(false);
		expect(body.dishes.length).toBeGreaterThan(0);
	});
});

describe("POST /meals/dish-macros", () => {
	it("returns macros for a known dish", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/dish-macros", token, {
			dishName: "Dal (tadka)",
			oilLevel: "high",
		});
		expect(response.status).toBe(200);
		const body = await response.json<{ macros: { calories: number; fatG: number } }>();
		expect(body.macros.fatG).toBe(17);
	});

	it("returns 404 for an unknown dish", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/dish-macros", token, { dishName: "Pizza" });
		expect(response.status).toBe(404);
	});

	it("rejects a missing dishName", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/dish-macros", token, {});
		expect(response.status).toBe(400);
	});
});

describe("POST /meals/log", () => {
	const validPayload = {
		dishLabels: ["Dal (tadka)", "Roti (whole wheat, plain)"],
		portionEstimate: { dishes: [{ label: "Dal (tadka)", portionMultiplier: 1 }] },
		macros: { calories: 300, proteinG: 15, carbsG: 40, fatG: 8 },
	};

	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/meals/log", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validPayload),
		});
		expect(response.status).toBe(401);
	});

	it("logs a meal and returns its id", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/log", token, validPayload);
		expect(response.status).toBe(200);
		const body = await response.json<{ id: string }>();
		expect(typeof body.id).toBe("string");

		const row = await env.DB.prepare("SELECT * FROM meals_logged WHERE id = ?").bind(body.id).first<{
			dish_labels: string;
			macros: string;
			source_image_ref: string | null;
		}>();
		expect(JSON.parse(row!.dish_labels)).toEqual(validPayload.dishLabels);
		expect(JSON.parse(row!.macros)).toEqual(validPayload.macros);
		expect(row!.source_image_ref).toBeNull();
	});

	it("rejects an empty dishLabels array", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/log", token, { ...validPayload, dishLabels: [] });
		expect(response.status).toBe(400);
	});

	it("rejects negative macros", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await postJson("/meals/log", token, {
			...validPayload,
			macros: { ...validPayload.macros, proteinG: -5 },
		});
		expect(response.status).toBe(400);
	});
});

describe("end to end: scan -> edit -> log saves the corrected value, not the original estimate", () => {
	it("saves the user's edited macros rather than the scan's original estimate", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);

		const scanResponse = await postJson("/meals/scan", token, { imageBase64: "fake-image" });
		const scanBody = await scanResponse.json<{
			dishes: { label: string; macros?: { calories: number; proteinG: number; carbsG: number; fatG: number } }[];
		}>();

		const confidentDish = scanBody.dishes.find((d) => d.macros)!;
		const originalMacros = confidentDish.macros!;

		// The user corrects the calorie estimate upward before confirming - a common real edit
		// (e.g. the portion was bigger than the vision estimate guessed).
		const correctedMacros = { ...originalMacros, calories: originalMacros.calories + 100 };
		expect(correctedMacros.calories).not.toBe(originalMacros.calories);

		const logResponse = await postJson("/meals/log", token, {
			dishLabels: [confidentDish.label],
			portionEstimate: { dishes: [{ label: confidentDish.label, portionMultiplier: 1 }] },
			macros: correctedMacros,
		});
		const { id } = await logResponse.json<{ id: string }>();

		const row = await env.DB.prepare("SELECT macros FROM meals_logged WHERE id = ?").bind(id).first<{
			macros: string;
		}>();
		const savedMacros = JSON.parse(row!.macros);

		expect(savedMacros.calories).toBe(correctedMacros.calories);
		expect(savedMacros.calories).not.toBe(originalMacros.calories);
	});
});
