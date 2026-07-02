import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { saveProteinPreferences } from '../onboarding/api';
import { getAllowedProteinTypes, type DietType } from '../onboarding/constants';

interface Props {
  dietType: DietType;
  onNext: (proteinIds: string[]) => void;
}

export default function ProteinPreferencesScreen({ dietType, onNext }: Props) {
  const options = getAllowedProteinTypes(dietType);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(proteinId: string) {
    if (submitting) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(proteinId)) {
        next.delete(proteinId);
      } else {
        next.add(proteinId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    const proteinIds = Array.from(selected);
    try {
      await saveProteinPreferences(proteinIds);
      onNext(proteinIds);
    } catch {
      setError("Couldn't save your protein preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container} testID="protein-preferences-screen">
      <Text style={styles.title}>Which proteins do you already eat?</Text>
      <Text style={styles.subtitle}>Select all that apply. We&apos;ll only ever suggest from these.</Text>
      {options.map((protein) => {
        const isSelected = selected.has(protein.id);
        return (
          <Pressable
            key={protein.id}
            testID={`protein-option-${protein.id}`}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => toggle(protein.id)}
            disabled={submitting}
          >
            <Text style={styles.optionText}>{protein.label}</Text>
            <Text style={styles.checkbox}>{isSelected ? '✓' : ''}</Text>
          </Pressable>
        );
      })}
      {error ? (
        <Text testID="protein-preferences-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        testID="protein-preferences-continue-button"
        style={[styles.button, (selected.size === 0 || submitting) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={selected.size === 0 || submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
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
  checkbox: { fontSize: 16, fontWeight: '700' },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c00' },
});
