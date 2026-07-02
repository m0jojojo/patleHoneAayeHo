import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { completeOnboarding } from '../onboarding/api';

interface Props {
  onComplete: () => void;
}

export default function OnboardingCompleteScreen({ onComplete }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding();
      onComplete();
    } catch {
      setError("Couldn't get things started. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container} testID="onboarding-complete-screen">
      <Text style={styles.title}>We won&apos;t ask you to eat differently.</Text>
      <Text style={styles.body}>
        Every suggestion we make is something you already eat. We just help you fit a little more of it in when
        you&apos;re short on protein for the day.
      </Text>
      {error ? (
        <Text testID="onboarding-complete-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        testID="start-scanning-button"
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start scanning</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 16, color: '#444', lineHeight: 22 },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c00' },
});
