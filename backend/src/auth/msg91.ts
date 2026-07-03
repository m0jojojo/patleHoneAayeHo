// Real OTP delivery via MSG91 (see docs/auth.md for why MSG91 specifically: unlike many
// international SMS routes, it reliably delivers to Indian numbers without needing a separate
// DLT-registered sender template for OTP-specific messages).
//
// Uses MSG91's OTP API with our own pre-generated code (not MSG91's auto-generated one), since
// our own OTP hashing/rate-limiting/expiry logic (backend/src/auth/otp.ts) already owns the code
// end to end - MSG91 here is purely the delivery channel.
const MSG91_OTP_ENDPOINT = "https://control.msg91.com/api/v5/otp";

export async function sendOtpViaMsg91(authKey: string, phoneNumber: string, code: string): Promise<void> {
	const mobile = phoneNumber.replace(/^\+/, "");

	const response = await fetch(MSG91_OTP_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			authkey: authKey,
		},
		body: JSON.stringify({
			mobile,
			otp: code,
			otp_expiry: 5, // minutes - keep in sync with OTP_EXPIRY_MINUTES in auth/otp.ts
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`MSG91 send failed: ${response.status} ${body}`);
	}
}
