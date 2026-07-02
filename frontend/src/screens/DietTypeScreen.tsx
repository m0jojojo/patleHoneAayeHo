import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { saveDietType } from '../onboarding/api';
import { DIET_TYPE_LABELS, DIET_TYPES, type DietType } from '../onboarding/constants';

interface Props {
  onNext: (dietType: DietType) => void;
}

export default function DietTypeScreen({ onNext }: Props) {
  const [selected, setSelected] = useState<DietType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(dietType: DietType) {
    if (submitting) return;
    setSelected(dietType);
    setSubmitting(true);
    setError(null);
    try {
      await saveDietType(dietType);
      onNext(dietType);
    } catch {
      setError("Couldn't save your diet type. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container} testID="diet-type-screen">
      <Text style={styles.title}>What do you eat?</Text>
      {DIET_TYPES.map((dietType) => (
        <Pressable
          key={dietType}
          testID={`diet-type-option-${dietType}`}
          style={[styles.option, selected === dietType && styles.optionSelected]}
          onPress={() => handleSelect(dietType)}
          disabled={submitting}
        >
          <Text style={styles.optionText}>{DIET_TYPE_LABELS[dietType]}</Text>
          {submitting && selected === dietType ? <ActivityIndicator /> : null}
        </Pressable>
      ))}
      {error ? (
        <Text testID="diet-type-error" style={styles.error}>
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
