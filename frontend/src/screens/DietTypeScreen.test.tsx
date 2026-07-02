import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { saveDietType } from '../onboarding/api';
import DietTypeScreen from './DietTypeScreen';

jest.mock('../onboarding/api', () => ({
  saveDietType: jest.fn(),
}));

const mockSaveDietType = saveDietType as jest.Mock;

describe('DietTypeScreen', () => {
  beforeEach(() => {
    mockSaveDietType.mockReset();
  });

  it('renders all four diet type options', () => {
    const { getByTestId } = render(<DietTypeScreen onNext={jest.fn()} />);
    expect(getByTestId('diet-type-option-vegetarian')).toBeTruthy();
    expect(getByTestId('diet-type-option-eggetarian')).toBeTruthy();
    expect(getByTestId('diet-type-option-non_veg')).toBeTruthy();
    expect(getByTestId('diet-type-option-vegan')).toBeTruthy();
  });

  it('saves the selected diet type and advances', async () => {
    mockSaveDietType.mockResolvedValueOnce({ success: true });
    const onNext = jest.fn();
    const { getByTestId } = render(<DietTypeScreen onNext={onNext} />);

    fireEvent.press(getByTestId('diet-type-option-vegetarian'));

    await waitFor(() => expect(onNext).toHaveBeenCalledWith('vegetarian'));
    expect(mockSaveDietType).toHaveBeenCalledWith('vegetarian');
  });

  it('shows an error and does not advance when saving fails', async () => {
    mockSaveDietType.mockRejectedValueOnce(new Error('network error'));
    const onNext = jest.fn();
    const { getByTestId, findByTestId } = render(<DietTypeScreen onNext={onNext} />);

    fireEvent.press(getByTestId('diet-type-option-vegan'));

    expect(await findByTestId('diet-type-error')).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });
});
