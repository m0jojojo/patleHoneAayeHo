import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme/tokens';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Base rounded, shadowed surface used by every card-style component (MacroSummaryCard,
// MealLogCard, recommendation card, frequency-prompt card) - see docs/ui-design-system.md.
export default function Card({ children, style, testID }: Props) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
});
