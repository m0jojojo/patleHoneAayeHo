import { render } from '@testing-library/react-native';
import { getSessionToken } from './src/auth/session';
import { getOnboardingStatus } from './src/onboarding/api';
import App from './App';

jest.mock('./src/auth/session', () => ({
  getSessionToken: jest.fn(),
  saveSessionToken: jest.fn(),
}));

jest.mock('./src/onboarding/api', () => ({
  getOnboardingStatus: jest.fn(),
}));

const mockGetSessionToken = getSessionToken as jest.Mock;
const mockGetOnboardingStatus = getOnboardingStatus as jest.Mock;

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

  it('goes straight to home when onboarding is already complete', async () => {
    mockGetSessionToken.mockResolvedValueOnce('a-token');
    mockGetOnboardingStatus.mockResolvedValueOnce({
      goal: 'lose_weight',
      dietType: 'vegetarian',
      proteinPreferences: ['paneer'],
      bodyStats: { height: 170, weight: 65, age: 35, activityLevel: 'moderate', sex: 'female' },
      completed: true,
    });
    const { findByTestId } = render(<App />);
    expect(await findByTestId('home-screen')).toBeTruthy();
  });
});
