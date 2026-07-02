import { BODY_STATS_RANGES } from './constants';

// Mirrors backend/src/onboarding/validation.ts's validateBodyStats so the form can show an
// error immediately, without waiting on a round trip — the backend re-validates independently.
export function validateBodyStats(input: {
  height: number;
  weight: number;
  age: number;
}): string | null {
  const { height, weight, age } = input;

  if (!Number.isFinite(height) || height < BODY_STATS_RANGES.heightCm.min || height > BODY_STATS_RANGES.heightCm.max) {
    return `Height must be between ${BODY_STATS_RANGES.heightCm.min} and ${BODY_STATS_RANGES.heightCm.max} cm.`;
  }

  if (!Number.isFinite(weight) || weight < BODY_STATS_RANGES.weightKg.min || weight > BODY_STATS_RANGES.weightKg.max) {
    return `Weight must be between ${BODY_STATS_RANGES.weightKg.min} and ${BODY_STATS_RANGES.weightKg.max} kg.`;
  }

  if (!Number.isInteger(age) || age < BODY_STATS_RANGES.age.min || age > BODY_STATS_RANGES.age.max) {
    return `Age must be between ${BODY_STATS_RANGES.age.min} and ${BODY_STATS_RANGES.age.max}.`;
  }

  return null;
}
