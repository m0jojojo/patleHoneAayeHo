import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { todayDateString } from '../dateUtils';
import { deleteMeal, getTodaySummary } from '../meals/api';
import TodayDetailScreen from './TodayDetailScreen';

jest.mock('../meals/api', () => ({
  getTodaySummary: jest.fn(),
  deleteMeal: jest.fn(),
}));

const mockGetTodaySummary = getTodaySummary as jest.Mock;
const mockDeleteMeal = deleteMeal as jest.Mock;

function pressAlertButton(label: string) {
  const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
  const buttons = alertCall?.[2] as { text: string; onPress?: () => void }[] | undefined;
  const button = buttons?.find((b) => b.text === label);
  button?.onPress?.();
}

const baseSummary = {
  tdee: 2500,
  targets: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
  consumed: { calories: 156, proteinG: 13, carbsG: 1, fatG: 10 },
  remaining: { calories: 1844, proteinG: 147, carbsG: 199, fatG: 45 },
  meals: [
    {
      id: 'm1',
      timestamp: '2026-01-01T08:00:00.000Z',
      dishLabels: ['Boiled egg'],
      macros: { calories: 156, proteinG: 13, carbsG: 1, fatG: 10 },
      mealType: 'breakfast',
    },
  ],
};

describe('TodayDetailScreen', () => {
  beforeEach(() => {
    mockGetTodaySummary.mockReset();
    mockDeleteMeal.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a loading indicator, then all five meal-type sections', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const { findByTestId, getByTestId } = render(<TodayDetailScreen onBack={jest.fn()} />);
    expect(await findByTestId('meal-type-section-breakfast')).toBeTruthy();
    expect(getByTestId('meal-type-section-morning_snack')).toBeTruthy();
    expect(getByTestId('meal-type-section-lunch')).toBeTruthy();
    expect(getByTestId('meal-type-section-evening_snack')).toBeTruthy();
    expect(getByTestId('meal-type-section-dinner')).toBeTruthy();
  });

  it('puts the logged meal in the correct meal-type section', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const { findByTestId, getByTestId } = render(<TodayDetailScreen onBack={jest.fn()} />);
    await findByTestId('meal-type-section-breakfast');

    expect(getByTestId('meal-type-section-row-m1')).toBeTruthy();
  });

  it('shows an error state if loading fails', async () => {
    mockGetTodaySummary.mockRejectedValueOnce(new Error('network error'));
    const { findByTestId } = render(<TodayDetailScreen onBack={jest.fn()} />);
    expect(await findByTestId('today-detail-error')).toBeTruthy();
  });

  it('calls onBack when the back button is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    const onBack = jest.fn();

    const { findByTestId, getByTestId } = render(<TodayDetailScreen onBack={onBack} />);
    await findByTestId('meal-type-section-breakfast');

    fireEvent.press(getByTestId('today-detail-back-button'));
    expect(onBack).toHaveBeenCalled();
  });

  it('deletes a meal and refreshes when confirmed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockDeleteMeal.mockResolvedValueOnce({ success: true });
    mockGetTodaySummary.mockResolvedValueOnce({ ...baseSummary, meals: [] });

    const { findByTestId, getByTestId, queryByTestId } = render(<TodayDetailScreen onBack={jest.fn()} />);
    await findByTestId('meal-type-section-row-m1');

    fireEvent.press(getByTestId('meal-card-delete-button'));
    pressAlertButton('Delete');

    await waitFor(() => expect(mockDeleteMeal).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(queryByTestId('meal-type-section-row-m1')).toBeNull());
  });

  it('defaults to loading real today when no date prop is given', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    const { findByTestId, findByText } = render(<TodayDetailScreen onBack={jest.fn()} />);
    await findByTestId('meal-type-section-breakfast');

    expect(mockGetTodaySummary).toHaveBeenCalledWith(todayDateString());
    expect(await findByText('Today')).toBeTruthy();
  });

  it('loads and labels a past date when one is given', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    const { findByTestId, findByText } = render(<TodayDetailScreen date="2026-07-05" onBack={jest.fn()} />);
    await findByTestId('meal-type-section-breakfast');

    expect(mockGetTodaySummary).toHaveBeenCalledWith('2026-07-05');
    expect(await findByText('5 Jul')).toBeTruthy();
  });
});
