import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getProteinSettings, setProteinFrequency } from '../settings/api';
import ProteinSettingsScreen from './ProteinSettingsScreen';

jest.mock('../settings/api', () => ({
  getProteinSettings: jest.fn(),
  setProteinFrequency: jest.fn(),
}));

const mockGetProteinSettings = getProteinSettings as jest.Mock;
const mockSetProteinFrequency = setProteinFrequency as jest.Mock;

const basePreferences = [
  { proteinType: 'paneer', proteinLabel: 'Paneer', frequencyComfort: 'few_times_a_week', source: 'default' },
  { proteinType: 'dal_lentils', proteinLabel: 'Dal & Lentils', frequencyComfort: 'few_times_a_week', source: 'default' },
];

describe('ProteinSettingsScreen', () => {
  beforeEach(() => {
    mockGetProteinSettings.mockReset();
    mockSetProteinFrequency.mockReset();
  });

  it('shows one row per selected protein with the 3-option toggle', async () => {
    mockGetProteinSettings.mockResolvedValueOnce({ preferences: basePreferences });

    const { findByTestId } = render(<ProteinSettingsScreen onDone={jest.fn()} />);
    expect(await findByTestId('protein-row-paneer')).toBeTruthy();
    expect(await findByTestId('protein-row-dal_lentils')).toBeTruthy();
    expect(await findByTestId('frequency-option-paneer-daily')).toBeTruthy();
    expect(await findByTestId('frequency-option-paneer-rarely')).toBeTruthy();
    expect(await findByTestId('frequency-option-paneer-few_times_a_week')).toBeTruthy();
  });

  it('saves the selected frequency immediately when tapped', async () => {
    mockGetProteinSettings.mockResolvedValueOnce({ preferences: basePreferences });
    mockSetProteinFrequency.mockResolvedValueOnce({ success: true });

    const { findByTestId, getByTestId } = render(<ProteinSettingsScreen onDone={jest.fn()} />);
    await findByTestId('protein-row-paneer');

    fireEvent.press(getByTestId('frequency-option-paneer-daily'));

    await waitFor(() => expect(mockSetProteinFrequency).toHaveBeenCalledWith('paneer', 'daily'));
  });

  it('shows an error if loading settings fails', async () => {
    mockGetProteinSettings.mockRejectedValueOnce(new Error('network error'));
    const { findByTestId } = render(<ProteinSettingsScreen onDone={jest.fn()} />);
    expect(await findByTestId('protein-settings-error')).toBeTruthy();
  });

  it('calls onDone when the Done button is pressed', async () => {
    mockGetProteinSettings.mockResolvedValueOnce({ preferences: basePreferences });
    const onDone = jest.fn();

    const { findByTestId, getByTestId } = render(<ProteinSettingsScreen onDone={onDone} />);
    await findByTestId('protein-row-paneer');

    fireEvent.press(getByTestId('protein-settings-done-button'));
    expect(onDone).toHaveBeenCalled();
  });
});
