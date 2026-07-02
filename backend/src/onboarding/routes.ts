import type { Hono } from "hono";
import { HttpError } from "../auth/errors";
import type { AuthEnv } from "../auth/middleware";
import { requireSession } from "../auth/middleware";
import {
	DEFAULT_FREQUENCY_COMFORT,
	getAllowedProteinTypes,
	isProteinAllowedForDietType,
	isValidProteinId,
	PROTEIN_TYPES,
	type ActivityLevel,
	type DietType,
	type Goal,
	type Sex,
} from "./constants";
import { isValidDietType, isValidGoal, validateBodyStats } from "./validation";

interface UserRow {
	goal: string | null;
	diet_type: string | null;
	height: number | null;
	weight: number | null;
	age: number | null;
	activity_level: string | null;
	sex: string | null;
	onboarding_completed_at: string | null;
}

export function registerOnboardingRoutes(app: Hono<AuthEnv>): void {
	app.patch("/onboarding/goal", requireSession, async (c) => {
		const body = await c.req.json<{ goal?: string }>().catch(() => ({}) as { goal?: string });
		if (!isValidGoal(body.goal)) {
			throw new HttpError(400, "goal must be one of: lose_weight, build_muscle, eat_healthier");
		}

		await c.env.DB.prepare("UPDATE users SET goal = ? WHERE id = ?").bind(body.goal, c.get("user").id).run();
		return c.json({ success: true });
	});

	app.patch("/onboarding/diet-type", requireSession, async (c) => {
		const body = await c.req.json<{ dietType?: string }>().catch(() => ({}) as { dietType?: string });
		if (!isValidDietType(body.dietType)) {
			throw new HttpError(400, "dietType must be one of: vegetarian, eggetarian, non_veg, vegan");
		}

		await c.env.DB.prepare("UPDATE users SET diet_type = ? WHERE id = ?")
			.bind(body.dietType, c.get("user").id)
			.run();
		return c.json({ success: true });
	});

	app.patch("/onboarding/protein-preferences", requireSession, async (c) => {
		const body = await c.req.json<{ proteinIds?: string[] }>().catch(() => ({}) as { proteinIds?: string[] });
		if (!Array.isArray(body.proteinIds) || body.proteinIds.some((id) => typeof id !== "string")) {
			throw new HttpError(400, "proteinIds must be an array of strings");
		}

		const userId = c.get("user").id;
		const user = await c.env.DB.prepare("SELECT diet_type FROM users WHERE id = ?")
			.bind(userId)
			.first<{ diet_type: string | null }>();
		const dietType = user?.diet_type as DietType | null;
		if (!dietType) {
			throw new HttpError(400, "Set a diet type (Screen 2) before selecting protein preferences.");
		}

		for (const proteinId of body.proteinIds) {
			if (!isValidProteinId(proteinId)) {
				throw new HttpError(400, `Unknown protein: ${proteinId}`);
			}
			if (!isProteinAllowedForDietType(proteinId, dietType)) {
				throw new HttpError(400, `${proteinId} is not available for diet type ${dietType}`);
			}
		}

		// Idempotent: replaces the onboarding-set ("default") preferences each time, so backing
		// out and reselecting never leaves stale or duplicate rows. Preferences a user has since
		// set explicitly (Phase 9) are untouched.
		const statements = [
			c.env.DB.prepare("DELETE FROM protein_preferences WHERE user_id = ? AND source = 'default'").bind(userId),
			...body.proteinIds.map((proteinId) =>
				c.env.DB.prepare(
					"INSERT INTO protein_preferences (user_id, protein_type, frequency_comfort, source) VALUES (?, ?, ?, 'default')",
				).bind(userId, proteinId, DEFAULT_FREQUENCY_COMFORT),
			),
		];
		await c.env.DB.batch(statements);

		return c.json({ success: true });
	});

	app.patch("/onboarding/body-stats", requireSession, async (c) => {
		const body = await c.req
			.json<{ height?: unknown; weight?: unknown; age?: unknown; activityLevel?: unknown; sex?: unknown }>()
			.catch(() => ({}) as Record<string, unknown>);

		const error = validateBodyStats(body);
		if (error) {
			throw new HttpError(400, error);
		}

		await c.env.DB.prepare(
			"UPDATE users SET height = ?, weight = ?, age = ?, activity_level = ?, sex = ? WHERE id = ?",
		)
			.bind(body.height, body.weight, body.age, body.activityLevel, body.sex, c.get("user").id)
			.run();
		return c.json({ success: true });
	});

	app.post("/onboarding/complete", requireSession, async (c) => {
		await c.env.DB.prepare("UPDATE users SET onboarding_completed_at = COALESCE(onboarding_completed_at, ?) WHERE id = ?")
			.bind(new Date().toISOString(), c.get("user").id)
			.run();
		return c.json({ success: true });
	});

	app.get("/onboarding/status", requireSession, async (c) => {
		const userId = c.get("user").id;

		const user = await c.env.DB.prepare(
			"SELECT goal, diet_type, height, weight, age, activity_level, sex, onboarding_completed_at FROM users WHERE id = ?",
		)
			.bind(userId)
			.first<UserRow>();

		if (!user) {
			throw new HttpError(401, "User not found");
		}

		const { results: proteinRows } = await c.env.DB.prepare(
			"SELECT protein_type FROM protein_preferences WHERE user_id = ?",
		)
			.bind(userId)
			.all<{ protein_type: string }>();

		const bodyStatsComplete =
			user.height !== null &&
			user.weight !== null &&
			user.age !== null &&
			user.activity_level !== null &&
			user.sex !== null;

		return c.json({
			goal: user.goal as Goal | null,
			dietType: user.diet_type as DietType | null,
			proteinPreferences: proteinRows.map((row) => row.protein_type),
			bodyStats: bodyStatsComplete
				? {
						height: user.height,
						weight: user.weight,
						age: user.age,
						activityLevel: user.activity_level as ActivityLevel,
						sex: user.sex as Sex,
					}
				: null,
			completed: user.onboarding_completed_at !== null,
		});
	});

	// Exposed so the frontend can build Screen 3's options without duplicating the diet-type
	// exclusion rules — the frontend still mirrors the same rules locally for instant UI filtering,
	// but can cross-check against this if it ever drifts.
	app.get("/onboarding/protein-types", (c) => {
		const dietType = c.req.query("dietType");
		if (dietType && !isValidDietType(dietType)) {
			throw new HttpError(400, "Invalid dietType query param");
		}

		const proteinTypes = dietType ? getAllowedProteinTypes(dietType as DietType) : PROTEIN_TYPES;
		return c.json({ proteinTypes });
	});
}
