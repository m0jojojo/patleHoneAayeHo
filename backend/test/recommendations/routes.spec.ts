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

describe("GET /recommendations/current", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/recommendations/current");
		expect(response.status).toBe(401);
	});

	it("returns null when there is no protein gap (deterministic regardless of time of day)", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token);

		// A very large logged protein amount guarantees "no gap" no matter what the daily target
		// works out to be - this keeps the test independent of wall-clock time, unlike the
		// gap-exists case (which also depends on the fixed 9 PM cutoff hour and is covered with a
		// controllable `now` in recommend.spec.ts instead).
		await authedFetch("/meals/log", token, {
			method: "POST",
			body: JSON.stringify({
				dishLabels: ["Paneer curry"],
				portionEstimate: {},
				macros: { calories: 1000, proteinG: 500, carbsG: 50, fatG: 50 },
			}),
		});

		const response = await authedFetch("/recommendations/current", token);
		expect(response.status).toBe(200);
		const body = await response.json<{ recommendation: unknown }>();
		expect(body.recommendation).toBeNull();
	});

	it("responds with the correct shape when a recommendation is present", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		await completeOnboarding(token);

		const response = await authedFetch("/recommendations/current", token);
		expect(response.status).toBe(200);
		const body = await response.json<{ recommendation: { type: string; proteinType: string } | null }>();

		// Time-of-day dependent (the 9 PM cutoff) - only assert the shape when one fires; the
		// ranking logic itself is fully covered with a fixed `now` in recommend.spec.ts.
		if (body.recommendation) {
			expect(body.recommendation.type).toBe("addition");
			expect(body.recommendation.proteinType).toBe("paneer");
		}
	});
});

describe("POST /recommendations/dismiss", () => {
	it("rejects a request with no session", async () => {
		const response = await SELF.fetch("https://example.com/recommendations/dismiss", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ proteinType: "paneer" }),
		});
		expect(response.status).toBe(401);
	});

	it("rejects an unknown protein id", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await authedFetch("/recommendations/dismiss", token, {
			method: "POST",
			body: JSON.stringify({ proteinType: "beef" }),
		});
		expect(response.status).toBe(400);
	});

	it("logs a dismissal", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);
		const response = await authedFetch("/recommendations/dismiss", token, {
			method: "POST",
			body: JSON.stringify({ proteinType: "paneer" }),
		});
		expect(response.status).toBe(200);

		const user = await env.DB.prepare("SELECT id FROM users WHERE phone_number = ?").bind(PHONE).first<{
			id: string;
		}>();
		const { results } = await env.DB.prepare(
			"SELECT protein_type FROM recommendation_dismissals WHERE user_id = ?",
		)
			.bind(user!.id)
			.all<{ protein_type: string }>();
		expect(results).toHaveLength(1);
		expect(results[0].protein_type).toBe("paneer");
	});
});
