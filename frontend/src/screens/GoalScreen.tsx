import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { saveGoal } from '../onboarding/api';
import { GOAL_LABELS, GOALS, type Goal } from '../onboarding/constants';

interface Props {
  onNext: (goal: Goal) => void;
}

export default function GoalScreen({ onNext }: Props) {
  const [selected, setSelected] = useState<Goal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(goal: Goal) {
    if (submitting) return;
    setSelected(goal);
    setSubmitting(true);
    setError(null);
    try {
      await saveGoal(goal);
      onNext(goal);
    } catch {
      setError("Couldn't save your goal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container} testID="goal-screen">
      <Text style={styles.title}>What&apos;s your goal?</Text>
      {GOALS.map((goal) => (
        <Pressable
          key={goal}
          testID={`goal-option-${goal}`}
          style={[styles.option, selected === goal && styles.optionSelected]}
          onPress={() => handleSelect(goal)}
          disabled={submitting}
        >
          <Text style={styles.optionText}>{GOAL_LABELS[goal]}</Text>
          {submitting && selected === goal ? <ActivityIndicator /> : null}
        </Pressable>
      ))}
      {error ? (
        <Text testID="goal-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  option: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionSelected: { borderColor: '#111', backgroundColor: '#f5f5f5' },
  optionText: { fontSize: 16 },
  error: { color: '#c00' },
});
