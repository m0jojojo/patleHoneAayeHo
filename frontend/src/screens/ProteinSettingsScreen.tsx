import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FREQUENCY_COMFORT_LABELS, FREQUENCY_COMFORT_LEVELS, type FrequencyComfort } from '../onboarding/constants';
import { getProteinSettings, setProteinFrequency, type ProteinPreferenceSetting } from '../settings/api';

interface Props {
  onDone: () => void;
}

export default function ProteinSettingsScreen({ onDone }: Props) {
  const [preferences, setPreferences] = useState<ProteinPreferenceSetting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingProteinType, setSavingProteinType] = useState<string | null>(null);

  useEffect(() => {
    getProteinSettings()
      .then(({ preferences: prefs }) => setPreferences(prefs))
      .catch(() => setError("Couldn't load your protein settings."));
  }, []);

  async function handleSelect(proteinType: string, frequencyComfort: FrequencyComfort) {
    if (savingProteinType) return;
    setSavingProteinType(proteinType);
    setError(null);
    try {
      await setProteinFrequency(proteinType, frequencyComfort);
      setPreferences(
        (current) =>
          current?.map((preference) =>
            preference.proteinType === proteinType
              ? { ...preference, frequencyComfort, source: 'explicit' as const }
              : preference,
          ) ?? null,
      );
    } catch {
      setError("Couldn't save that. Please try again.");
    } finally {
      setSavingProteinType(null);
    }
  }

  if (error && !preferences) {
    return (
      <View style={styles.container} testID="protein-settings-screen">
        <Text testID="protein-settings-error" style={styles.error}>
          {error}
        </Text>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.container} testID="protein-settings-screen">
        <ActivityIndicator testID="protein-settings-loading" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="protein-settings-screen">
      <Text style={styles.title}>My Proteins</Text>
      <Text style={styles.subtitle}>How often do you want us to suggest each of these?</Text>

      {error ? (
        <Text testID="protein-settings-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {preferences.map((preference) => (
        <View key={preference.proteinType} testID={`protein-row-${preference.proteinType}`} style={styles.row}>
          <Text style={styles.rowLabel}>{preference.proteinLabel}</Text>
          <View style={styles.options}>
            {FREQUENCY_COMFORT_LEVELS.map((level) => (
              <Pressable
                key={level}
                testID={`frequency-option-${preference.proteinType}-${level}`}
                style={[styles.option, preference.frequencyComfort === level && styles.optionSelected]}
                onPress={() => handleSelect(preference.proteinType, level)}
                disabled={savingProteinType === preference.proteinType}
              >
                <Text style={[styles.optionText, preference.frequencyComfort === level && styles.optionTextSelected]}>
                  {FREQUENCY_COMFORT_LABELS[level]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable testID="protein-settings-done-button" style={styles.button} onPress={onDone}>
        <Text style={styles.buttonText}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  row: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginTop: 8 },
  rowLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  options: { flexDirection: 'row', gap: 8 },
  option: { borderWidth: 1, borderColor: '#111', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  optionSelected: { backgroundColor: '#111' },
  optionText: { fontSize: 13 },
  optionTextSelected: { color: '#fff' },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c00', marginBottom: 12 },
});
