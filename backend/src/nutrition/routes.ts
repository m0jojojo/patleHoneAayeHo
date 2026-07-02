import type { Hono } from "hono";
import { HttpError } from "../auth/errors";
import type { AuthEnv } from "../auth/middleware";
import { requireSession } from "../auth/middleware";
import type { ActivityLevel, Goal, Sex } from "../onboarding/constants";
import { calculateDailyTargets } from "./daily-targets";
import { calculateTDEE } from "./tdee";

interface UserProfileRow {
	goal: string | null;
	height: number | null;
	weight: number | null;
	age: number | null;
	activity_level: string | null;
	sex: string | null;
}

export function registerNutritionRoutes(app: Hono<AuthEnv>): void {
	app.get("/nutrition/daily-targets", requireSession, async (c) => {
		const user = await c.env.DB.prepare(
			"SELECT goal, height, weight, age, activity_level, sex FROM users WHERE id = ?",
		)
			.bind(c.get("user").id)
			.first<UserProfileRow>();

		if (
			!user?.goal ||
			user.height === null ||
			user.weight === null ||
			user.age === null ||
			!user.activity_level ||
			!user.sex
		) {
			throw new HttpError(400, "Complete onboarding (body stats and goal) before requesting daily targets.");
		}

		const tdee = calculateTDEE({
			sex: user.sex as Sex,
			weightKg: user.weight,
			heightCm: user.height,
			age: user.age,
			activityLevel: user.activity_level as ActivityLevel,
		});

		const targets = calculateDailyTargets({ tdee, weightKg: user.weight, goal: user.goal as Goal });

		return c.json({ tdee, ...targets });
	});
}
