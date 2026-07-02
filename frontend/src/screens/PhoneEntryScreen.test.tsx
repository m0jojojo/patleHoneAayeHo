import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { requestOtp } from '../auth/api';
import PhoneEntryScreen from './PhoneEntryScreen';

jest.mock('../auth/api', () => ({
  requestOtp: jest.fn(),
}));

const mockRequestOtp = requestOtp as jest.Mock;

describe('PhoneEntryScreen', () => {
  beforeEach(() => {
    mockRequestOtp.mockReset();
  });

  it('disables the submit button until the phone number is a valid E.164 number', () => {
    const { getByTestId } = render(<PhoneEntryScreen onOtpRequested={jest.fn()} />);
    const input = getByTestId('phone-input');
    const button = getByTestId('send-otp-button');

    expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBeTruthy();

    fireEvent.changeText(input, '987654');
    expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBeTruthy();

    fireEvent.changeText(input, '+919876543210');
    expect(button.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('requests an OTP and advances on success', async () => {
    mockRequestOtp.mockResolvedValueOnce({ success: true });
    const onOtpRequested = jest.fn();
    const { getByTestId } = render(<PhoneEntryScreen onOtpRequested={onOtpRequested} />);

    fireEvent.changeText(getByTestId('phone-input'), '+919876543210');
    fireEvent.press(getByTestId('send-otp-button'));

    await waitFor(() => expect(onOtpRequested).toHaveBeenCalledWith('+919876543210'));
    expect(mockRequestOtp).toHaveBeenCalledWith('+919876543210');
  });

  it('shows an error and does not advance when the request fails', async () => {
    mockRequestOtp.mockRejectedValueOnce(new Error('network error'));
    const onOtpRequested = jest.fn();
    const { getByTestId, findByTestId } = render(<PhoneEntryScreen onOtpRequested={onOtpRequested} />);

    fireEvent.changeText(getByTestId('phone-input'), '+919876543210');
    fireEvent.press(getByTestId('send-otp-button'));

    expect(await findByTestId('phone-error')).toBeTruthy();
    expect(onOtpRequested).not.toHaveBeenCalled();
  });
});
