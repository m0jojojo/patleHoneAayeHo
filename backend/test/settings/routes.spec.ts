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

async function onboardWithProteins(token: string, proteinIds: string[]) {
	await patchJson("/onboarding/goal", token, { goal: "lose_weight" });
	await patchJson("/onboarding/diet-type", token, { dietType: "vegetarian" });
	await patchJson("/onboarding/protein-preferences", token, { proteinIds });
}

describe("GET /settings/protein-preferences", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/settings/protein-preferences");
		expect(response.status).toBe(401);
	});

	it("returns the user's selected proteins with their current frequency_comfort and source", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await onboardWithProteins(token, ["paneer", "dal_lentils"]);

		const response = await authedFetch("/settings/protein-preferences", token);
		expect(response.status).toBe(200);
		const body = await response.json<{
			preferences: { proteinType: string; frequencyComfort: string; source: string }[];
		}>();

		expect(body.preferences).toEqual([
			expect.objectContaining({ proteinType: "paneer", frequencyComfort: "few_times_a_week", source: "default" }),
			expect.objectContaining({
				proteinType: "dal_lentils",
				frequencyComfort: "few_times_a_week",
				source: "default",
			}),
		]);
	});
});

describe("PATCH /settings/protein-frequency", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/settings/protein-frequency", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ proteinType: "paneer", frequencyComfort: "daily" }),
		});
		expect(response.status).toBe(401);
	});

	it("rejects an invalid frequencyComfort", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await onboardWithProteins(token, ["paneer"]);

		const response = await patchJson("/settings/protein-frequency", token, {
			proteinType: "paneer",
			frequencyComfort: "constantly",
		});
		expect(response.status).toBe(400);
	});

	it("rejects a protein the user never selected", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await onboardWithProteins(token, ["paneer"]);

		const response = await patchJson("/settings/protein-frequency", token, {
			proteinType: "dal_lentils",
			frequencyComfort: "daily",
		});
		expect(response.status).toBe(404);
	});

	it("updates frequency_comfort and marks the preference explicit", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await onboardWithProteins(token, ["paneer"]);

		const response = await patchJson("/settings/protein-frequency", token, {
			proteinType: "paneer",
			frequencyComfort: "daily",
		});
		expect(response.status).toBe(200);

		const status = await authedFetch("/settings/protein-preferences", token);
		const body = await status.json<{ preferences: { frequencyComfort: string; source: string }[] }>();
		expect(body.preferences[0]).toEqual(
			expect.objectContaining({ frequencyComfort: "daily", source: "explicit" }),
		);
	});
});
