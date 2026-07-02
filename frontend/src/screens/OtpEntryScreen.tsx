import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { requestOtp, verifyOtp } from "../auth/api";

export const OTP_EXPIRY_SECONDS = 5 * 60;
export const RESEND_COOLDOWN_SECONDS = 30;

interface Props {
	phoneNumber: string;
	onVerified: (token: string) => void;
}

function formatTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function OtpEntryScreen({ phoneNumber, onVerified }: Props) {
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [resending, setResending] = useState(false);
	const [secondsUntilExpiry, setSecondsUntilExpiry] = useState(OTP_EXPIRY_SECONDS);
	const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

	useEffect(() => {
		const interval = setInterval(() => {
			setSecondsUntilExpiry((seconds) => Math.max(0, seconds - 1));
			setResendCooldown((seconds) => Math.max(0, seconds - 1));
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const isValid = /^\d{6}$/.test(code);
	const expired = secondsUntilExpiry === 0;

	async function handleSubmit() {
		if (!isValid || submitting) return;
		setSubmitting(true);
		setError(null);
		try {
			const { token } = await verifyOtp(phoneNumber, code);
			onVerified(token);
		} catch {
			setError("Incorrect or expired code. Please try again.");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleResend() {
		if (resendCooldown > 0 || resending) return;
		setResending(true);
		setError(null);
		try {
			await requestOtp(phoneNumber);
			setSecondsUntilExpiry(OTP_EXPIRY_SECONDS);
			setResendCooldown(RESEND_COOLDOWN_SECONDS);
			setCode("");
		} catch {
			setError("Couldn't resend the code. Please try again.");
		} finally {
			setResending(false);
		}
	}

	return (
		<View style={styles.container} testID="otp-entry-screen">
			<Text style={styles.title}>Enter the code sent to {phoneNumber}</Text>
			<TextInput
				testID="otp-input"
				style={styles.input}
				placeholder="123456"
				keyboardType="number-pad"
				maxLength={6}
				value={code}
				onChangeText={setCode}
			/>
			<Text testID="otp-expiry" style={styles.countdown}>
				{expired ? "Code expired" : `Expires in ${formatTime(secondsUntilExpiry)}`}
			</Text>
			{error ? (
				<Text testID="otp-error" style={styles.error}>
					{error}
				</Text>
			) : null}
			<Pressable
				testID="verify-otp-button"
				style={[styles.button, (!isValid || submitting) && styles.buttonDisabled]}
				onPress={handleSubmit}
				disabled={!isValid || submitting}
			>
				{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
			</Pressable>
			<Pressable testID="resend-otp-button" onPress={handleResend} disabled={resendCooldown > 0 || resending}>
				<Text style={styles.resendText}>
					{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
	title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		padding: 12,
		fontSize: 24,
		letterSpacing: 8,
		textAlign: "center",
	},
	countdown: { textAlign: "center", color: "#666" },
	button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center" },
	buttonDisabled: { opacity: 0.4 },
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
	resendText: { textAlign: "center", color: "#0066cc" },
	error: { color: "#c00" },
});
