// Mirrored from backend/src/onboarding/constants.ts (no shared package between the two apps
// yet). Keep both in sync — see docs/onboarding.md for the product-level description.

export const GOALS = ['lose_weight', 'build_muscle', 'eat_healthier'] as const;
export type Goal = (typeof GOALS)[number];

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: 'Lose weight',
  build_muscle: 'Build muscle',
  eat_healthier: 'Eat healthier',
};

export const DIET_TYPES = ['vegetarian', 'eggetarian', 'non_veg', 'vegan'] as const;
export type DietType = (typeof DIET_TYPES)[number];

export const DIET_TYPE_LABELS: Record<DietType, string> = {
  vegetarian: 'Vegetarian',
  eggetarian: 'Eggetarian',
  non_veg: 'Non-vegetarian',
  vegan: 'Vegan',
};

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little to no exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very active (physical job or 2x/day training)',
};

// Needed for the Mifflin-St Jeor BMR calculation (Phase 5), which uses a different constant for
// each sex.
export const SEXES = ['male', 'female'] as const;
export type Sex = (typeof SEXES)[number];

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Male',
  female: 'Female',
};

export interface ProteinType {
  id: string;
  label: string;
}

export const PROTEIN_TYPES: ProteinType[] = [
  { id: 'chicken', label: 'Chicken' },
  { id: 'fish', label: 'Fish & Seafood' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'paneer', label: 'Paneer' },
  { id: 'dairy', label: 'Milk & Dairy' },
  { id: 'tofu_soy', label: 'Tofu & Soy' },
  { id: 'dal_lentils', label: 'Dal & Lentils' },
  { id: 'nuts_seeds', label: 'Nuts & Seeds' },
  { id: 'mushroom', label: 'Mushroom' },
];

// Every protein NOT in this diet type's exclusion list is allowed. This is the one rule in the
// whole app that must never be gotten wrong: a vegetarian must never be shown/recommended
// chicken or fish, full stop. Mirrored exactly on the backend, which re-validates independently.
const EXCLUDED_BY_DIET_TYPE: Record<DietType, ReadonlySet<string>> = {
  non_veg: new Set(),
  eggetarian: new Set(['chicken', 'fish']),
  vegetarian: new Set(['chicken', 'fish', 'eggs']),
  vegan: new Set(['chicken', 'fish', 'eggs', 'paneer', 'dairy']),
};

export function isProteinAllowedForDietType(proteinId: string, dietType: DietType): boolean {
  return !EXCLUDED_BY_DIET_TYPE[dietType].has(proteinId);
}

export function getAllowedProteinTypes(dietType: DietType): ProteinType[] {
  return PROTEIN_TYPES.filter((protein) => isProteinAllowedForDietType(protein.id, dietType));
}

export const BODY_STATS_RANGES = {
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
  age: { min: 13, max: 120 },
} as const;
