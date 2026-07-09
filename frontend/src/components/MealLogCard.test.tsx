import { fireEvent, render } from '@testing-library/react-native';
import type { LoggedMealSummary } from '../meals/api';
import MealLogCard from './MealLogCard';

const meal: LoggedMealSummary = {
  id: 'meal-1',
  timestamp: '2026-07-08T08:30:00.000Z',
  dishLabels: ['White rice (cooked)', 'Dal (tadka)'],
  macros: { calories: 270, proteinG: 10, carbsG: 51, fatG: 2.3 },
};

describe('MealLogCard', () => {
  it('shows the rounded calorie total', () => {
    const { getByTestId } = render(<MealLogCard meal={meal} />);
    expect(getByTestId('meal-card-calories').props.children.join('')).toBe('270 kcal');
  });

  it('shows the comma-joined dish list', () => {
    const { getByText } = render(<MealLogCard meal={meal} />);
    expect(getByText('White rice (cooked), Dal (tadka)')).toBeTruthy();
  });

  it('shows a rounded per-macro breakdown row', () => {
    const { getByText } = render(<MealLogCard meal={meal} />);
    expect(getByText('P 10g')).toBeTruthy();
    expect(getByText('C 51g')).toBeTruthy();
    expect(getByText('F 2g')).toBeTruthy();
  });

  it('does not crash when the timestamp is invalid', () => {
    const badMeal: LoggedMealSummary = { ...meal, timestamp: 'not-a-date' };
    const { getByTestId } = render(<MealLogCard meal={badMeal} />);
    expect(getByTestId('meal-card-calories')).toBeTruthy();
  });

  it('does not render a delete button when onDelete is not given', () => {
    const { queryByTestId } = render(<MealLogCard meal={meal} />);
    expect(queryByTestId('meal-card-delete-button')).toBeNull();
  });

  it('calls onDelete when the delete button is pressed', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(<MealLogCard meal={meal} onDelete={onDelete} />);
    fireEvent.press(getByTestId('meal-card-delete-button'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
