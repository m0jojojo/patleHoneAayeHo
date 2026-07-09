import { fireEvent, render } from '@testing-library/react-native';
import type { LoggedMealSummary } from '../meals/api';
import MealTypeSection from './MealTypeSection';

const meal: LoggedMealSummary = {
  id: 'meal-1',
  timestamp: '2026-07-08T08:30:00.000Z',
  dishLabels: ['Boiled egg'],
  macros: { calories: 156, proteinG: 13, carbsG: 1, fatG: 10 },
  mealType: 'breakfast',
};

describe('MealTypeSection', () => {
  it('shows the meal-type label and summed calories', () => {
    const { getByText } = render(
      <MealTypeSection mealType="breakfast" meals={[meal]} onDeleteMeal={jest.fn()} />,
    );
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('156 Cal')).toBeTruthy();
  });

  it('shows an empty state when there are no meals for this slot', () => {
    const { getByText } = render(<MealTypeSection mealType="dinner" meals={[]} onDeleteMeal={jest.fn()} />);
    expect(getByText('Nothing logged for dinner yet.')).toBeTruthy();
    expect(getByText('0 Cal')).toBeTruthy();
  });

  it('renders a MealLogCard per meal and sums multiple meals', () => {
    const secondMeal: LoggedMealSummary = {
      id: 'meal-2',
      timestamp: '2026-07-08T08:45:00.000Z',
      dishLabels: ['Fresh bananas'],
      macros: { calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4 },
      mealType: 'breakfast',
    };

    const { getByTestId, getByText } = render(
      <MealTypeSection mealType="breakfast" meals={[meal, secondMeal]} onDeleteMeal={jest.fn()} />,
    );
    expect(getByTestId('meal-type-section-row-meal-1')).toBeTruthy();
    expect(getByTestId('meal-type-section-row-meal-2')).toBeTruthy();
    expect(getByText('261 Cal')).toBeTruthy();
  });

  it('calls onDeleteMeal with the meal id when a row is deleted', () => {
    const onDeleteMeal = jest.fn();
    const { getAllByTestId } = render(
      <MealTypeSection mealType="breakfast" meals={[meal]} onDeleteMeal={onDeleteMeal} />,
    );
    fireEvent.press(getAllByTestId('meal-card-delete-button')[0]);
    expect(onDeleteMeal).toHaveBeenCalledWith('meal-1');
  });
});
