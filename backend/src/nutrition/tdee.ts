import type { ActivityLevel, Sex } from "../onboarding/constants";

export interface BodyProfile {
	sex: Sex;
	weightKg: number;
	heightCm: number;
	age: number;
	activityLevel: ActivityLevel;
}

// Standard activity multipliers used with Mifflin-St Jeor (Harris & Benedict's original
// categories, still the commonly used scale). See docs/nutrition-engine.md for why this table
// lines up with the app's 5-tier ACTIVITY_LEVELS.
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	very_active: 1.9,
};

// Mifflin-St Jeor — see docs/nutrition-engine.md for why this formula was chosen over
// Harris-Benedict. Requires sex because the formula has a different fixed constant per sex.
export function calculateBMR(profile: Pick<BodyProfile, "sex" | "weightKg" | "heightCm" | "age">): number {
	const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
	return profile.sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(profile: BodyProfile): number {
	return calculateBMR(profile) * ACTIVITY_MULTIPLIERS[profile.activityLevel];
}
