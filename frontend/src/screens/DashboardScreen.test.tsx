import { fireEvent, render } from '@testing-library/react-native';
import { getTodaySummary } from '../meals/api';
import DashboardScreen from './DashboardScreen';

jest.mock('../meals/api', () => ({
  getTodaySummary: jest.fn(),
}));

const mockGetTodaySummary = getTodaySummary as jest.Mock;

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockGetTodaySummary.mockReset();
  });

  it('shows consumed vs target macros and today\'s meals', async () => {
    mockGetTodaySummary.mockResolvedValueOnce({
      tdee: 2500,
      targets: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
      consumed: { calories: 500, proteinG: 30, carbsG: 60, fatG: 10 },
      remaining: { calories: 1500, proteinG: 130, carbsG: 140, fatG: 45 },
      meals: [
        { id: 'm1', timestamp: '2026-01-01T08:00:00.000Z', dishLabels: ['Dal (tadka)'], macros: { calories: 500, proteinG: 30, carbsG: 60, fatG: 10 } },
      ],
    });

    const { findByTestId, getByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} />);
    expect(await findByTestId('dashboard-screen')).toBeTruthy();

    expect(getByTestId('macro-value-Calories').props.children.join('')).toBe('500 / 2000');
    expect(getByTestId('macro-value-Protein (g)').props.children.join('')).toBe('30 / 160');
    expect(getByTestId('meal-row-m1')).toBeTruthy();
  });

  it('shows an empty state when no meals are logged yet', async () => {
    mockGetTodaySummary.mockResolvedValueOnce({
      tdee: 2500,
      targets: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
      consumed: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      remaining: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
      meals: [],
    });

    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} />);
    expect(await findByTestId('no-meals-text')).toBeTruthy();
  });

  it('shows an error state if loading fails', async () => {
    mockGetTodaySummary.mockRejectedValueOnce(new Error('network error'));
    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} />);
    expect(await findByTestId('dashboard-error')).toBeTruthy();
  });

  it('calls onScanMeal when the scan button is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce({
      tdee: 2500,
      targets: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
      consumed: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      remaining: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
      meals: [],
    });

    const onScanMeal = jest.fn();
    const { findByTestId, getByTestId } = render(<DashboardScreen onScanMeal={onScanMeal} />);
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('scan-meal-button'));
    expect(onScanMeal).toHaveBeenCalled();
  });
});
