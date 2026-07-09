import { fireEvent, render } from '@testing-library/react-native';
import BottomNavBar from './BottomNavBar';

describe('BottomNavBar', () => {
  it('renders a Home label', () => {
    const { getByText } = render(<BottomNavBar onAdd={jest.fn()} />);
    expect(getByText('Home')).toBeTruthy();
  });

  it('calls onAdd when the center + button is pressed', () => {
    const onAdd = jest.fn();
    const { getByTestId } = render(<BottomNavBar onAdd={onAdd} />);
    fireEvent.press(getByTestId('bottom-nav-add-button'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
