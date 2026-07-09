import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { radius, colors } from '../theme/tokens';
import Card from './Card';

describe('Card', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <Card>
        <Text>Hello</Text>
      </Card>,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies the surface background and large radius from tokens', () => {
    const { getByTestId } = render(
      <Card testID="test-card">
        <Text>Content</Text>
      </Card>,
    );
    const flatStyle = getByTestId('test-card').props.style;
    const merged = Array.isArray(flatStyle) ? Object.assign({}, ...flatStyle) : flatStyle;
    expect(merged.backgroundColor).toBe(colors.surface);
    expect(merged.borderRadius).toBe(radius.lg);
  });

  it('merges a caller-provided style override', () => {
    const { getByTestId } = render(
      <Card testID="test-card" style={{ marginTop: 20 }}>
        <Text>Content</Text>
      </Card>,
    );
    const flatStyle = getByTestId('test-card').props.style;
    const merged = Array.isArray(flatStyle) ? Object.assign({}, ...flatStyle) : flatStyle;
    expect(merged.marginTop).toBe(20);
  });
});
