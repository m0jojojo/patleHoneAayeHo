import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSessionToken, saveSessionToken } from './src/auth/session';
import type { ScanResult } from './src/meals/api';
import { getOnboardingStatus, type OnboardingStatus } from './src/onboarding/api';
import type { DietType } from './src/onboarding/constants';
import BodyStatsScreen from './src/screens/BodyStatsScreen';
import DietTypeScreen from './src/screens/DietTypeScreen';
import GoalScreen from './src/screens/GoalScreen';
import MealResultsScreen from './src/screens/MealResultsScreen';
import MealScanScreen from './src/screens/MealScanScreen';
import OnboardingCompleteScreen from './src/screens/OnboardingCompleteScreen';
import OtpEntryScreen from './src/screens/OtpEntryScreen';
import PhoneEntryScreen from './src/screens/PhoneEntryScreen';
import ProteinPreferencesScreen from './src/screens/ProteinPreferencesScreen';

type Step =
  | { screen: 'checking' }
  | { screen: 'phone' }
  | { screen: 'otp'; phoneNumber: string }
  | { screen: 'loadingOnboarding' }
  | { screen: 'goal' }
  | { screen: 'dietType' }
  | { screen: 'proteinPreferences'; dietType: DietType }
  | { screen: 'bodyStats' }
  | { screen: 'onboardingComplete' }
  | { screen: 'home' }
  | { screen: 'mealScan' }
  | { screen: 'mealResults'; scanResult: ScanResult };

// Determines where a signed-in user should resume, so backing out mid-onboarding and
// returning picks up where they left off instead of restarting from Screen 1.
function resolveOnboardingStep(status: OnboardingStatus): Step {
  if (!status.goal) return { screen: 'goal' };
  if (!status.dietType) return { screen: 'dietType' };
  if (status.proteinPreferences.length === 0) {
    return { screen: 'proteinPreferences', dietType: status.dietType };
  }
  if (!status.bodyStats) return { screen: 'bodyStats' };
  if (!status.completed) return { screen: 'onboardingComplete' };
  return { screen: 'home' };
}

export default function App() {
  const [step, setStep] = useState<Step>({ screen: 'checking' });

  async function resumeOnboarding() {
    setStep({ screen: 'loadingOnboarding' });
    const status = await getOnboardingStatus();
    setStep(resolveOnboardingStep(status));
  }

  useEffect(() => {
    getSessionToken().then((token) => {
      if (token) {
        resumeOnboarding();
      } else {
        setStep({ screen: 'phone' });
      }
    });
  }, []);

  if (step.screen === 'checking' || step.screen === 'loadingOnboarding') {
    return (
      <View style={styles.container} testID="checking-screen">
        <StatusBar style="auto" />
      </View>
    );
  }

  if (step.screen === 'phone') {
    return (
      <>
        <PhoneEntryScreen onOtpRequested={(phoneNumber) => setStep({ screen: 'otp', phoneNumber })} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'otp') {
    return (
      <>
        <OtpEntryScreen
          phoneNumber={step.phoneNumber}
          onVerified={async (token) => {
            await saveSessionToken(token);
            await resumeOnboarding();
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'goal') {
    return (
      <>
        <GoalScreen onNext={() => setStep({ screen: 'dietType' })} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'dietType') {
    return (
      <>
        <DietTypeScreen onNext={(dietType) => setStep({ screen: 'proteinPreferences', dietType })} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'proteinPreferences') {
    return (
      <>
        <ProteinPreferencesScreen dietType={step.dietType} onNext={() => setStep({ screen: 'bodyStats' })} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'bodyStats') {
    return (
      <>
        <BodyStatsScreen onNext={() => setStep({ screen: 'onboardingComplete' })} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'onboardingComplete') {
    return (
      <>
        <OnboardingCompleteScreen onComplete={() => setStep({ screen: 'home' })} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'mealScan') {
    return (
      <>
        <MealScanScreen onScanned={(scanResult) => setStep({ screen: 'mealResults', scanResult })} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (step.screen === 'mealResults') {
    return (
      <>
        <MealResultsScreen scanResult={step.scanResult} onLogged={() => setStep({ screen: 'home' })} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <View style={styles.container} testID="home-screen">
      <Text>You're all set.</Text>
      <Pressable testID="scan-meal-button" style={styles.button} onPress={() => setStep({ screen: 'mealScan' })}>
        <Text style={styles.buttonText}>Scan a meal</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  button: { backgroundColor: '#111', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
