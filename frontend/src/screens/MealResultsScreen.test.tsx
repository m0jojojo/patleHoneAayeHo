import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getDishMacros, logMeal, type ScanResult } from '../meals/api';
import MealResultsScreen from './MealResultsScreen';

jest.mock('../meals/api', () => ({
  getDishMacros: jest.fn(),
  logMeal: jest.fn(),
}));

const mockGetDishMacros = getDishMacros as jest.Mock;
const mockLogMeal = logMeal as jest.Mock;

describe('MealResultsScreen', () => {
  beforeEach(() => {
    mockGetDishMacros.mockReset();
    mockLogMeal.mockReset();
  });

  it('shows a pre-filled editable macro breakdown for a single high-confidence dish', async () => {
    const scanResult: ScanResult = {
      visionFailed: false,
      dishes: [
        {
          label: 'White rice (cooked)',
          matched: true,
          confidence: 0.95,
          portionMultiplier: 1,
          needsDisambiguation: false,
          macros: { calories: 150, proteinG: 3, carbsG: 33, fatG: 0.3 },
        },
      ],
    };

    const { getByTestId } = render(<MealResultsScreen scanResult={scanResult} onLogged={jest.fn()} />);
    expect(getByTestId('calories-input').props.value).toBe('150');
    expect(getByTestId('protein-input').props.value).toBe('3');
  });

  it('sums macros across a multi-dish plate', async () => {
    const scanResult: ScanResult = {
      visionFailed: false,
      dishes: [
        {
          label: 'White rice (cooked)',
          matched: true,
          confidence: 0.9,
          portionMultiplier: 1,
          needsDisambiguation: false,
          macros: { calories: 150, proteinG: 3, carbsG: 33, fatG: 0.3 },
        },
        {
          label: 'Boiled egg',
          matched: true,
          confidence: 0.9,
          portionMultiplier: 1,
          needsDisambiguation: false,
          macros: { calories: 78, proteinG: 6.5, carbsG: 0.5, fatG: 5 },
        },
      ],
    };

    const { getByTestId } = render(<MealResultsScreen scanResult={scanResult} onLogged={jest.fn()} />);
    expect(getByTestId('calories-input').props.value).toBe('228');
  });

  it('shows a disambiguation picker instead of macros for a low-confidence dish, then resolves it', async () => {
    const scanResult: ScanResult = {
      visionFailed: false,
      dishes: [
        {
          label: 'Dal (tadka)',
          matched: true,
          confidence: 0.4,
          portionMultiplier: 1,
          needsDisambiguation: true,
          disambiguationQuestion: 'How much ghee/oil was used, roughly?',
        },
      ],
    };
    mockGetDishMacros.mockResolvedValueOnce({ macros: { calories: 187.5, proteinG: 7, carbsG: 18, fatG: 9.5 } });

    const { getByTestId, queryByTestId } = render(<MealResultsScreen scanResult={scanResult} onLogged={jest.fn()} />);
    expect(queryByTestId('log-meal-button')).toBeNull();

    fireEvent.press(getByTestId('oil-option-0-medium'));

    await waitFor(() => expect(getByTestId('calories-input').props.value).toBe('188'));
    expect(mockGetDishMacros).toHaveBeenCalledWith('Dal (tadka)', { oilLevel: 'medium', portionMultiplier: 1 });
    expect(getByTestId('log-meal-button')).toBeTruthy();
  });

  it('logs the edited macro value, not the original estimate', async () => {
    const scanResult: ScanResult = {
      visionFailed: false,
      dishes: [
        {
          label: 'White rice (cooked)',
          matched: true,
          confidence: 0.95,
          portionMultiplier: 1,
          needsDisambiguation: false,
          macros: { calories: 150, proteinG: 3, carbsG: 33, fatG: 0.3 },
        },
      ],
    };
    mockLogMeal.mockResolvedValueOnce({ id: 'abc', showSettingsNudge: true });

    const onLogged = jest.fn();
    const { getByTestId } = render(<MealResultsScreen scanResult={scanResult} onLogged={onLogged} />);

    fireEvent.changeText(getByTestId('calories-input'), '250');
    fireEvent.press(getByTestId('log-meal-button'));

    await waitFor(() => expect(onLogged).toHaveBeenCalledWith({ showSettingsNudge: true }));
    expect(mockLogMeal).toHaveBeenCalledWith(
      expect.objectContaining({ macros: expect.objectContaining({ calories: 250 }) }),
    );
  });

  it('falls back to manual entry when the vision scan failed', async () => {
    const scanResult: ScanResult = { visionFailed: true, dishes: [] };
    mockLogMeal.mockResolvedValueOnce({ id: 'abc', showSettingsNudge: true });

    const onLogged = jest.fn();
    const { getByTestId, findByTestId } = render(<MealResultsScreen scanResult={scanResult} onLogged={onLogged} />);
    expect(await findByTestId('manual-dish-name-input')).toBeTruthy();

    fireEvent.press(getByTestId('log-meal-button'));
    expect(await findByTestId('meal-results-error')).toBeTruthy();
    expect(mockLogMeal).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('manual-dish-name-input'), 'Dal and rice');
    fireEvent.changeText(getByTestId('calories-input'), '400');
    fireEvent.press(getByTestId('log-meal-button'));

    await waitFor(() => expect(onLogged).toHaveBeenCalledWith({ showSettingsNudge: true }));
    expect(mockLogMeal).toHaveBeenCalledWith(
      expect.objectContaining({ dishLabels: ['Dal and rice'], macros: expect.objectContaining({ calories: 400 }) }),
    );
  });
});
