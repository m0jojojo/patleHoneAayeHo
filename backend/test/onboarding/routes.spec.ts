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

async function getStatus(token: string) {
	const response = await authedFetch("/onboarding/status", token);
	return response.json<{
		goal: string | null;
		dietType: string | null;
		proteinPreferences: string[];
		bodyStats: { height: number; weight: number; age: number; activityLevel: string } | null;
		completed: boolean;
	}>();
}

describe("PATCH /onboarding/goal", () => {
	it("saves a valid goal", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/goal", token, { goal: "lose_weight" });
		expect(response.status).toBe(200);
		expect((await getStatus(token)).goal).toBe("lose_weight");
	});

	it("rejects an invalid goal", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/goal", token, { goal: "get_ripped" });
		expect(response.status).toBe(400);
	});

	it("rejects requests with no session", async () => {
		const response = await SELF.fetch("https://example.com/onboarding/goal", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ goal: "lose_weight" }),
		});
		expect(response.status).toBe(401);
	});
});

describe("PATCH /onboarding/diet-type", () => {
	it("saves a valid diet type", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/diet-type", token, { dietType: "vegetarian" });
		expect(response.status).toBe(200);
		expect((await getStatus(token)).dietType).toBe("vegetarian");
	});

	it("rejects an invalid diet type", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/diet-type", token, { dietType: "carnivore" });
		expect(response.status).toBe(400);
	});
});

describe("PATCH /onboarding/protein-preferences", () => {
	it("requires a diet type to already be set", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/protein-preferences", token, { proteinIds: ["dal_lentils"] });
		expect(response.status).toBe(400);
	});

	it("saves allowed proteins with source=default and the default frequency_comfort", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await patchJson("/onboarding/diet-type", token, { dietType: "vegetarian" });
		const response = await patchJson("/onboarding/protein-preferences", token, {
			proteinIds: ["paneer", "dal_lentils"],
		});
		expect(response.status).toBe(200);

		const { results } = await env.DB.prepare(
			"SELECT protein_type, source, frequency_comfort FROM protein_preferences WHERE user_id = (SELECT id FROM users WHERE phone_number = ?) ORDER BY protein_type",
		)
			.bind(PHONE)
			.all<{ protein_type: string; source: string; frequency_comfort: string }>();

		expect(results).toEqual([
			{ protein_type: "dal_lentils", source: "default", frequency_comfort: "few_times_a_week" },
			{ protein_type: "paneer", source: "default", frequency_comfort: "few_times_a_week" },
		]);
	});

	it("never allows a vegetarian to select chicken or fish, even via a direct API call", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await patchJson("/onboarding/diet-type", token, { dietType: "vegetarian" });

		const chickenResponse = await patchJson("/onboarding/protein-preferences", token, {
			proteinIds: ["chicken"],
		});
		expect(chickenResponse.status).toBe(400);

		const fishResponse = await patchJson("/onboarding/protein-preferences", token, { proteinIds: ["fish"] });
		expect(fishResponse.status).toBe(400);
	});

	it("is idempotent - reselecting replaces the previous default selections, no duplicates", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await patchJson("/onboarding/diet-type", token, { dietType: "vegetarian" });
		await patchJson("/onboarding/protein-preferences", token, { proteinIds: ["paneer", "eggs"] });
		await patchJson("/onboarding/protein-preferences", token, { proteinIds: ["paneer"] });

		const status = await getStatus(token);
		expect(status.proteinPreferences).toEqual(["paneer"]);
	});
});

describe("PATCH /onboarding/body-stats", () => {
	const validStats = { height: 170, weight: 65, age: 40, activityLevel: "moderate" };

	it("saves a realistic profile", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/body-stats", token, validStats);
		expect(response.status).toBe(200);
		expect((await getStatus(token)).bodyStats).toEqual(validStats);
	});

	it("rejects zero height", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/body-stats", token, { ...validStats, height: 0 });
		expect(response.status).toBe(400);
	});

	it("rejects negative weight", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/body-stats", token, { ...validStats, weight: -10 });
		expect(response.status).toBe(400);
	});

	it("rejects age over 120", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await patchJson("/onboarding/body-stats", token, { ...validStats, age: 121 });
		expect(response.status).toBe(400);
	});
});

describe("POST /onboarding/complete", () => {
	it("marks onboarding complete", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await authedFetch("/onboarding/complete", token, { method: "POST" });
		expect(response.status).toBe(200);
		expect((await getStatus(token)).completed).toBe(true);
	});

	it("is idempotent - completing twice keeps the original completion timestamp", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await authedFetch("/onboarding/complete", token, { method: "POST" });

		const firstRow = await env.DB.prepare(
			"SELECT onboarding_completed_at FROM users WHERE phone_number = ?",
		)
			.bind(PHONE)
			.first<{ onboarding_completed_at: string }>();

		await authedFetch("/onboarding/complete", token, { method: "POST" });

		const secondRow = await env.DB.prepare(
			"SELECT onboarding_completed_at FROM users WHERE phone_number = ?",
		)
			.bind(PHONE)
			.first<{ onboarding_completed_at: string }>();

		expect(secondRow?.onboarding_completed_at).toBe(firstRow?.onboarding_completed_at);
	});
});

describe("GET /onboarding/status - resume support", () => {
	it("reflects partial progress so a user who exits mid-onboarding can resume", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await patchJson("/onboarding/goal", token, { goal: "build_muscle" });
		await patchJson("/onboarding/diet-type", token, { dietType: "eggetarian" });

		const status = await getStatus(token);
		expect(status.goal).toBe("build_muscle");
		expect(status.dietType).toBe("eggetarian");
		expect(status.bodyStats).toBeNull();
		expect(status.completed).toBe(false);
	});

	it("re-submitting the same screen does not create duplicate user rows", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await patchJson("/onboarding/goal", token, { goal: "lose_weight" });
		await patchJson("/onboarding/goal", token, { goal: "eat_healthier" });

		const { results } = await env.DB.prepare("SELECT id FROM users WHERE phone_number = ?")
			.bind(PHONE)
			.all();
		expect(results).toHaveLength(1);
		expect((await getStatus(token)).goal).toBe("eat_healthier");
	});

	it("full onboarding flow end to end produces the expected final state", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await patchJson("/onboarding/goal", token, { goal: "eat_healthier" });
		await patchJson("/onboarding/diet-type", token, { dietType: "non_veg" });
		await patchJson("/onboarding/protein-preferences", token, { proteinIds: ["chicken", "fish", "eggs"] });
		await patchJson("/onboarding/body-stats", token, {
			height: 175,
			weight: 80,
			age: 45,
			activityLevel: "light",
		});
		await authedFetch("/onboarding/complete", token, { method: "POST" });

		const status = await getStatus(token);
		expect(status).toEqual({
			goal: "eat_healthier",
			dietType: "non_veg",
			proteinPreferences: expect.arrayContaining(["chicken", "fish", "eggs"]),
			bodyStats: { height: 175, weight: 80, age: 45, activityLevel: "light" },
			completed: true,
		});

		const { results: preferenceRows } = await env.DB.prepare(
			"SELECT source FROM protein_preferences WHERE user_id = (SELECT id FROM users WHERE phone_number = ?)",
		)
			.bind(PHONE)
			.all<{ source: string }>();
		expect(preferenceRows.every((row) => row.source === "default")).toBe(true);
	});
});
