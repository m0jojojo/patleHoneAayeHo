import { fireEvent, render } from '@testing-library/react-native';
import CalendarModal from './CalendarModal';

describe('CalendarModal', () => {
  it('shows the month/year for the selected date', () => {
    const { getByText } = render(<CalendarModal selectedDate="2026-07-09" onCancel={jest.fn()} onConfirm={jest.fn()} />);
    expect(getByText('July, 2026')).toBeTruthy();
  });

  it('calls onConfirm with the tapped date when Done is pressed', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <CalendarModal selectedDate="2026-07-09" onCancel={jest.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.press(getByTestId('calendar-day-2026-07-05'));
    fireEvent.press(getByTestId('calendar-done-button'));

    expect(onConfirm).toHaveBeenCalledWith('2026-07-05');
  });

  it('calls onCancel without calling onConfirm when Cancel is pressed', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <CalendarModal selectedDate="2026-07-09" onCancel={onCancel} onConfirm={onConfirm} />,
    );

    fireEvent.press(getByTestId('calendar-day-2026-07-05'));
    fireEvent.press(getByTestId('calendar-cancel-button'));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables dates after the real today', () => {
    const realToday = new Date();
    const future = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() + 1);
    const futureString = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(
      future.getDate(),
    ).padStart(2, '0')}`;

    // Only meaningful when "tomorrow" falls in the same displayed month as today.
    if (future.getMonth() !== realToday.getMonth()) return;

    const todayString = `${realToday.getFullYear()}-${String(realToday.getMonth() + 1).padStart(2, '0')}-${String(
      realToday.getDate(),
    ).padStart(2, '0')}`;

    const { getByTestId } = render(
      <CalendarModal selectedDate={todayString} onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(getByTestId(`calendar-day-${futureString}`).props.accessibilityState.disabled).toBe(true);
  });

  it('navigates to the previous and next month', () => {
    const { getByText, getByTestId } = render(
      <CalendarModal selectedDate="2026-07-09" onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );

    fireEvent.press(getByTestId('calendar-prev-month'));
    expect(getByText('June, 2026')).toBeTruthy();

    fireEvent.press(getByTestId('calendar-next-month'));
    fireEvent.press(getByTestId('calendar-next-month'));
    expect(getByText('August, 2026')).toBeTruthy();
  });

});
