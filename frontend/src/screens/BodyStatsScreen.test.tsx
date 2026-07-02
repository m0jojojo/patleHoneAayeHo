import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { saveBodyStats } from '../onboarding/api';
import BodyStatsScreen from './BodyStatsScreen';

jest.mock('../onboarding/api', () => ({
  saveBodyStats: jest.fn(),
}));

const mockSaveBodyStats = saveBodyStats as jest.Mock;

function fillValidForm(getByTestId: (id: string) => any) {
  fireEvent.changeText(getByTestId('height-input'), '170');
  fireEvent.changeText(getByTestId('weight-input'), '65');
  fireEvent.changeText(getByTestId('age-input'), '35');
  fireEvent.press(getByTestId('activity-level-option-moderate'));
}

describe('BodyStatsScreen', () => {
  beforeEach(() => {
    mockSaveBodyStats.mockReset();
  });

  it('saves a realistic profile and advances', async () => {
    mockSaveBodyStats.mockResolvedValueOnce({ success: true });
    const onNext = jest.fn();
    const { getByTestId } = render(<BodyStatsScreen onNext={onNext} />);

    fillValidForm(getByTestId);
    fireEvent.press(getByTestId('body-stats-continue-button'));

    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(mockSaveBodyStats).toHaveBeenCalledWith({
      height: 170,
      weight: 65,
      age: 35,
      activityLevel: 'moderate',
    });
  });

  it('rejects zero height without calling the API', async () => {
    const { getByTestId, findByTestId } = render(<BodyStatsScreen onNext={jest.fn()} />);
    fillValidForm(getByTestId);
    fireEvent.changeText(getByTestId('height-input'), '0');
    fireEvent.press(getByTestId('body-stats-continue-button'));

    expect(await findByTestId('body-stats-error')).toBeTruthy();
    expect(mockSaveBodyStats).not.toHaveBeenCalled();
  });

  it('rejects negative weight', async () => {
    const { getByTestId, findByTestId } = render(<BodyStatsScreen onNext={jest.fn()} />);
    fillValidForm(getByTestId);
    fireEvent.changeText(getByTestId('weight-input'), '-10');
    fireEvent.press(getByTestId('body-stats-continue-button'));

    expect(await findByTestId('body-stats-error')).toBeTruthy();
    expect(mockSaveBodyStats).not.toHaveBeenCalled();
  });

  it('rejects age over 120', async () => {
    const { getByTestId, findByTestId } = render(<BodyStatsScreen onNext={jest.fn()} />);
    fillValidForm(getByTestId);
    fireEvent.changeText(getByTestId('age-input'), '121');
    fireEvent.press(getByTestId('body-stats-continue-button'));

    expect(await findByTestId('body-stats-error')).toBeTruthy();
    expect(mockSaveBodyStats).not.toHaveBeenCalled();
  });

  it('requires an activity level to be selected', async () => {
    const { getByTestId, findByTestId } = render(<BodyStatsScreen onNext={jest.fn()} />);
    fireEvent.changeText(getByTestId('height-input'), '170');
    fireEvent.changeText(getByTestId('weight-input'), '65');
    fireEvent.changeText(getByTestId('age-input'), '35');
    fireEvent.press(getByTestId('body-stats-continue-button'));

    expect(await findByTestId('body-stats-error')).toBeTruthy();
    expect(mockSaveBodyStats).not.toHaveBeenCalled();
  });
});
