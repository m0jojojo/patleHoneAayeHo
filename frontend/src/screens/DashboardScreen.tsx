import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTodaySummary, type TodaySummary } from '../meals/api';
import { dismissRecommendation, getCurrentRecommendation, type Recommendation } from '../recommendations/api';

interface Props {
  onScanMeal: () => void;
}

function MacroRow({ label, consumed, target }: { label: string; consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(1, Math.max(0, consumed / target)) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text testID={`macro-value-${label}`} style={styles.macroValue}>
          {Math.round(consumed)} / {Math.round(target)}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

export default function DashboardScreen({ onScanMeal }: Props) {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    getTodaySummary()
      .then(setSummary)
      .catch(() => setError("Couldn't load today's totals."));
    getCurrentRecommendation()
      .then(({ recommendation: current }) => setRecommendation(current))
      .catch(() => undefined);
  }, []);

  async function handleDismiss() {
    if (!recommendation || dismissing) return;
    setDismissing(true);
    try {
      await dismissRecommendation(recommendation.proteinType);
      setRecommendation(null);
    } catch {
      // Leave the card up - the user can try dismissing again.
    } finally {
      setDismissing(false);
    }
  }

  if (error) {
    return (
      <View style={styles.container} testID="dashboard-screen">
        <Text testID="dashboard-error" style={styles.error}>
          {error}
        </Text>
        <Pressable testID="scan-meal-button" style={styles.button} onPress={onScanMeal}>
          <Text style={styles.buttonText}>Scan a meal</Text>
        </Pressable>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.container} testID="dashboard-screen">
        <ActivityIndicator testID="dashboard-loading" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="dashboard-screen">
      <Text style={styles.title}>Today</Text>

      <MacroRow label="Calories" consumed={summary.consumed.calories} target={summary.targets.calories} />
      <MacroRow label="Protein (g)" consumed={summary.consumed.proteinG} target={summary.targets.proteinG} />
      <MacroRow label="Carbs (g)" consumed={summary.consumed.carbsG} target={summary.targets.carbsG} />
      <MacroRow label="Fat (g)" consumed={summary.consumed.fatG} target={summary.targets.fatG} />

      {recommendation ? (
        <View testID="recommendation-card" style={styles.recommendationCard}>
          <Text style={styles.recommendationText}>{recommendation.message}</Text>
          <Pressable testID="dismiss-recommendation-button" onPress={handleDismiss} disabled={dismissing}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable testID="scan-meal-button" style={styles.button} onPress={onScanMeal}>
        <Text style={styles.buttonText}>Scan a meal</Text>
      </Pressable>

      <Text style={styles.subtitle}>Logged today</Text>
      {summary.meals.length === 0 ? (
        <Text testID="no-meals-text" style={styles.emptyText}>
          Nothing logged yet.
        </Text>
      ) : (
        summary.meals.map((meal) => (
          <View key={meal.id} testID={`meal-row-${meal.id}`} style={styles.mealRow}>
            <Text style={styles.mealLabel}>{meal.dishLabels.join(', ')}</Text>
            <Text style={styles.mealCalories}>{Math.round(meal.macros.calories)} kcal</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  macroRow: { marginBottom: 12 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { fontSize: 14, color: '#444' },
  macroValue: { fontSize: 14, color: '#444' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#eee', marginTop: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#111', borderRadius: 4 },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  recommendationCard: {
    backgroundColor: '#f5f5e8',
    borderWidth: 1,
    borderColor: '#ddd6b0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationText: { fontSize: 14, flexShrink: 1, marginRight: 8 },
  dismissText: { fontSize: 13, color: '#666', fontWeight: '600' },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  mealLabel: { fontSize: 14, flexShrink: 1 },
  mealCalories: { fontSize: 14, color: '#666' },
  emptyText: { fontSize: 14, color: '#666', marginTop: 8 },
  error: { color: '#c00', marginBottom: 12 },
});
