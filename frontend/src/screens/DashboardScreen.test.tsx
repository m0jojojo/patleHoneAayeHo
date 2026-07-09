import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { deleteMeal, getTodaySummary } from '../meals/api';
import { dismissRecommendation, getCurrentRecommendation } from '../recommendations/api';
import DashboardScreen from './DashboardScreen';

jest.mock('../meals/api', () => ({
  getTodaySummary: jest.fn(),
  deleteMeal: jest.fn(),
}));

jest.mock('../recommendations/api', () => ({
  getCurrentRecommendation: jest.fn(),
  dismissRecommendation: jest.fn(),
}));

const mockGetTodaySummary = getTodaySummary as jest.Mock;
const mockGetCurrentRecommendation = getCurrentRecommendation as jest.Mock;
const mockDismissRecommendation = dismissRecommendation as jest.Mock;
const mockDeleteMeal = deleteMeal as jest.Mock;

// Alert.alert doesn't render anything RTL can query - capture the buttons it was called with and
// invoke the one under test directly, the same way a user tapping it would trigger onPress.
function pressAlertButton(label: string) {
  const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
  const buttons = alertCall?.[2] as { text: string; onPress?: () => void }[] | undefined;
  const button = buttons?.find((b) => b.text === label);
  button?.onPress?.();
}

const baseSummary = {
  tdee: 2500,
  targets: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
  consumed: { calories: 500, proteinG: 30, carbsG: 60, fatG: 10 },
  remaining: { calories: 1500, proteinG: 130, carbsG: 140, fatG: 45 },
  meals: [
    {
      id: 'm1',
      timestamp: '2026-01-01T08:00:00.000Z',
      dishLabels: ['Dal (tadka)'],
      macros: { calories: 500, proteinG: 30, carbsG: 60, fatG: 10 },
      mealType: 'lunch',
    },
  ],
};

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockGetTodaySummary.mockReset();
    mockGetCurrentRecommendation.mockReset();
    mockDismissRecommendation.mockReset();
    mockDeleteMeal.mockReset();
    mockGetCurrentRecommendation.mockResolvedValue({ recommendation: null });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows consumed vs target macros and today\'s meals', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const { findByTestId, getByTestId, getByText } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    expect(await findByTestId('dashboard-screen')).toBeTruthy();

    expect(getByText('/ 2000 Cal')).toBeTruthy();
    expect(getByTestId('macro-value-Protein').props.children.join('')).toBe('30g');
    expect(getByTestId('meal-row-m1')).toBeTruthy();
  });

  it('shows an empty state when no meals are logged yet', async () => {
    mockGetTodaySummary.mockResolvedValueOnce({ ...baseSummary, meals: [] });

    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />);
    expect(await findByTestId('no-meals-text')).toBeTruthy();
  });

  it('shows an error state if loading fails', async () => {
    mockGetTodaySummary.mockRejectedValueOnce(new Error('network error'));
    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />);
    expect(await findByTestId('dashboard-error')).toBeTruthy();
  });

  it('calls onScanMeal when the scan button is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const onScanMeal = jest.fn();
    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={onScanMeal} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('scan-meal-button'));
    expect(onScanMeal).toHaveBeenCalled();
  });

  it('calls onOpenSettings when the My Proteins link is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const onOpenSettings = jest.fn();
    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={onOpenSettings} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('open-settings-button'));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('does not show a recommendation card when there is no recommendation', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockGetCurrentRecommendation.mockResolvedValueOnce({ recommendation: null });

    const { findByTestId, queryByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('dashboard-screen');

    expect(queryByTestId('recommendation-card')).toBeNull();
  });

  it('shows the recommendation inline, phrased as an addition', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockGetCurrentRecommendation.mockResolvedValueOnce({
      recommendation: {
        type: 'addition',
        proteinType: 'eggs',
        proteinLabel: 'Eggs',
        source: 'inferred',
        message: 'Add some eggs — you\'ve been eating it often lately.',
        remainingProteinG: 20,
      },
    });

    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />);
    const card = await findByTestId('recommendation-card');
    expect(card).toBeTruthy();
  });

  it('dismisses the recommendation and hides the card', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockGetCurrentRecommendation.mockResolvedValueOnce({
      recommendation: {
        type: 'addition',
        proteinType: 'eggs',
        proteinLabel: 'Eggs',
        source: 'default',
        message: 'Add some eggs to help hit your protein target today.',
        remainingProteinG: 20,
      },
    });
    mockDismissRecommendation.mockResolvedValueOnce({ success: true, suggestFrequencyPrompt: false });

    const { findByTestId, getByTestId, queryByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('recommendation-card');

    fireEvent.press(getByTestId('dismiss-recommendation-button'));

    await waitFor(() => expect(mockDismissRecommendation).toHaveBeenCalledWith('eggs'));
    await waitFor(() => expect(queryByTestId('recommendation-card')).toBeNull());
  });

  it('shows a repeated-dismissal prompt when the backend suggests one', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockGetCurrentRecommendation.mockResolvedValueOnce({
      recommendation: {
        type: 'addition',
        proteinType: 'eggs',
        proteinLabel: 'Eggs',
        source: 'default',
        message: 'Add some eggs to help hit your protein target today.',
        remainingProteinG: 20,
      },
    });
    mockDismissRecommendation.mockResolvedValueOnce({ success: true, suggestFrequencyPrompt: true });

    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('recommendation-card');

    fireEvent.press(getByTestId('dismiss-recommendation-button'));

    expect(await findByTestId('frequency-prompt')).toBeTruthy();
  });

  it('opens settings and clears the prompt when "Adjust" is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockGetCurrentRecommendation.mockResolvedValueOnce({
      recommendation: {
        type: 'addition',
        proteinType: 'eggs',
        proteinLabel: 'Eggs',
        source: 'default',
        message: 'Add some eggs to help hit your protein target today.',
        remainingProteinG: 20,
      },
    });
    mockDismissRecommendation.mockResolvedValueOnce({ success: true, suggestFrequencyPrompt: true });

    const onOpenSettings = jest.fn();
    const { findByTestId, getByTestId, queryByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={onOpenSettings} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('recommendation-card');
    fireEvent.press(getByTestId('dismiss-recommendation-button'));
    await findByTestId('frequency-prompt');

    fireEvent.press(getByTestId('adjust-frequency-button'));

    expect(onOpenSettings).toHaveBeenCalled();
    expect(queryByTestId('frequency-prompt')).toBeNull();
  });

  it('calls onOpenTodayDetail when the "Logged today" section is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const onOpenTodayDetail = jest.fn();
    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={onOpenTodayDetail} />,
    );
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('open-today-detail-button'));
    expect(onOpenTodayDetail).toHaveBeenCalled();
  });

  it('asks for confirmation before deleting a meal, and does nothing if cancelled', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('meal-row-m1');

    fireEvent.press(getByTestId('meal-card-delete-button'));
    expect(Alert.alert).toHaveBeenCalled();

    pressAlertButton('Cancel');
    expect(mockDeleteMeal).not.toHaveBeenCalled();
    expect(getByTestId('meal-row-m1')).toBeTruthy();
  });

  it('deletes the meal and refreshes the summary when confirmed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockDeleteMeal.mockResolvedValueOnce({ success: true });
    mockGetTodaySummary.mockResolvedValueOnce({ ...baseSummary, meals: [], consumed: baseSummary.remaining });

    const { findByTestId, getByTestId, queryByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('meal-row-m1');

    fireEvent.press(getByTestId('meal-card-delete-button'));
    pressAlertButton('Delete');

    await waitFor(() => expect(mockDeleteMeal).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(queryByTestId('meal-row-m1')).toBeNull());
    expect(await findByTestId('no-meals-text')).toBeTruthy();
  });

  it('shows an error alert if deleting fails, and keeps the meal', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockDeleteMeal.mockRejectedValueOnce(new Error('network error'));

    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} onOpenTodayDetail={jest.fn()} />,
    );
    await findByTestId('meal-row-m1');

    fireEvent.press(getByTestId('meal-card-delete-button'));
    pressAlertButton('Delete');

    await waitFor(() => expect(mockDeleteMeal).toHaveBeenCalled());
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(2));
    expect(getByTestId('meal-row-m1')).toBeTruthy();
  });
});
