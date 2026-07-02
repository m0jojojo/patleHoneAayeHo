import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { saveProteinPreferences } from '../onboarding/api';
import ProteinPreferencesScreen from './ProteinPreferencesScreen';

jest.mock('../onboarding/api', () => ({
  saveProteinPreferences: jest.fn(),
}));

const mockSaveProteinPreferences = saveProteinPreferences as jest.Mock;

describe('ProteinPreferencesScreen - diet-type filtering', () => {
  beforeEach(() => {
    mockSaveProteinPreferences.mockReset();
  });

  it('never shows chicken or fish to a vegetarian - highest-risk trust-breaking bug in this phase', () => {
    const { queryByTestId } = render(<ProteinPreferencesScreen dietType="vegetarian" onNext={jest.fn()} />);
    expect(queryByTestId('protein-option-chicken')).toBeNull();
    expect(queryByTestId('protein-option-fish')).toBeNull();
    expect(queryByTestId('protein-option-eggs')).toBeNull();
    expect(queryByTestId('protein-option-paneer')).toBeTruthy();
  });

  it('shows eggs but not chicken/fish to an eggetarian', () => {
    const { queryByTestId } = render(<ProteinPreferencesScreen dietType="eggetarian" onNext={jest.fn()} />);
    expect(queryByTestId('protein-option-chicken')).toBeNull();
    expect(queryByTestId('protein-option-fish')).toBeNull();
    expect(queryByTestId('protein-option-eggs')).toBeTruthy();
  });

  it('hides eggs, paneer, and dairy in addition to meat/fish for a vegan', () => {
    const { queryByTestId } = render(<ProteinPreferencesScreen dietType="vegan" onNext={jest.fn()} />);
    expect(queryByTestId('protein-option-chicken')).toBeNull();
    expect(queryByTestId('protein-option-fish')).toBeNull();
    expect(queryByTestId('protein-option-eggs')).toBeNull();
    expect(queryByTestId('protein-option-paneer')).toBeNull();
    expect(queryByTestId('protein-option-dairy')).toBeNull();
    expect(queryByTestId('protein-option-dal_lentils')).toBeTruthy();
  });

  it('shows chicken and fish for a non-vegetarian', () => {
    const { queryByTestId } = render(<ProteinPreferencesScreen dietType="non_veg" onNext={jest.fn()} />);
    expect(queryByTestId('protein-option-chicken')).toBeTruthy();
    expect(queryByTestId('protein-option-fish')).toBeTruthy();
  });

  it('disables continue until at least one protein is selected', () => {
    const { getByTestId } = render(<ProteinPreferencesScreen dietType="non_veg" onNext={jest.fn()} />);
    const button = getByTestId('protein-preferences-continue-button');
    expect(button.props.accessibilityState?.disabled).toBeTruthy();

    fireEvent.press(getByTestId('protein-option-chicken'));
    expect(button.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('saves the selected proteins and advances', async () => {
    mockSaveProteinPreferences.mockResolvedValueOnce({ success: true });
    const onNext = jest.fn();
    const { getByTestId } = render(<ProteinPreferencesScreen dietType="vegetarian" onNext={onNext} />);

    fireEvent.press(getByTestId('protein-option-paneer'));
    fireEvent.press(getByTestId('protein-option-dal_lentils'));
    fireEvent.press(getByTestId('protein-preferences-continue-button'));

    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(mockSaveProteinPreferences).toHaveBeenCalledWith(
      expect.arrayContaining(['paneer', 'dal_lentils']),
    );
  });

  it('toggling a selected protein again deselects it', () => {
    const { getByTestId } = render(<ProteinPreferencesScreen dietType="non_veg" onNext={jest.fn()} />);
    const option = getByTestId('protein-option-chicken');
    const button = getByTestId('protein-preferences-continue-button');

    fireEvent.press(option);
    expect(button.props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(option);
    expect(button.props.accessibilityState?.disabled).toBeTruthy();
  });
});
