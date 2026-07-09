import { guessMealType, MEAL_TYPE_LABELS, MEAL_TYPES } from './mealTypes';

describe('MEAL_TYPES / MEAL_TYPE_LABELS', () => {
  it('has a label for every meal type', () => {
    expect(Object.keys(MEAL_TYPE_LABELS).sort()).toEqual([...MEAL_TYPES].sort());
  });
});

describe('guessMealType', () => {
  it.each([
    ['06:00', 'breakfast'],
    ['09:59', 'breakfast'],
    ['10:00', 'morning_snack'],
    ['11:59', 'morning_snack'],
    ['12:00', 'lunch'],
    ['15:59', 'lunch'],
    ['16:00', 'evening_snack'],
    ['18:59', 'evening_snack'],
    ['19:00', 'dinner'],
    ['23:59', 'dinner'],
    ['00:00', 'dinner'],
    ['04:59', 'dinner'],
  ])('guesses %s as %s', (time, expected) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(2026, 0, 1, hours, minutes);
    expect(guessMealType(date)).toBe(expected);
  });
});
