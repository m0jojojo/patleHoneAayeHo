import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { saveGoal } from '../onboarding/api';
import GoalScreen from './GoalScreen';

jest.mock('../onboarding/api', () => ({
  saveGoal: jest.fn(),
}));

const mockSaveGoal = saveGoal as jest.Mock;

describe('GoalScreen', () => {
  beforeEach(() => {
    mockSaveGoal.mockReset();
  });

  it('renders all three goal options', () => {
    const { getByTestId } = render(<GoalScreen onNext={jest.fn()} />);
    expect(getByTestId('goal-option-lose_weight')).toBeTruthy();
    expect(getByTestId('goal-option-build_muscle')).toBeTruthy();
    expect(getByTestId('goal-option-eat_healthier')).toBeTruthy();
  });

  it('saves the selected goal and advances', async () => {
    mockSaveGoal.mockResolvedValueOnce({ success: true });
    const onNext = jest.fn();
    const { getByTestId } = render(<GoalScreen onNext={onNext} />);

    fireEvent.press(getByTestId('goal-option-build_muscle'));

    await waitFor(() => expect(onNext).toHaveBeenCalledWith('build_muscle'));
    expect(mockSaveGoal).toHaveBeenCalledWith('build_muscle');
  });

  it('shows an error and does not advance when saving fails', async () => {
    mockSaveGoal.mockRejectedValueOnce(new Error('network error'));
    const onNext = jest.fn();
    const { getByTestId, findByTestId } = render(<GoalScreen onNext={onNext} />);

    fireEvent.press(getByTestId('goal-option-lose_weight'));

    expect(await findByTestId('goal-error')).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });
});
