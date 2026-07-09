import { fireEvent, render } from '@testing-library/react-native';
import { colors } from '../theme/tokens';
import PillButton from './PillButton';

function mergedStyle(style: unknown) {
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
}

describe('PillButton', () => {
  it('renders its label and calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PillButton label="Dismiss" onPress={onPress} />);
    fireEvent.press(getByText('Dismiss'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('defaults to the subtle variant (light background, brand-colored text)', () => {
    const { getByTestId, getByText } = render(<PillButton testID="pill" label="Adjust" onPress={jest.fn()} />);
    expect(mergedStyle(getByTestId('pill').props.style).backgroundColor).toBe(colors.brandSubtle);
    expect(mergedStyle(getByText('Adjust').props.style).color).toBe(colors.brand);
  });

  it('renders the solid variant with brand background and light text', () => {
    const { getByTestId, getByText } = render(
      <PillButton testID="pill" label="Confirm" onPress={jest.fn()} variant="solid" />,
    );
    expect(mergedStyle(getByTestId('pill').props.style).backgroundColor).toBe(colors.brand);
    expect(mergedStyle(getByText('Confirm').props.style).color).toBe(colors.textOnDark);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PillButton label="Dismiss" onPress={onPress} disabled />);
    fireEvent.press(getByText('Dismiss'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('merges a caller-provided style override', () => {
    const { getByTestId } = render(
      <PillButton testID="pill" label="Cancel" onPress={jest.fn()} style={{ flex: 1 }} />,
    );
    expect(mergedStyle(getByTestId('pill').props.style).flex).toBe(1);
  });
});
