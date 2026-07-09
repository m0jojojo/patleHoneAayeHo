import { fireEvent, render } from '@testing-library/react-native';
import type { Macros } from '../meals/api';
import MacroSummaryCard from './MacroSummaryCard';

const consumed: Macros = { calories: 1200, proteinG: 80, carbsG: 150, fatG: 40 };
const targets: Macros = { calories: 2000, proteinG: 100, carbsG: 200, fatG: 60 };

describe('MacroSummaryCard', () => {
  it('shows the rounded consumed/target calories', () => {
    const { getByText } = render(<MacroSummaryCard consumed={consumed} targets={targets} onScanMeal={jest.fn()} />);
    expect(getByText('1200 ', { exact: false })).toBeTruthy();
    expect(getByText('/ 2000 Cal')).toBeTruthy();
  });

  it('shows a mini stat row for each of protein, carbs, and fat', () => {
    const { getByTestId } = render(<MacroSummaryCard consumed={consumed} targets={targets} onScanMeal={jest.fn()} />);
    expect(getByTestId('macro-stat-proteinG')).toBeTruthy();
    expect(getByTestId('macro-stat-carbsG')).toBeTruthy();
    expect(getByTestId('macro-stat-fatG')).toBeTruthy();
  });

  it('shows the rounded consumed value for each macro', () => {
    const { getByTestId } = render(<MacroSummaryCard consumed={consumed} targets={targets} onScanMeal={jest.fn()} />);
    expect(getByTestId('macro-value-Protein').props.children.join('')).toBe('80g');
    expect(getByTestId('macro-value-Carbs').props.children.join('')).toBe('150g');
    expect(getByTestId('macro-value-Fat').props.children.join('')).toBe('40g');
  });

  it('calls onScanMeal when the camera button is pressed', () => {
    const onScanMeal = jest.fn();
    const { getByTestId } = render(<MacroSummaryCard consumed={consumed} targets={targets} onScanMeal={onScanMeal} />);
    fireEvent.press(getByTestId('scan-meal-button'));
    expect(onScanMeal).toHaveBeenCalledTimes(1);
  });

  it('defaults the caption to "Eaten today"', () => {
    const { getByText } = render(<MacroSummaryCard consumed={consumed} targets={targets} onScanMeal={jest.fn()} />);
    expect(getByText('Eaten today')).toBeTruthy();
  });

  it('shows a custom dateLabel when given', () => {
    const { getByText } = render(
      <MacroSummaryCard consumed={consumed} targets={targets} onScanMeal={jest.fn()} dateLabel="Eaten on 5 Jul" />,
    );
    expect(getByText('Eaten on 5 Jul')).toBeTruthy();
  });
});
