import { SELF } from "cloudflare:test";
import { requestOtp } from "../../src/auth/otp";

// Signs up (or logs in) a fresh user via the real OTP flow and returns a valid session token,
// so onboarding tests exercise the endpoints exactly as an authenticated client would.
export async function signUpAndGetToken(db: D1Database, phoneNumber: string): Promise<string> {
	const { code } = await requestOtp(db, phoneNumber);
	const response = await SELF.fetch("https://example.com/auth/otp/verify", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ phoneNumber, code }),
	});
	const { token } = await response.json<{ token: string }>();
	return token;
}
