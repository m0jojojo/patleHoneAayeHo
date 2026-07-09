import { render } from '@testing-library/react-native';
import SectionLabel from './SectionLabel';

describe('SectionLabel', () => {
  it('renders the label text', () => {
    const { getByText } = render(<SectionLabel label="Logged today" />);
    expect(getByText('Logged today')).toBeTruthy();
  });

  it('renders an icon when one is given', () => {
    const { UNSAFE_queryByProps } = render(<SectionLabel label="Macros" icon="flame" />);
    expect(UNSAFE_queryByProps({ name: 'flame' })).toBeTruthy();
  });

  it('renders without an icon when none is given', () => {
    const { UNSAFE_queryByProps } = render(<SectionLabel label="Logged today" />);
    expect(UNSAFE_queryByProps({ name: 'flame' })).toBeNull();
  });
});
