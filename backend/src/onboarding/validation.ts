import { ACTIVITY_LEVELS, BODY_STATS_RANGES, type ActivityLevel, DIET_TYPES, type DietType, GOALS, type Goal } from "./constants";

export function isValidGoal(value: unknown): value is Goal {
	return typeof value === "string" && (GOALS as readonly string[]).includes(value);
}

export function isValidDietType(value: unknown): value is DietType {
	return typeof value === "string" && (DIET_TYPES as readonly string[]).includes(value);
}

export function isValidActivityLevel(value: unknown): value is ActivityLevel {
	return typeof value === "string" && (ACTIVITY_LEVELS as readonly string[]).includes(value);
}

export interface BodyStatsInput {
	height: number;
	weight: number;
	age: number;
	activityLevel: ActivityLevel;
}

// Returns the first validation problem found, or null if the input is realistic. Used both to
// reject nonsense input server-side and to drive the same messages client-side.
export function validateBodyStats(input: {
	height?: unknown;
	weight?: unknown;
	age?: unknown;
	activityLevel?: unknown;
}): string | null {
	const { height, weight, age, activityLevel } = input;

	if (typeof height !== "number" || !Number.isFinite(height)) return "Height must be a number.";
	if (height < BODY_STATS_RANGES.heightCm.min || height > BODY_STATS_RANGES.heightCm.max) {
		return `Height must be between ${BODY_STATS_RANGES.heightCm.min} and ${BODY_STATS_RANGES.heightCm.max} cm.`;
	}

	if (typeof weight !== "number" || !Number.isFinite(weight)) return "Weight must be a number.";
	if (weight < BODY_STATS_RANGES.weightKg.min || weight > BODY_STATS_RANGES.weightKg.max) {
		return `Weight must be between ${BODY_STATS_RANGES.weightKg.min} and ${BODY_STATS_RANGES.weightKg.max} kg.`;
	}

	if (typeof age !== "number" || !Number.isInteger(age)) return "Age must be a whole number.";
	if (age < BODY_STATS_RANGES.age.min || age > BODY_STATS_RANGES.age.max) {
		return `Age must be between ${BODY_STATS_RANGES.age.min} and ${BODY_STATS_RANGES.age.max}.`;
	}

	if (!isValidActivityLevel(activityLevel)) return "Invalid activity level.";

	return null;
}
