import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

// Small icon+label section header (e.g. "Macros", "Logged today") - mirrors the reference's small
// divider-with-icon pattern, minus any premium/paywall meaning.
export default function SectionLabel({ label, icon, testID }: Props) {
  return (
    <View testID={testID} style={styles.row}>
      {icon ? <Ionicons name={icon} size={14} color={colors.textSecondary} style={styles.icon} /> : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.xs },
  label: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
});
