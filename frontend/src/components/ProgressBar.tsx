import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

interface Props {
  consumed: number;
  target: number;
  testID?: string;
}

// Below this fraction of target, the bar reads as "behind pace" (amber). Above 1.0, it reads as
// "over target" (red) - matches the semantic coloring in the HealthifyMe reference (e.g. 99%
// protein shown green/on-track, 102% carbs shown red/over, 65% fibre shown amber/behind).
export const UNDER_TARGET_THRESHOLD = 0.85;
export const OVER_TARGET_THRESHOLD = 1.0;

export function progressColor(pct: number): string {
  if (pct > OVER_TARGET_THRESHOLD) return colors.danger;
  if (pct < UNDER_TARGET_THRESHOLD) return colors.warning;
  return colors.success;
}

// Horizontal progress bar with semantic color thresholds - the fill's color reflects the true
// (unclamped) percentage of target so "over target" is still shown as red, but the fill's visual
// width is clamped at 100% since a bar can't usefully render past its own container.
export default function ProgressBar({ consumed, target, testID }: Props) {
  const pct = target > 0 ? consumed / target : 0;
  const clampedWidth = Math.min(1, Math.max(0, pct));

  return (
    <View testID={testID} style={styles.track}>
      <View style={[styles.fill, { width: `${clampedWidth * 100}%`, backgroundColor: progressColor(pct) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: radius.sm,
  },
});
