import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getSessionToken, saveSessionToken } from './src/auth/session';
import OtpEntryScreen from './src/screens/OtpEntryScreen';
import PhoneEntryScreen from './src/screens/PhoneEntryScreen';

type AuthStep =
  | { screen: 'checking' }
  | { screen: 'phone' }
  | { screen: 'otp'; phoneNumber: string }
  | { screen: 'authenticated' };

export default function App() {
  const [step, setStep] = useState<AuthStep>({ screen: 'checking' });

  useEffect(() => {
    getSessionToken().then((token) => {
      setStep(token ? { screen: 'authenticated' } : { screen: 'phone' });
    });
  }, []);

  if (step.screen === 'checking') {
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
            setStep({ screen: 'authenticated' });
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <View style={styles.container} testID="authenticated-screen">
      <Text>You're signed in.</Text>
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
  },
});
