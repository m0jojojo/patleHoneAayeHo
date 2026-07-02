import { HttpError } from "./errors";
import { generateOtpCode, sha256Hex } from "./crypto";

export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_VERIFY_ATTEMPTS = 5;
export const OTP_RATE_LIMIT_MAX = 5;
export const OTP_RATE_LIMIT_WINDOW_MINUTES = 60;

// E.164: a leading +, then 8-15 digits total, first digit non-zero. e.g. +919876543210
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export function isValidPhoneNumber(phoneNumber: string): boolean {
	return PHONE_REGEX.test(phoneNumber);
}

export interface RequestOtpOptions {
	now?: Date;
	generateCode?: () => string;
	sendOtp?: (phoneNumber: string, code: string) => void | Promise<void>;
}

function defaultSendOtp(phoneNumber: string, code: string): void {
	// Stubbed until a real SMS provider is wired up — visible in `wrangler dev` / Worker logs.
	console.log(`[otp] ${phoneNumber} -> ${code} (expires in ${OTP_EXPIRY_MINUTES}m)`);
}

// Returns the generated code so callers (the stub sender, and tests) can see it. The HTTP layer
// must never echo this back in a response — it's only surfaced here, not over the wire.
export async function requestOtp(
	db: D1Database,
	phoneNumber: string,
	options: RequestOtpOptions = {},
): Promise<{ code: string }> {
	if (!isValidPhoneNumber(phoneNumber)) {
		throw new HttpError(400, "Invalid phone number. Use E.164 format, e.g. +919876543210.");
	}

	const now = options.now ?? new Date();
	const windowStart = new Date(now.getTime() - OTP_RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();

	const recentCount = await db
		.prepare("SELECT COUNT(*) as count FROM otp_requests WHERE phone_number = ? AND created_at > ?")
		.bind(phoneNumber, windowStart)
		.first<{ count: number }>();

	if ((recentCount?.count ?? 0) >= OTP_RATE_LIMIT_MAX) {
		throw new HttpError(429, "Too many OTP requests. Please try again later.");
	}

	const code = (options.generateCode ?? generateOtpCode)();
	const codeHash = await sha256Hex(code);
	const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60_000).toISOString();

	await db
		.prepare(
			"INSERT INTO otp_requests (id, phone_number, code_hash, attempts, created_at, expires_at) VALUES (?, ?, ?, 0, ?, ?)",
		)
		.bind(crypto.randomUUID(), phoneNumber, codeHash, now.toISOString(), expiresAt)
		.run();

	await (options.sendOtp ?? defaultSendOtp)(phoneNumber, code);

	return { code };
}

export interface VerifyOtpOptions {
	now?: Date;
}

interface OtpRequestRow {
	id: string;
	code_hash: string;
	attempts: number;
	expires_at: string;
}

export async function verifyOtp(
	db: D1Database,
	phoneNumber: string,
	code: string,
	options: VerifyOtpOptions = {},
): Promise<{ userId: string }> {
	if (!isValidPhoneNumber(phoneNumber)) {
		throw new HttpError(400, "Invalid phone number. Use E.164 format, e.g. +919876543210.");
	}

	const now = options.now ?? new Date();

	const otpRequest = await db
		.prepare(
			"SELECT id, code_hash, attempts, expires_at FROM otp_requests WHERE phone_number = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1",
		)
		.bind(phoneNumber)
		.first<OtpRequestRow>();

	if (!otpRequest) {
		throw new HttpError(401, "No pending OTP for this phone number. Request a new one.");
	}

	if (new Date(otpRequest.expires_at).getTime() < now.getTime()) {
		throw new HttpError(401, "OTP has expired. Request a new one.");
	}

	if (otpRequest.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
		await db
			.prepare("UPDATE otp_requests SET consumed_at = ? WHERE id = ?")
			.bind(now.toISOString(), otpRequest.id)
			.run();
		throw new HttpError(401, "Too many incorrect attempts. Request a new OTP.");
	}

	const codeHash = await sha256Hex(code);
	if (codeHash !== otpRequest.code_hash) {
		const attempts = otpRequest.attempts + 1;
		const lockedOut = attempts >= OTP_MAX_VERIFY_ATTEMPTS;
		await db
			.prepare("UPDATE otp_requests SET attempts = ?, consumed_at = ? WHERE id = ?")
			.bind(attempts, lockedOut ? now.toISOString() : null, otpRequest.id)
			.run();
		throw new HttpError(401, "Incorrect OTP.");
	}

	await db
		.prepare("UPDATE otp_requests SET consumed_at = ? WHERE id = ?")
		.bind(now.toISOString(), otpRequest.id)
		.run();

	const existingUser = await db
		.prepare("SELECT id FROM users WHERE phone_number = ?")
		.bind(phoneNumber)
		.first<{ id: string }>();

	if (existingUser) {
		return { userId: existingUser.id };
	}

	const userId = crypto.randomUUID();
	await db.prepare("INSERT INTO users (id, phone_number) VALUES (?, ?)").bind(userId, phoneNumber).run();
	return { userId };
}
