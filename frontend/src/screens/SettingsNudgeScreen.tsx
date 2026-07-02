import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  onSetPreferences: () => void;
  onSkip: () => void;
}

export default function SettingsNudgeScreen({ onSetPreferences, onSkip }: Props) {
  return (
    <View style={styles.container} testID="settings-nudge-screen">
      <Text style={styles.title}>Nice, your first meal is logged!</Text>
      <Text style={styles.body}>
        Want to tell us how often you eat each protein? It only takes a minute, and helps us
        suggest the right things at the right time.
      </Text>
      <Pressable testID="set-preferences-button" style={styles.button} onPress={onSetPreferences}>
        <Text style={styles.buttonText}>Set preferences</Text>
      </Pressable>
      <Pressable testID="skip-nudge-button" onPress={onSkip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 16, color: '#444', lineHeight: 22 },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipText: { textAlign: 'center', color: '#666' },
});
