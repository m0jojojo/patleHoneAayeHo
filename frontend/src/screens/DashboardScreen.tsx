import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomNavBar from '../components/BottomNavBar';
import CalendarModal from '../components/CalendarModal';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import MacroSummaryCard from '../components/MacroSummaryCard';
import MealLogCard from '../components/MealLogCard';
import PillButton from '../components/PillButton';
import SectionLabel from '../components/SectionLabel';
import { formatDateForDisplay, todayDateString } from '../dateUtils';
import { deleteMeal, getTodaySummary, type TodaySummary } from '../meals/api';
import { dismissRecommendation, getCurrentRecommendation, type Recommendation } from '../recommendations/api';
import { colors, spacing, typography } from '../theme/tokens';

interface Props {
  onScanMeal: () => void;
  onOpenSettings: () => void;
  onOpenTodayDetail: (date: string) => void;
}

export default function DashboardScreen({ onScanMeal, onOpenSettings, onOpenTodayDetail }: Props) {
  const [selectedDate, setSelectedDate] = useState(() => todayDateString());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [frequencyPromptFor, setFrequencyPromptFor] = useState<string | null>(null);

  const isToday = selectedDate === todayDateString();

  useEffect(() => {
    getTodaySummary(selectedDate)
      .then(setSummary)
      .catch(() => setError("Couldn't load today's totals."));
  }, [selectedDate]);

  // Recommendations are always about today's remaining protein gap - independent of whichever
  // past date the calendar happens to be showing, so this only ever needs to run once.
  useEffect(() => {
    getCurrentRecommendation()
      .then(({ recommendation: current }) => setRecommendation(current))
      .catch(() => undefined);
  }, []);

  function handleDeleteMeal(mealId: string) {
    Alert.alert('Delete this meal?', 'This removes it from today\'s log. This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal(mealId);
            // Refetch rather than recompute macros locally - keeps the totals and meal list
            // guaranteed consistent with what the backend actually has.
            const refreshed = await getTodaySummary(selectedDate);
            setSummary(refreshed);
          } catch {
            Alert.alert("Couldn't delete that meal. Please try again.");
          }
        },
      },
    ]);
  }

  async function handleDismiss() {
    if (!recommendation || dismissing) return;
    setDismissing(true);
    try {
      const result = await dismissRecommendation(recommendation.proteinType);
      setFrequencyPromptFor(result.suggestFrequencyPrompt ? recommendation.proteinLabel : null);
      setRecommendation(null);
    } catch {
      // Leave the card up - the user can try dismissing again.
    } finally {
      setDismissing(false);
    }
  }

  if (error) {
    return (
      <View style={styles.screen} testID="dashboard-screen">
        <View style={styles.centered}>
          <Text testID="dashboard-error" style={styles.error}>
            {error}
          </Text>
          <PillButton testID="scan-meal-button" label="Scan a meal" variant="solid" onPress={onScanMeal} />
        </View>
        <BottomNavBar onAdd={onScanMeal} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.screen} testID="dashboard-screen">
        <View style={styles.centered}>
          <ActivityIndicator testID="dashboard-loading" />
        </View>
        <BottomNavBar onAdd={onScanMeal} />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="dashboard-screen">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable testID="open-settings-button" onPress={onOpenSettings} style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.textOnDark} />
          </Pressable>
          <Text style={styles.title}>{isToday ? 'Today' : formatDateForDisplay(selectedDate)}</Text>
          <Pressable testID="open-calendar-button" onPress={() => setCalendarVisible(true)} style={styles.iconButton}>
            <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <MacroSummaryCard
          consumed={summary.consumed}
          targets={summary.targets}
          onScanMeal={onScanMeal}
          dateLabel={isToday ? 'Eaten today' : `Eaten on ${formatDateForDisplay(selectedDate)}`}
        />

        {recommendation && isToday ? (
          <Card testID="recommendation-card" style={styles.bannerCard}>
            <Text style={styles.bannerText}>{recommendation.message}</Text>
            <PillButton
              testID="dismiss-recommendation-button"
              label="Dismiss"
              onPress={handleDismiss}
              disabled={dismissing}
            />
          </Card>
        ) : null}

        {frequencyPromptFor && isToday ? (
          <Card testID="frequency-prompt" style={styles.bannerCard}>
            <Text style={styles.bannerText}>Want to adjust how often we suggest {frequencyPromptFor}?</Text>
            <PillButton
              testID="adjust-frequency-button"
              label="Adjust"
              onPress={() => {
                setFrequencyPromptFor(null);
                onOpenSettings();
              }}
            />
          </Card>
        ) : null}

        <Pressable
          testID="open-today-detail-button"
          style={styles.sectionHeaderRow}
          onPress={() => onOpenTodayDetail(selectedDate)}
        >
          <SectionLabel label={isToday ? 'Logged today' : `Logged on ${formatDateForDisplay(selectedDate)}`} icon="restaurant" />
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
        {summary.meals.length === 0 ? (
          <EmptyState testID="no-meals-text" message="Nothing logged yet." />
        ) : (
          summary.meals.map((meal) => (
            <MealLogCard
              key={meal.id}
              testID={`meal-row-${meal.id}`}
              meal={meal}
              onDelete={() => handleDeleteMeal(meal.id)}
            />
          ))
        )}
      </ScrollView>
      <BottomNavBar onAdd={onScanMeal} />
      {calendarVisible ? (
        <CalendarModal
          testID="dashboard-calendar-modal"
          selectedDate={selectedDate}
          onCancel={() => setCalendarVisible(false)}
          onConfirm={(date) => {
            setSelectedDate(date);
            setCalendarVisible(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: Constants.statusBarHeight },
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.title, color: colors.textPrimary },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bannerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  bannerText: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  error: { color: colors.danger },
});
