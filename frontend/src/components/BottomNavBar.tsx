import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

interface Props {
  onAdd: () => void;
  testID?: string;
}

const ADD_BUTTON_SIZE = 56;

// Simplified bottom nav: a static "Home" indicator (there's nowhere else to navigate to yet - no
// Diet/Coach/Streaks tabs, since this app doesn't have those sections) plus a centered, elevated
// "+" action button that triggers the same scan-meal action as the camera icon on
// MacroSummaryCard. Meant to sit below the scrollable content, not inside it, so it stays fixed.
export default function BottomNavBar({ onAdd, testID }: Props) {
  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.homeItem}>
        <Ionicons name="home" size={22} color={colors.brand} />
        <Text style={styles.homeLabel}>Home</Text>
      </View>
      <Pressable testID="bottom-nav-add-button" onPress={onAdd} style={styles.addButton}>
        <Ionicons name="add" size={28} color={colors.textOnDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  homeItem: { alignItems: 'center', gap: 2 },
  homeLabel: { ...typography.caption, color: colors.brand, fontWeight: '600' },
  addButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -ADD_BUTTON_SIZE / 2,
    top: -spacing.sm,
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
});
