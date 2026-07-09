import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomNavBar from '../components/BottomNavBar';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import MacroSummaryCard from '../components/MacroSummaryCard';
import MealLogCard from '../components/MealLogCard';
import PillButton from '../components/PillButton';
import SectionLabel from '../components/SectionLabel';
import { deleteMeal, getTodaySummary, type TodaySummary } from '../meals/api';
import { dismissRecommendation, getCurrentRecommendation, type Recommendation } from '../recommendations/api';
import { colors, spacing, typography } from '../theme/tokens';

interface Props {
  onScanMeal: () => void;
  onOpenSettings: () => void;
  onOpenTodayDetail: () => void;
}

export default function DashboardScreen({ onScanMeal, onOpenSettings, onOpenTodayDetail }: Props) {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [frequencyPromptFor, setFrequencyPromptFor] = useState<string | null>(null);

  useEffect(() => {
    getTodaySummary()
      .then(setSummary)
      .catch(() => setError("Couldn't load today's totals."));
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
            const refreshed = await getTodaySummary();
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
          <Text style={styles.title}>Today</Text>
          <PillButton testID="open-settings-button" label="My Proteins" onPress={onOpenSettings} />
        </View>

        <MacroSummaryCard consumed={summary.consumed} targets={summary.targets} onScanMeal={onScanMeal} />

        {recommendation ? (
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

        {frequencyPromptFor ? (
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

        <Pressable testID="open-today-detail-button" style={styles.sectionHeaderRow} onPress={onOpenTodayDetail}>
          <SectionLabel label="Logged today" icon="restaurant" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: Constants.statusBarHeight },
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.title, color: colors.textPrimary },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bannerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  bannerText: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  error: { color: colors.danger },
});
