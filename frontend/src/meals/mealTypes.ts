export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'evening_snack' | 'dinner';

export const MEAL_TYPES: MealType[] = ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner'];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning Snack',
  lunch: 'Lunch',
  evening_snack: 'Evening Snack',
  dinner: 'Dinner',
};

// A starting guess for the meal-type picker on the results screen - still fully editable before
// confirming, so getting this slightly wrong for an odd-hours meal costs nothing.
export function guessMealType(date: Date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 19 || hour < 5) return 'dinner';
  if (hour < 10) return 'breakfast';
  if (hour < 12) return 'morning_snack';
  if (hour < 16) return 'lunch';
  return 'evening_snack';
}
