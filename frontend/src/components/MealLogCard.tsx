import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LoggedMealSummary } from '../meals/api';
import { colors, radius, spacing, typography } from '../theme/tokens';
import Card from './Card';

interface Props {
  meal: LoggedMealSummary;
  onDelete?: () => void;
  testID?: string;
}

function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Card for one logged meal: time, calorie readout, dish list, and a small macro breakdown row.
// The delete button only renders when a caller supplies onDelete, so existing usage isn't forced
// to change.
export default function MealLogCard({ meal, onDelete, testID }: Props) {
  return (
    <Card testID={testID} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(meal.timestamp)}</Text>
        <View style={styles.headerRight}>
          <Text testID="meal-card-calories" style={styles.calories}>
            {Math.round(meal.macros.calories)} kcal
          </Text>
          {onDelete ? (
            <Pressable testID="meal-card-delete-button" onPress={onDelete} style={styles.deleteButton}>
              <Ionicons name="trash" size={16} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={styles.dishes}>{meal.dishLabels.join(', ')}</Text>
      <View style={styles.macroRow}>
        <Text style={styles.macroText}>P {Math.round(meal.macros.proteinG)}g</Text>
        <Text style={styles.macroText}>C {Math.round(meal.macros.carbsG)}g</Text>
        <Text style={styles.macroText}>F {Math.round(meal.macros.fatG)}g</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { ...typography.caption, color: colors.textMuted },
  calories: { ...typography.bodyBold, color: colors.textPrimary },
  dishes: { ...typography.body, color: colors.textPrimary },
  macroRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  macroText: { ...typography.caption, color: colors.textSecondary },
});
