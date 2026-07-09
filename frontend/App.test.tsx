import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getSessionToken } from './src/auth/session';
import { getTodaySummary } from './src/meals/api';
import { getOnboardingStatus } from './src/onboarding/api';
import App from './App';

jest.mock('./src/auth/session', () => ({
  getSessionToken: jest.fn(),
  saveSessionToken: jest.fn(),
}));

jest.mock('./src/onboarding/api', () => ({
  getOnboardingStatus: jest.fn(),
}));

jest.mock('./src/meals/api', () => ({
  getTodaySummary: jest.fn(),
}));

const mockGetSessionToken = getSessionToken as jest.Mock;
const mockGetOnboardingStatus = getOnboardingStatus as jest.Mock;
const mockGetTodaySummary = getTodaySummary as jest.Mock;

const emptyTodaySummary = {
  tdee: 2500,
  targets: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
  consumed: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  remaining: { calories: 2000, proteinG: 160, carbsG: 200, fatG: 55 },
  meals: [],
};

const emptyStatus = {
  goal: null,
  dietType: null,
  proteinPreferences: [],
  bodyStats: null,
  completed: false,
};

describe('App', () => {
  beforeEach(() => {
    mockGetSessionToken.mockReset();
    mockGetOnboardingStatus.mockReset();
    mockGetTodaySummary.mockReset();
  });

  it('renders the phone entry screen when there is no session', async () => {
    mockGetSessionToken.mockResolvedValueOnce(null);
    const { findByTestId } = render(<App />);
    expect(await findByTestId('phone-entry-screen')).toBeTruthy();
  });

  it('resumes at the goal screen for a signed-in user who has not started onboarding', async () => {
    mockGetSessionToken.mockResolvedValueOnce('a-token');
    mockGetOnboardingStatus.mockResolvedValueOnce(emptyStatus);
    const { findByTestId } = render(<App />);
    expect(await findByTestId('goal-screen')).toBeTruthy();
  });

  it('resumes at the protein preferences screen when goal and diet type are already set', async () => {
    mockGetSessionToken.mockResolvedValueOnce('a-token');
    mockGetOnboardingStatus.mockResolvedValueOnce({
      ...emptyStatus,
      goal: 'lose_weight',
      dietType: 'vegetarian',
    });
    const { findByTestId } = render(<App />);
    expect(await findByTestId('protein-preferences-screen')).toBeTruthy();
  });

  it('resumes at the body stats screen once proteins are selected', async () => {
    mockGetSessionToken.mockResolvedValueOnce('a-token');
    mockGetOnboardingStatus.mockResolvedValueOnce({
      ...emptyStatus,
      goal: 'lose_weight',
      dietType: 'vegetarian',
      proteinPreferences: ['paneer'],
    });
    const { findByTestId } = render(<App />);
    expect(await findByTestId('body-stats-screen')).toBeTruthy();
  });

  it('goes straight to the dashboard when onboarding is already complete', async () => {
    mockGetSessionToken.mockResolvedValueOnce('a-token');
    mockGetOnboardingStatus.mockResolvedValueOnce({
      goal: 'lose_weight',
      dietType: 'vegetarian',
      proteinPreferences: ['paneer'],
      bodyStats: { height: 170, weight: 65, age: 35, activityLevel: 'moderate', sex: 'female' },
      completed: true,
    });
    mockGetTodaySummary.mockResolvedValueOnce(emptyTodaySummary);
    const { findByTestId } = render(<App />);
    expect(await findByTestId('dashboard-screen')).toBeTruthy();
  });

  it('navigates from the dashboard to the meal scan screen', async () => {
    mockGetSessionToken.mockResolvedValueOnce('a-token');
    mockGetOnboardingStatus.mockResolvedValueOnce({
      goal: 'lose_weight',
      dietType: 'vegetarian',
      proteinPreferences: ['paneer'],
      bodyStats: { height: 170, weight: 65, age: 35, activityLevel: 'moderate', sex: 'female' },
      completed: true,
    });
    mockGetTodaySummary.mockResolvedValueOnce(emptyTodaySummary);
    const { findByTestId, getByTestId } = render(<App />);
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('scan-meal-button'));

    await waitFor(() => expect(getByTestId('meal-scan-screen')).toBeTruthy());
  });

  it('navigates from the dashboard to today\'s detail screen and back', async () => {
    mockGetSessionToken.mockResolvedValueOnce('a-token');
    mockGetOnboardingStatus.mockResolvedValueOnce({
      goal: 'lose_weight',
      dietType: 'vegetarian',
      proteinPreferences: ['paneer'],
      bodyStats: { height: 170, weight: 65, age: 35, activityLevel: 'moderate', sex: 'female' },
      completed: true,
    });
    mockGetTodaySummary.mockResolvedValue(emptyTodaySummary);
    const { findByTestId, getByTestId } = render(<App />);
    await findByTestId('dashboard-screen');

    fireEvent.press(getByTestId('open-today-detail-button'));

    await waitFor(() => expect(getByTestId('today-detail-screen')).toBeTruthy());

    fireEvent.press(await findByTestId('today-detail-back-button'));

    await waitFor(() => expect(getByTestId('dashboard-screen')).toBeTruthy());
  });
});
