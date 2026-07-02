import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { requestOtp, verifyOtp } from '../auth/api';
import OtpEntryScreen, { RESEND_COOLDOWN_SECONDS } from './OtpEntryScreen';

jest.mock('../auth/api', () => ({
  requestOtp: jest.fn(),
  verifyOtp: jest.fn(),
}));

const mockRequestOtp = requestOtp as jest.Mock;
const mockVerifyOtp = verifyOtp as jest.Mock;

describe('OtpEntryScreen', () => {
  beforeEach(() => {
    mockRequestOtp.mockReset();
    mockVerifyOtp.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the initial 5 minute expiry countdown', () => {
    const { getByTestId } = render(<OtpEntryScreen phoneNumber="+919876543210" onVerified={jest.fn()} />);
    expect(getByTestId('otp-expiry').props.children).toBe('Expires in 5:00');
  });

  it('counts the expiry timer down as time passes', () => {
    const { getByTestId } = render(<OtpEntryScreen phoneNumber="+919876543210" onVerified={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(65_000);
    });
    expect(getByTestId('otp-expiry').props.children).toBe('Expires in 3:55');
  });

  it('disables the resend button during the cooldown, then enables it', () => {
    const { getByTestId } = render(<OtpEntryScreen phoneNumber="+919876543210" onVerified={jest.fn()} />);
    const resendButton = getByTestId('resend-otp-button');
    expect(resendButton.props.accessibilityState?.disabled).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000);
    });
    expect(resendButton.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('verifies the code and calls onVerified with the session token', async () => {
    mockVerifyOtp.mockResolvedValueOnce({ token: 'abc123' });
    const onVerified = jest.fn();
    const { getByTestId } = render(<OtpEntryScreen phoneNumber="+919876543210" onVerified={onVerified} />);

    fireEvent.changeText(getByTestId('otp-input'), '482913');
    fireEvent.press(getByTestId('verify-otp-button'));

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('abc123'));
    expect(mockVerifyOtp).toHaveBeenCalledWith('+919876543210', '482913');
  });

  it('shows an error when the code is rejected', async () => {
    mockVerifyOtp.mockRejectedValueOnce(new Error('Incorrect OTP'));
    const { getByTestId, findByTestId } = render(
      <OtpEntryScreen phoneNumber="+919876543210" onVerified={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('otp-input'), '000000');
    fireEvent.press(getByTestId('verify-otp-button'));

    expect(await findByTestId('otp-error')).toBeTruthy();
  });

  it('resends the code and resets the countdown once the cooldown has elapsed', async () => {
    mockRequestOtp.mockResolvedValueOnce({ success: true });
    const { getByTestId } = render(<OtpEntryScreen phoneNumber="+919876543210" onVerified={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime((RESEND_COOLDOWN_SECONDS + 60) * 1000);
    });

    fireEvent.press(getByTestId('resend-otp-button'));
    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith('+919876543210'));
    expect(getByTestId('otp-expiry').props.children).toBe('Expires in 5:00');
  });
});
