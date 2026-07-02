import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { calculateDailyTargets } from "../../src/nutrition/daily-targets";
import { calculateTDEE } from "../../src/nutrition/tdee";
import { getProteinGapRecommendation } from "../../src/recommendations/recommend";
import { applyMigrations } from "../helpers/setup";

const PROFILE = { sex: "male" as const, weightKg: 80, heightCm: 175, age: 35, activityLevel: "moderate" as const };
const GOAL = "lose_weight" as const;
const MORNING = new Date("2026-01-15T10:00:00.000Z"); // a Thursday

function proteinTarget(): number {
	const tdee = calculateTDEE(PROFILE);
	return calculateDailyTargets({ tdee, weightKg: PROFILE.weightKg, goal: GOAL }).proteinG;
}

let userCounter = 0;

async function createOnboardedUser(dietType: string): Promise<string> {
	const id = crypto.randomUUID();
	userCounter += 1;
	await env.DB.prepare(
		`INSERT INTO users (id, phone_number, goal, diet_type, height, weight, age, activity_level, sex, onboarding_completed_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			id,
			`+91900000${String(userCounter).padStart(4, "0")}`,
			GOAL,
			dietType,
			PROFILE.heightCm,
			PROFILE.weightKg,
			PROFILE.age,
			PROFILE.activityLevel,
			PROFILE.sex,
			MORNING.toISOString(),
		)
		.run();
	return id;
}

async function addPreference(userId: string, proteinType: string, source: "default" | "explicit" | "inferred") {
	await env.DB.prepare(
		"INSERT INTO protein_preferences (user_id, protein_type, frequency_comfort, source) VALUES (?, ?, 'few_times_a_week', ?)",
	)
		.bind(userId, proteinType, source)
		.run();
}

async function logMealDirectly(userId: string, dishLabels: string[], proteinG: number, at: Date = MORNING) {
	await env.DB.prepare(
		"INSERT INTO meals_logged (id, user_id, timestamp, dish_labels, portion_estimate, macros, source_image_ref) VALUES (?, ?, ?, ?, ?, ?, NULL)",
	)
		.bind(
			crypto.randomUUID(),
			userId,
			at.toISOString(),
			JSON.stringify(dishLabels),
			JSON.stringify({}),
			JSON.stringify({ calories: 200, proteinG, carbsG: 10, fatG: 5 }),
		)
		.run();

	// Mirrors what POST /meals/log does - upsert usual_meals for this combination.
	const signature = dishLabels
		.map((label) => label.trim().toLowerCase())
		.sort()
		.join("|");
	await env.DB.prepare(
		`INSERT INTO usual_meals (user_id, meal_signature, dish_labels, frequency_count, last_logged_at)
		 VALUES (?, ?, ?, 1, ?)
		 ON CONFLICT (user_id, meal_signature) DO UPDATE SET
		   frequency_count = frequency_count + 1,
		   last_logged_at = excluded.last_logged_at,
		   dish_labels = excluded.dish_labels`,
	)
		.bind(userId, signature, JSON.stringify(dishLabels), at.toISOString())
		.run();
}

beforeEach(async () => {
	await applyMigrations(env.DB);
	userCounter = 0;
});

describe("getProteinGapRecommendation - gap detection integration", () => {
	it("does not recommend when the user is exactly on-target", async () => {
		const userId = await createOnboardedUser("non_veg");
		await addPreference(userId, "eggs", "default");
		await logMealDirectly(userId, ["Boiled egg"], proteinTarget());

		expect(await getProteinGapRecommendation(env.DB, userId, MORNING)).toBeNull();
	});

	it("does not recommend when the user is over-target", async () => {
		const userId = await createOnboardedUser("non_veg");
		await addPreference(userId, "eggs", "default");
		await logMealDirectly(userId, ["Boiled egg"], proteinTarget() + 20);

		expect(await getProteinGapRecommendation(env.DB, userId, MORNING)).toBeNull();
	});

	it("does not recommend when the gap is under the 15g threshold", async () => {
		const userId = await createOnboardedUser("non_veg");
		await addPreference(userId, "eggs", "default");
		await logMealDirectly(userId, ["Boiled egg"], proteinTarget() - 10);

		expect(await getProteinGapRecommendation(env.DB, userId, MORNING)).toBeNull();
	});

	it("returns null before onboarding (diet type) is set", async () => {
		const id = crypto.randomUUID();
		await env.DB.prepare("INSERT INTO users (id, phone_number) VALUES (?, ?)").bind(id, "+919000000001").run();
		expect(await getProteinGapRecommendation(env.DB, id, MORNING)).toBeNull();
	});

	it("returns null when body stats are incomplete (daily targets unavailable)", async () => {
		const id = crypto.randomUUID();
		await env.DB.prepare("INSERT INTO users (id, phone_number, diet_type) VALUES (?, ?, 'vegetarian')")
			.bind(id, "+919000000002")
			.run();
		await addPreference(id, "paneer", "default");
		expect(await getProteinGapRecommendation(env.DB, id, MORNING)).toBeNull();
	});

	it("returns null when the user has no protein preferences at all", async () => {
		const userId = await createOnboardedUser("non_veg");
		expect(await getProteinGapRecommendation(env.DB, userId, MORNING)).toBeNull();
	});
});

describe("getProteinGapRecommendation - priority ranking (isolated fixtures)", () => {
	it("tier 3 (cold start): falls back to the first onboarding-selected protein with no history", async () => {
		const userId = await createOnboardedUser("vegetarian");
		await addPreference(userId, "paneer", "default");
		await addPreference(userId, "dal_lentils", "default");

		const recommendation = await getProteinGapRecommendation(env.DB, userId, MORNING);
		expect(recommendation?.source).toBe("default");
		expect(recommendation?.proteinType).toBe("paneer");
		expect(recommendation?.type).toBe("addition");
	});

	it("tier 2 (passive override): prefers the protein with strong, unambiguous logging history over an unlogged default", async () => {
		const userId = await createOnboardedUser("vegetarian");
		await addPreference(userId, "paneer", "default");
		await addPreference(userId, "dal_lentils", "default");
		// 5+ logs in the trailing 14 days, zero for the competing candidate - meets the passive
		// override threshold. Logged on earlier days so today's protein gap stays intact.
		for (let day = 1; day <= 5; day += 1) {
			await logMealDirectly(userId, ["Paneer curry"], 5, new Date(`2026-01-${10 + day}T10:00:00.000Z`));
		}

		const recommendation = await getProteinGapRecommendation(env.DB, userId, MORNING);
		expect(recommendation?.source).toBe("inferred");
		expect(recommendation?.proteinType).toBe("paneer");
		expect(recommendation?.message).toMatch(/often lately/i);
	});

	it("does not apply the passive override before the threshold is met (fewer than 5 logs)", async () => {
		const userId = await createOnboardedUser("vegetarian");
		await addPreference(userId, "paneer", "default");
		await addPreference(userId, "dal_lentils", "default");
		for (let day = 1; day <= 4; day += 1) {
			await logMealDirectly(userId, ["Paneer curry"], 5, new Date(`2026-01-${10 + day}T10:00:00.000Z`));
		}

		const recommendation = await getProteinGapRecommendation(env.DB, userId, MORNING);
		expect(recommendation?.source).toBe("default");
	});

	it("does not apply the passive override when a competing candidate also has logging history", async () => {
		const userId = await createOnboardedUser("vegetarian");
		await addPreference(userId, "paneer", "default");
		await addPreference(userId, "dal_lentils", "default");
		for (let day = 1; day <= 5; day += 1) {
			await logMealDirectly(userId, ["Paneer curry"], 5, new Date(`2026-01-${10 + day}T10:00:00.000Z`));
		}
		// Even a single log for the competing candidate breaks the "zero for competing" rule.
		await logMealDirectly(userId, ["Dal (tadka)"], 5, new Date("2026-01-05T10:00:00.000Z"));

		const recommendation = await getProteinGapRecommendation(env.DB, userId, MORNING);
		expect(recommendation?.source).toBe("default");
	});

	it("tier 1 (explicit) beats passive override - an explicit preference wins even when a different protein has strong logging history", async () => {
		const userId = await createOnboardedUser("vegetarian");
		await addPreference(userId, "paneer", "default");
		await addPreference(userId, "dal_lentils", "explicit");
		for (let day = 1; day <= 5; day += 1) {
			await logMealDirectly(userId, ["Paneer curry"], 5, new Date(`2026-01-${10 + day}T10:00:00.000Z`));
		}

		const recommendation = await getProteinGapRecommendation(env.DB, userId, MORNING);
		expect(recommendation?.source).toBe("explicit");
		expect(recommendation?.proteinType).toBe("dal_lentils");
	});

	it("recommendation type is always 'addition', never 'swap', across all three tiers", async () => {
		const coldStart = await createOnboardedUser("vegan");
		await addPreference(coldStart, "tofu_soy", "default");
		expect((await getProteinGapRecommendation(env.DB, coldStart, MORNING))?.type).toBe("addition");

		const inferredUser = await createOnboardedUser("vegan");
		await addPreference(inferredUser, "dal_lentils", "default");
		for (let day = 1; day <= 5; day += 1) {
			await logMealDirectly(inferredUser, ["Dal (tadka)"], 5, new Date(`2026-01-${10 + day}T10:00:00.000Z`));
		}
		const inferredRecommendation = await getProteinGapRecommendation(env.DB, inferredUser, MORNING);
		expect(inferredRecommendation?.source).toBe("inferred");
		expect(inferredRecommendation?.type).toBe("addition");

		const explicitUser = await createOnboardedUser("vegan");
		await addPreference(explicitUser, "tofu_soy", "explicit");
		expect((await getProteinGapRecommendation(env.DB, explicitUser, MORNING))?.type).toBe("addition");
	});
});

describe("getProteinGapRecommendation - diet-type filtering holds end to end (regression, not just onboarding)", () => {
	it("never recommends chicken or fish to a vegetarian, even if a stale/invalid preference row exists", async () => {
		const userId = await createOnboardedUser("vegetarian");
		// Simulates a corrupted or pre-validation-fix row bypassing onboarding's own filtering -
		// defense in depth must catch this even if it can no longer happen via the API.
		await addPreference(userId, "chicken", "default");
		await addPreference(userId, "paneer", "default");

		const recommendation = await getProteinGapRecommendation(env.DB, userId, MORNING);
		expect(recommendation?.proteinType).not.toBe("chicken");
		expect(recommendation?.proteinType).toBe("paneer");
	});

	it("returns null for a vegetarian whose only preference row is an invalid chicken/fish entry", async () => {
		const userId = await createOnboardedUser("vegetarian");
		await addPreference(userId, "chicken", "default");

		expect(await getProteinGapRecommendation(env.DB, userId, MORNING)).toBeNull();
	});
});
