import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { completeOnboarding } from '../onboarding/api';
import OnboardingCompleteScreen from './OnboardingCompleteScreen';

jest.mock('../onboarding/api', () => ({
  completeOnboarding: jest.fn(),
}));

const mockCompleteOnboarding = completeOnboarding as jest.Mock;

describe('OnboardingCompleteScreen', () => {
  beforeEach(() => {
    mockCompleteOnboarding.mockReset();
  });

  it('marks onboarding complete and calls onComplete', async () => {
    mockCompleteOnboarding.mockResolvedValueOnce({ success: true });
    const onComplete = jest.fn();
    const { getByTestId } = render(<OnboardingCompleteScreen onComplete={onComplete} />);

    fireEvent.press(getByTestId('start-scanning-button'));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockCompleteOnboarding).toHaveBeenCalled();
  });

  it('shows an error and does not complete when the request fails', async () => {
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('network error'));
    const onComplete = jest.fn();
    const { getByTestId, findByTestId } = render(<OnboardingCompleteScreen onComplete={onComplete} />);

    fireEvent.press(getByTestId('start-scanning-button'));

    expect(await findByTestId('onboarding-complete-error')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
