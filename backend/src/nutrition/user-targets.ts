import { HttpError } from "../auth/errors";
import type { ActivityLevel, Goal, Sex } from "../onboarding/constants";
import { calculateDailyTargets, type DailyTargets } from "./daily-targets";
import { calculateTDEE } from "./tdee";

interface UserProfileRow {
	goal: string | null;
	height: number | null;
	weight: number | null;
	age: number | null;
	activity_level: string | null;
	sex: string | null;
}

// Shared by GET /nutrition/daily-targets and GET /meals/today - both need "this user's targets
// right now" and should 400 the same way if onboarding isn't complete.
export async function getUserDailyTargets(db: D1Database, userId: string): Promise<DailyTargets & { tdee: number }> {
	const user = await db
		.prepare("SELECT goal, height, weight, age, activity_level, sex FROM users WHERE id = ?")
		.bind(userId)
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

	return { tdee, ...targets };
}
