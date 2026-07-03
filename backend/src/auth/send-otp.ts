import { sendOtpViaMsg91 } from "./msg91";

// Picks the real MSG91 sender when a key is configured (production, once set via
// `wrangler secret put MSG91_AUTH_KEY`); otherwise returns undefined so requestOtp falls back to
// its own console.log stub (local dev, or before MSG91 is set up) - same on/off switch pattern as
// the Gemini vision provider.
export function createSendOtp(msg91AuthKey: string | undefined): ((phoneNumber: string, code: string) => Promise<void>) | undefined {
	if (!msg91AuthKey) return undefined;

	return async (phoneNumber, code) => {
		try {
			await sendOtpViaMsg91(msg91AuthKey, phoneNumber, code);
		} catch (error) {
			// Don't fail the request if delivery fails - the code is already stored/hashed, so it
			// can still be relayed manually (e.g. via `wrangler tail`) as a fallback while MSG91 is
			// being set up.
			console.error("MSG91 send failed, falling back to log:", error);
			console.log(`[otp] ${phoneNumber} -> ${code}`);
		}
	};
}
