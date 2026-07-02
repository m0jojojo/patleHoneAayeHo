// Mirrored in frontend/src/onboarding/constants.ts (no shared package between the two apps yet).
// Keep both in sync — see docs/onboarding.md for the product-level description of these values.

export const GOALS = ["lose_weight", "build_muscle", "eat_healthier"] as const;
export type Goal = (typeof GOALS)[number];

export const DIET_TYPES = ["vegetarian", "eggetarian", "non_veg", "vegan"] as const;
export type DietType = (typeof DIET_TYPES)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

// Needed for the Mifflin-St Jeor BMR calculation (Phase 5), which uses a different constant for
// each sex. Collected alongside the rest of the body stats on Screen 4.
export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export interface ProteinType {
	id: string;
	label: string;
}

export const PROTEIN_TYPES: ProteinType[] = [
	{ id: "chicken", label: "Chicken" },
	{ id: "fish", label: "Fish & Seafood" },
	{ id: "eggs", label: "Eggs" },
	{ id: "paneer", label: "Paneer" },
	{ id: "dairy", label: "Milk & Dairy" },
	{ id: "tofu_soy", label: "Tofu & Soy" },
	{ id: "dal_lentils", label: "Dal & Lentils" },
	{ id: "nuts_seeds", label: "Nuts & Seeds" },
	{ id: "mushroom", label: "Mushroom" },
];

const PROTEIN_IDS = new Set(PROTEIN_TYPES.map((p) => p.id));

// Every protein NOT in this diet type's exclusion list is allowed. This is the one rule in the
// whole app that must never be gotten wrong: a vegetarian must never be shown/recommended
// chicken or fish, full stop.
const EXCLUDED_BY_DIET_TYPE: Record<DietType, ReadonlySet<string>> = {
	non_veg: new Set(),
	eggetarian: new Set(["chicken", "fish"]),
	vegetarian: new Set(["chicken", "fish", "eggs"]),
	vegan: new Set(["chicken", "fish", "eggs", "paneer", "dairy"]),
};

export function isValidProteinId(proteinId: string): boolean {
	return PROTEIN_IDS.has(proteinId);
}

export function isProteinAllowedForDietType(proteinId: string, dietType: DietType): boolean {
	return !EXCLUDED_BY_DIET_TYPE[dietType].has(proteinId);
}

export function getAllowedProteinTypes(dietType: DietType): ProteinType[] {
	return PROTEIN_TYPES.filter((protein) => isProteinAllowedForDietType(protein.id, dietType));
}

// Applied to every protein selected during onboarding (Screen 3) — source is always "default"
// here; "explicit" only happens later when a user edits it themselves (Phase 9).
export const DEFAULT_FREQUENCY_COMFORT = "few_times_a_week";

export const BODY_STATS_RANGES = {
	heightCm: { min: 100, max: 250 },
	weightKg: { min: 30, max: 300 },
	age: { min: 13, max: 120 },
} as const;
