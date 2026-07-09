import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

interface Props {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

// Friendlier "nothing logged yet" treatment, replacing a bare gray text line.
export default function EmptyState({ message, icon = 'restaurant-outline', testID }: Props) {
  return (
    <View testID={testID} style={styles.container}>
      <Ionicons name={icon} size={28} color={colors.textMuted} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
