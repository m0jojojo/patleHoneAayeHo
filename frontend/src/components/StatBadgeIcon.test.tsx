import { render } from '@testing-library/react-native';
import StatBadgeIcon from './StatBadgeIcon';

describe('StatBadgeIcon', () => {
  it('renders a circular badge sized to the given diameter', () => {
    const { getByTestId } = render(<StatBadgeIcon testID="badge" icon="flame" backgroundColor="#F2542D" size={40} />);
    const style = getByTestId('badge').props.style;
    const merged = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(merged.width).toBe(40);
    expect(merged.height).toBe(40);
    expect(merged.borderRadius).toBe(20);
    expect(merged.backgroundColor).toBe('#F2542D');
  });

  it('defaults to a 36px diameter when size is not given', () => {
    const { getByTestId } = render(<StatBadgeIcon testID="badge" icon="flame" backgroundColor="#F2542D" />);
    const style = getByTestId('badge').props.style;
    const merged = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(merged.width).toBe(36);
  });
});
