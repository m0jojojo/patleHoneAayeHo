import type { Goal } from "../onboarding/constants";

export interface DailyTargets {
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
}

interface GoalProfile {
	// Added to TDEE to get the target calorie level for this goal.
	calorieAdjustment: number;
	// Protein is set relative to bodyweight (standard practice), not as a fixed % of calories,
	// so it stays sensible across very different calorie targets.
	proteinGPerKg: number;
	// Fat as a percentage of total target calories; carbs fill whatever's left.
	fatPercentOfCalories: number;
}

// See docs/nutrition-engine.md for the reasoning behind these specific numbers.
const GOAL_PROFILES: Record<Goal, GoalProfile> = {
	lose_weight: { calorieAdjustment: -500, proteinGPerKg: 2.0, fatPercentOfCalories: 0.25 },
	build_muscle: { calorieAdjustment: 300, proteinGPerKg: 2.2, fatPercentOfCalories: 0.25 },
	eat_healthier: { calorieAdjustment: 0, proteinGPerKg: 1.6, fatPercentOfCalories: 0.3 },
};

// A calorie floor no goal is allowed to drop below, regardless of how large a deficit the math
// would otherwise produce for a low-TDEE profile.
const MINIMUM_CALORIES = 1200;

const CALORIES_PER_G_PROTEIN = 4;
const CALORIES_PER_G_CARB = 4;
const CALORIES_PER_G_FAT = 9;

export function calculateDailyTargets(params: { tdee: number; weightKg: number; goal: Goal }): DailyTargets {
	const profile = GOAL_PROFILES[params.goal];

	const calories = Math.max(MINIMUM_CALORIES, params.tdee + profile.calorieAdjustment);
	const proteinG = profile.proteinGPerKg * params.weightKg;
	const fatG = (calories * profile.fatPercentOfCalories) / CALORIES_PER_G_FAT;

	const proteinCalories = proteinG * CALORIES_PER_G_PROTEIN;
	const fatCalories = fatG * CALORIES_PER_G_FAT;
	const carbsG = Math.max(0, (calories - proteinCalories - fatCalories) / CALORIES_PER_G_CARB);

	return { calories, proteinG, carbsG, fatG };
}
