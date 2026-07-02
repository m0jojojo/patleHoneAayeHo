import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { requestOtp } from "../auth/api";

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

interface Props {
	onOtpRequested: (phoneNumber: string) => void;
}

export default function PhoneEntryScreen({ onOtpRequested }: Props) {
	const [phoneNumber, setPhoneNumber] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const isValid = PHONE_REGEX.test(phoneNumber);

	async function handleSubmit() {
		if (!isValid || submitting) return;
		setSubmitting(true);
		setError(null);
		try {
			await requestOtp(phoneNumber);
			onOtpRequested(phoneNumber);
		} catch {
			setError("Couldn't send the code. Please try again.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<View style={styles.container} testID="phone-entry-screen">
			<Text style={styles.title}>Enter your phone number</Text>
			<TextInput
				testID="phone-input"
				style={styles.input}
				placeholder="+919876543210"
				keyboardType="phone-pad"
				autoComplete="tel"
				value={phoneNumber}
				onChangeText={setPhoneNumber}
			/>
			{error ? (
				<Text testID="phone-error" style={styles.error}>
					{error}
				</Text>
			) : null}
			<Pressable
				testID="send-otp-button"
				style={[styles.button, (!isValid || submitting) && styles.buttonDisabled]}
				onPress={handleSubmit}
				disabled={!isValid || submitting}
			>
				{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
	title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
	input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
	button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center" },
	buttonDisabled: { opacity: 0.4 },
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
	error: { color: "#c00" },
});
