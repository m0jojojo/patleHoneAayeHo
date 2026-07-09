import { render } from '@testing-library/react-native';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the given message', () => {
    const { getByText } = render(<EmptyState message="Nothing logged yet." />);
    expect(getByText('Nothing logged yet.')).toBeTruthy();
  });

  it('renders a default icon when none is given', () => {
    const { UNSAFE_queryByProps } = render(<EmptyState message="Nothing logged yet." />);
    expect(UNSAFE_queryByProps({ name: 'restaurant-outline' })).toBeTruthy();
  });

  it('renders a custom icon when given', () => {
    const { UNSAFE_queryByProps } = render(<EmptyState message="No workouts yet." icon="barbell-outline" />);
    expect(UNSAFE_queryByProps({ name: 'barbell-outline' })).toBeTruthy();
  });
});
