import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { scanMeal, type ScanResult } from '../meals/api';

interface Props {
  onScanned: (result: ScanResult) => void;
}

async function pickAndScan(
  launch: () => Promise<ImagePicker.ImagePickerResult>,
  setScanning: (value: boolean) => void,
  setError: (value: string | null) => void,
  onScanned: (result: ScanResult) => void,
) {
  setError(null);
  const result = await launch();
  if (result.canceled || !result.assets[0]?.base64) return;

  setScanning(true);
  try {
    const scanResult = await scanMeal(result.assets[0].base64);
    onScanned(scanResult);
  } catch {
    // A network/API failure (not a vision-provider failure - the backend already handles that
    // gracefully and returns visionFailed:true). Fall through to manual entry rather than crash.
    onScanned({ visionFailed: true, dishes: [] });
  } finally {
    setScanning(false);
  }
}

export default function MealScanScreen({ onScanned }: Props) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is needed to scan a meal.');
      return;
    }
    await pickAndScan(
      () => ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 }),
      setScanning,
      setError,
      onScanned,
    );
  }

  async function handlePickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is needed to pick a meal photo.');
      return;
    }
    await pickAndScan(
      () => ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 }),
      setScanning,
      setError,
      onScanned,
    );
  }

  return (
    <View style={styles.container} testID="meal-scan-screen">
      <Text style={styles.title}>Scan your meal</Text>
      <Text style={styles.subtitle}>Take a photo, or pick one from your gallery.</Text>

      {error ? (
        <Text testID="meal-scan-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Pressable
        testID="take-photo-button"
        style={[styles.button, scanning && styles.buttonDisabled]}
        onPress={handleTakePhoto}
        disabled={scanning}
      >
        {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Take a photo</Text>}
      </Pressable>

      <Pressable
        testID="pick-photo-button"
        style={[styles.secondaryButton, scanning && styles.buttonDisabled]}
        onPress={handlePickFromLibrary}
        disabled={scanning}
      >
        <Text style={styles.secondaryButtonText}>Choose from gallery</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center' },
  secondaryButton: { borderWidth: 1, borderColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButtonText: { color: '#111', fontSize: 16, fontWeight: '600' },
  error: { color: '#c00' },
});
