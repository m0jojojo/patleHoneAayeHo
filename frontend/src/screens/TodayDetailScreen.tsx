import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MealTypeSection from '../components/MealTypeSection';
import { formatDateForDisplay, todayDateString } from '../dateUtils';
import { deleteMeal, getTodaySummary, type TodaySummary } from '../meals/api';
import { MEAL_TYPES } from '../meals/mealTypes';
import { colors, spacing, typography } from '../theme/tokens';

interface Props {
  onBack: () => void;
  // Defaults to real "today" - passed explicitly when drilling in from a past-date Dashboard view,
  // so this screen shows the same day rather than always today's meals.
  date?: string;
}

// Full-day breakdown reached by tapping into the "Logged today" section on the Dashboard - groups
// the same data Dashboard already fetches into the 5 meal-type slots instead of one flat list.
export default function TodayDetailScreen({ onBack, date = todayDateString() }: Props) {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isToday = date === todayDateString();

  const load = useCallback(() => {
    getTodaySummary(date)
      .then(setSummary)
      .catch(() => setError("Couldn't load today's meals."));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  function handleDeleteMeal(mealId: string) {
    Alert.alert('Delete this meal?', "This removes it from today's log. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal(mealId);
            load();
          } catch {
            Alert.alert("Couldn't delete that meal. Please try again.");
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen} testID="today-detail-screen">
      <View style={styles.header}>
        <Pressable testID="today-detail-back-button" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{isToday ? 'Today' : formatDateForDisplay(date)}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {error ? (
        <Text testID="today-detail-error" style={styles.error}>
          {error}
        </Text>
      ) : !summary ? (
        <ActivityIndicator testID="today-detail-loading" />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {MEAL_TYPES.map((mealType) => (
            <MealTypeSection
              key={mealType}
              testID={`meal-type-section-${mealType}`}
              mealType={mealType}
              meals={summary.meals.filter((meal) => meal.mealType === mealType)}
              onDeleteMeal={handleDeleteMeal}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: Constants.statusBarHeight },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  headerSpacer: { width: 24 },
  title: { ...typography.title, color: colors.textPrimary },
  container: { padding: spacing.lg, gap: spacing.lg },
  error: { color: colors.danger, padding: spacing.lg },
});
