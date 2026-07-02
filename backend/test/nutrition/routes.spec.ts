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

async function completeOnboarding(
	token: string,
	overrides: { goal?: string; bodyStats?: Record<string, unknown> } = {},
) {
	await patchJson("/onboarding/goal", token, { goal: overrides.goal ?? "lose_weight" });
	await patchJson("/onboarding/diet-type", token, { dietType: "vegetarian" });
	await patchJson("/onboarding/protein-preferences", token, { proteinIds: ["paneer"] });
	await patchJson("/onboarding/body-stats", token, {
		height: 175,
		weight: 80,
		age: 35,
		activityLevel: "moderate",
		sex: "male",
		...overrides.bodyStats,
	});
}

describe("GET /nutrition/daily-targets", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/nutrition/daily-targets");
		expect(response.status).toBe(401);
	});

	it("rejects a request before onboarding (body stats + goal) is complete", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await authedFetch("/nutrition/daily-targets", token);
		expect(response.status).toBe(400);
	});

	it("returns TDEE and daily targets matching the hand-calculated formula once onboarding is complete", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token, { goal: "lose_weight" });

		const response = await authedFetch("/nutrition/daily-targets", token);
		expect(response.status).toBe(200);

		const body = await response.json<{ tdee: number; calories: number; proteinG: number; carbsG: number; fatG: number }>();

		// male, 80kg, 175cm, 35yo, moderate: BMR = 10*80+6.25*175-5*35+5 = 800+1093.75-175+5 = 1723.75
		// TDEE = 1723.75 * 1.55 = 2671.8125
		expect(body.tdee).toBeCloseTo(2671.8125, 3);
		// lose_weight: calories = TDEE - 500, protein = 2.0 g/kg
		expect(body.calories).toBeCloseTo(2171.8125, 3);
		expect(body.proteinG).toBeCloseTo(160, 5);
	});

	it("gives build_muscle a higher protein target than lose_weight for the same profile", async () => {
		const loseWeightToken = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(loseWeightToken, { goal: "lose_weight" });
		const loseWeightBody = await (await authedFetch("/nutrition/daily-targets", loseWeightToken)).json<{
			proteinG: number;
		}>();

		const buildMuscleToken = await signUpAndGetToken(env.DB, "+919876500000");
		await completeOnboarding(buildMuscleToken, { goal: "build_muscle" });
		const buildMuscleBody = await (await authedFetch("/nutrition/daily-targets", buildMuscleToken)).json<{
			proteinG: number;
		}>();

		expect(buildMuscleBody.proteinG).toBeGreaterThan(loseWeightBody.proteinG);
	});
});
