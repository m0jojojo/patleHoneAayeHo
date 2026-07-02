import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getTodaySummary } from '../meals/api';
import { dismissRecommendation, getCurrentRecommendation } from '../recommendations/api';
import DashboardScreen from './DashboardScreen';

jest.mock('../meals/api', () => ({
  getTodaySummary: jest.fn(),
}));

jest.mock('../recommendations/api', () => ({
  getCurrentRecommendation: jest.fn(),
  dismissRecommendation: jest.fn(),
}));

const mockGetTodaySummary = getTodaySummary as jest.Mock;
const mockGetCurrentRecommendation = getCurrentRecommendation as jest.Mock;
const mockDismissRecommendation = dismissRecommendation as jest.Mock;

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
    },
  ],
};

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockGetTodaySummary.mockReset();
    mockGetCurrentRecommendation.mockReset();
    mockDismissRecommendation.mockReset();
    mockGetCurrentRecommendation.mockResolvedValue({ recommendation: null });
  });

  it('shows consumed vs target macros and today\'s meals', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} />,
    );
    expect(await findByTestId('dashboard-screen')).toBeTruthy();

    expect(getByTestId('macro-value-Calories').props.children.join('')).toBe('500 / 2000');
    expect(getByTestId('macro-value-Protein (g)').props.children.join('')).toBe('30 / 160');
    expect(getByTestId('meal-row-m1')).toBeTruthy();
  });

  it('shows an empty state when no meals are logged yet', async () => {
    mockGetTodaySummary.mockResolvedValueOnce({ ...baseSummary, meals: [] });

    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} />);
    expect(await findByTestId('no-meals-text')).toBeTruthy();
  });

  it('shows an error state if loading fails', async () => {
    mockGetTodaySummary.mockRejectedValueOnce(new Error('network error'));
    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} />);
    expect(await findByTestId('dashboard-error')).toBeTruthy();
  });

  it('calls onScanMeal when the scan button is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const onScanMeal = jest.fn();
    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={onScanMeal} onOpenSettings={jest.fn()} />,
    );
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('scan-meal-button'));
    expect(onScanMeal).toHaveBeenCalled();
  });

  it('calls onOpenSettings when the My Proteins link is pressed', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);

    const onOpenSettings = jest.fn();
    const { findByTestId, getByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={onOpenSettings} />,
    );
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('open-settings-button'));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('does not show a recommendation card when there is no recommendation', async () => {
    mockGetTodaySummary.mockResolvedValueOnce(baseSummary);
    mockGetCurrentRecommendation.mockResolvedValueOnce({ recommendation: null });

    const { findByTestId, queryByTestId } = render(
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} />,
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

    const { findByTestId } = render(<DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} />);
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
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} />,
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
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={jest.fn()} />,
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
      <DashboardScreen onScanMeal={jest.fn()} onOpenSettings={onOpenSettings} />,
    );
    await findByTestId('recommendation-card');
    fireEvent.press(getByTestId('dismiss-recommendation-button'));
    await findByTestId('frequency-prompt');

    fireEvent.press(getByTestId('adjust-frequency-button'));

    expect(onOpenSettings).toHaveBeenCalled();
    expect(queryByTestId('frequency-prompt')).toBeNull();
  });
});
