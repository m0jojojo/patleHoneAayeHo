import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanMeal } from '../meals/api';
import MealScanScreen from './MealScanScreen';

jest.mock('../meals/api', () => ({
  scanMeal: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockScanMeal = scanMeal as jest.Mock;
const mockRequestCamera = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const mockRequestLibrary = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunchCamera = ImagePicker.launchCameraAsync as jest.Mock;
const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

const fakeAsset = { base64: 'fake-base64-data' };

describe('MealScanScreen', () => {
  beforeEach(() => {
    mockScanMeal.mockReset();
    mockRequestCamera.mockReset();
    mockRequestLibrary.mockReset();
    mockLaunchCamera.mockReset();
    mockLaunchLibrary.mockReset();
  });

  it('takes a photo, scans it, and calls onScanned with the result', async () => {
    mockRequestCamera.mockResolvedValueOnce({ granted: true });
    mockLaunchCamera.mockResolvedValueOnce({ canceled: false, assets: [fakeAsset] });
    mockScanMeal.mockResolvedValueOnce({ visionFailed: false, dishes: [{ label: 'Dal (tadka)' }] });

    const onScanned = jest.fn();
    const { getByTestId } = render(<MealScanScreen onScanned={onScanned} />);
    fireEvent.press(getByTestId('take-photo-button'));

    await waitFor(() => expect(onScanned).toHaveBeenCalledWith({ visionFailed: false, dishes: [{ label: 'Dal (tadka)' }] }));
    expect(mockScanMeal).toHaveBeenCalledWith('fake-base64-data');
  });

  it('shows an error and does not scan when camera permission is denied', async () => {
    mockRequestCamera.mockResolvedValueOnce({ granted: false });

    const onScanned = jest.fn();
    const { getByTestId, findByTestId } = render(<MealScanScreen onScanned={onScanned} />);
    fireEvent.press(getByTestId('take-photo-button'));

    expect(await findByTestId('meal-scan-error')).toBeTruthy();
    expect(mockScanMeal).not.toHaveBeenCalled();
    expect(onScanned).not.toHaveBeenCalled();
  });

  it('does nothing if the user cancels the camera', async () => {
    mockRequestCamera.mockResolvedValueOnce({ granted: true });
    mockLaunchCamera.mockResolvedValueOnce({ canceled: true, assets: null });

    const onScanned = jest.fn();
    const { getByTestId } = render(<MealScanScreen onScanned={onScanned} />);
    fireEvent.press(getByTestId('take-photo-button'));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockScanMeal).not.toHaveBeenCalled();
    expect(onScanned).not.toHaveBeenCalled();
  });

  it('falls back to manual entry (visionFailed) if the scan API call fails, without crashing', async () => {
    mockRequestCamera.mockResolvedValueOnce({ granted: true });
    mockLaunchCamera.mockResolvedValueOnce({ canceled: false, assets: [fakeAsset] });
    mockScanMeal.mockRejectedValueOnce(new Error('network error'));

    const onScanned = jest.fn();
    const { getByTestId } = render(<MealScanScreen onScanned={onScanned} />);
    fireEvent.press(getByTestId('take-photo-button'));

    await waitFor(() => expect(onScanned).toHaveBeenCalledWith({ visionFailed: true, dishes: [] }));
  });

  it('picks from the gallery and scans it', async () => {
    mockRequestLibrary.mockResolvedValueOnce({ granted: true });
    mockLaunchLibrary.mockResolvedValueOnce({ canceled: false, assets: [fakeAsset] });
    mockScanMeal.mockResolvedValueOnce({ visionFailed: false, dishes: [] });

    const onScanned = jest.fn();
    const { getByTestId } = render(<MealScanScreen onScanned={onScanned} />);
    fireEvent.press(getByTestId('pick-photo-button'));

    await waitFor(() => expect(onScanned).toHaveBeenCalledWith({ visionFailed: false, dishes: [] }));
    expect(mockScanMeal).toHaveBeenCalledWith('fake-base64-data');
  });
});
