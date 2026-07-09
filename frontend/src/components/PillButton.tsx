import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'subtle';
  disabled?: boolean;
  testID?: string;
}

// Rounded pill button - replaces the plain text links previously used for secondary actions
// ("My Proteins", "Dismiss", "Adjust"). "subtle" (the default) mirrors the reference's "View
// Insight" style; "solid" is available for a more prominent pill-shaped action if one is needed.
export default function PillButton({ label, onPress, variant = 'subtle', disabled, testID }: Props) {
  const isSolid = variant === 'solid';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[styles.pill, isSolid ? styles.solid : styles.subtle, disabled && styles.disabled]}
    >
      <Text style={[styles.label, isSolid ? styles.solidLabel : styles.subtleLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  solid: { backgroundColor: colors.brand },
  subtle: { backgroundColor: colors.brandSubtle },
  disabled: { opacity: 0.5 },
  label: { ...typography.bodyBold, fontSize: 13 },
  solidLabel: { color: colors.textOnDark },
  subtleLabel: { color: colors.brand },
});
