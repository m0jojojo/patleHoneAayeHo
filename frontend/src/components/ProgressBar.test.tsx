import { render } from '@testing-library/react-native';
import { colors } from '../theme/tokens';
import ProgressBar, { OVER_TARGET_THRESHOLD, UNDER_TARGET_THRESHOLD, progressColor } from './ProgressBar';

function fillStyle(getByTestId: (id: string) => { props: { children: { props: { style: unknown[] } } } }, testID: string) {
  const track = getByTestId(testID);
  const fill = track.props.children as unknown as { props: { style: unknown[] } };
  const styleArray = fill.props.style;
  return Array.isArray(styleArray) ? Object.assign({}, ...styleArray) : styleArray;
}

describe('progressColor', () => {
  it('is amber below the under-target threshold', () => {
    expect(progressColor(UNDER_TARGET_THRESHOLD - 0.01)).toBe(colors.warning);
  });

  it('is green between the under and over thresholds', () => {
    expect(progressColor(UNDER_TARGET_THRESHOLD)).toBe(colors.success);
    expect(progressColor(OVER_TARGET_THRESHOLD)).toBe(colors.success);
  });

  it('is red above the over-target threshold', () => {
    expect(progressColor(OVER_TARGET_THRESHOLD + 0.01)).toBe(colors.danger);
  });
});

describe('ProgressBar', () => {
  it('renders an amber fill when behind pace', () => {
    const { getByTestId } = render(<ProgressBar testID="bar" consumed={50} target={100} />);
    expect(fillStyle(getByTestId, 'bar').backgroundColor).toBe(colors.warning);
    expect(fillStyle(getByTestId, 'bar').width).toBe('50%');
  });

  it('renders a green fill when on target', () => {
    const { getByTestId } = render(<ProgressBar testID="bar" consumed={99} target={100} />);
    expect(fillStyle(getByTestId, 'bar').backgroundColor).toBe(colors.success);
  });

  it('renders a red fill clamped to 100% width when over target', () => {
    const { getByTestId } = render(<ProgressBar testID="bar" consumed={214} target={100} />);
    expect(fillStyle(getByTestId, 'bar').backgroundColor).toBe(colors.danger);
    expect(fillStyle(getByTestId, 'bar').width).toBe('100%');
  });

  it('does not crash and shows a zero-width bar when target is zero', () => {
    const { getByTestId } = render(<ProgressBar testID="bar" consumed={10} target={0} />);
    expect(fillStyle(getByTestId, 'bar').width).toBe('0%');
  });
});
