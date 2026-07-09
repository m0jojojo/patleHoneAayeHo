import { StyleSheet, Text, View } from 'react-native';
import type { LoggedMealSummary } from '../meals/api';
import { MEAL_TYPE_LABELS, type MealType } from '../meals/mealTypes';
import { colors, spacing, typography } from '../theme/tokens';
import EmptyState from './EmptyState';
import MealLogCard from './MealLogCard';

interface Props {
  mealType: MealType;
  meals: LoggedMealSummary[];
  onDeleteMeal: (mealId: string) => void;
  testID?: string;
}

// One meal-type slot (Breakfast/Morning Snack/Lunch/Evening Snack/Dinner): a header showing the
// slot's total calories, then either its logged meals or an empty-state placeholder.
export default function MealTypeSection({ mealType, meals, onDeleteMeal, testID }: Props) {
  const consumedCalories = meals.reduce((sum, meal) => sum + meal.macros.calories, 0);

  return (
    <View testID={testID} style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.label}>{MEAL_TYPE_LABELS[mealType]}</Text>
        <Text style={styles.calories}>{Math.round(consumedCalories)} Cal</Text>
      </View>

      {meals.length === 0 ? (
        <EmptyState message={`Nothing logged for ${MEAL_TYPE_LABELS[mealType].toLowerCase()} yet.`} />
      ) : (
        meals.map((meal) => (
          <MealLogCard
            key={meal.id}
            testID={`meal-type-section-row-${meal.id}`}
            meal={meal}
            onDelete={() => onDeleteMeal(meal.id)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...typography.subtitle, color: colors.textPrimary },
  calories: { ...typography.body, color: colors.textSecondary },
});
