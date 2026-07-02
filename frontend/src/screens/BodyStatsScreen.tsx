import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { saveBodyStats } from '../onboarding/api';
import {
  ACTIVITY_LEVEL_LABELS,
  ACTIVITY_LEVELS,
  SEX_LABELS,
  SEXES,
  type ActivityLevel,
  type Sex,
} from '../onboarding/constants';
import { validateBodyStats } from '../onboarding/validation';

interface Props {
  onNext: () => void;
}

export default function BodyStatsScreen({ onNext }: Props) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;

    const parsed = { height: Number(height), weight: Number(weight), age: Number(age) };
    if (!activityLevel) {
      setError('Please select an activity level.');
      return;
    }
    if (!sex) {
      setError('Please select your sex.');
      return;
    }

    const validationError = validateBodyStats(parsed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await saveBodyStats({ ...parsed, activityLevel, sex });
      onNext();
    } catch {
      setError("Couldn't save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="body-stats-screen">
      <Text style={styles.title}>Tell us about yourself</Text>

      <Text style={styles.label}>Sex</Text>
      {SEXES.map((option) => (
        <Pressable
          key={option}
          testID={`sex-option-${option}`}
          style={[styles.option, sex === option && styles.optionSelected]}
          onPress={() => setSex(option)}
        >
          <Text style={styles.optionText}>{SEX_LABELS[option]}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput
        testID="height-input"
        style={styles.input}
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        testID="weight-input"
        style={styles.input}
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput testID="age-input" style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />

      <Text style={styles.label}>Activity level</Text>
      {ACTIVITY_LEVELS.map((level) => (
        <Pressable
          key={level}
          testID={`activity-level-option-${level}`}
          style={[styles.option, activityLevel === level && styles.optionSelected]}
          onPress={() => setActivityLevel(level)}
        >
          <Text style={styles.optionText}>{ACTIVITY_LEVEL_LABELS[level]}</Text>
        </Pressable>
      ))}

      {error ? (
        <Text testID="body-stats-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Pressable
        testID="body-stats-continue-button"
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 14, color: '#666', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  option: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  optionSelected: { borderColor: '#111', backgroundColor: '#f5f5f5' },
  optionText: { fontSize: 14 },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c00' },
});
