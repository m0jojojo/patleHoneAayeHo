import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpError } from "../../src/auth/errors";
import { OTP_MAX_VERIFY_ATTEMPTS, OTP_RATE_LIMIT_MAX, requestOtp, verifyOtp } from "../../src/auth/otp";
import { applyMigrations } from "../helpers/setup";

const PHONE = "+919876543210";

beforeEach(async () => {
	await applyMigrations(env.DB);
});

describe("requestOtp", () => {
	it("accepts a valid E.164 phone number and stores a hashed OTP", async () => {
		const { code } = await requestOtp(env.DB, PHONE);
		expect(code).toMatch(/^\d{6}$/);

		const row = await env.DB.prepare("SELECT phone_number, code_hash FROM otp_requests WHERE phone_number = ?")
			.bind(PHONE)
			.first<{ phone_number: string; code_hash: string }>();
		expect(row?.phone_number).toBe(PHONE);
		expect(row?.code_hash).not.toBe(code);
	});

	it.each(["9876543210", "+0123456789", "not-a-phone", "+91"])(
		"rejects an invalid phone number: %s",
		async (invalidPhone) => {
			await expect(requestOtp(env.DB, invalidPhone)).rejects.toThrow(HttpError);
		},
	);

	it("passes the generated code to the sender", async () => {
		let sentTo: string | undefined;
		let sentCode: string | undefined;
		await requestOtp(env.DB, PHONE, {
			sendOtp: (phoneNumber, code) => {
				sentTo = phoneNumber;
				sentCode = code;
			},
		});
		expect(sentTo).toBe(PHONE);
		expect(sentCode).toMatch(/^\d{6}$/);
	});

	it(`rate-limits after ${OTP_RATE_LIMIT_MAX} requests within the window`, async () => {
		for (let i = 0; i < OTP_RATE_LIMIT_MAX; i++) {
			await requestOtp(env.DB, PHONE);
		}

		await expect(requestOtp(env.DB, PHONE)).rejects.toMatchObject({ status: 429 });
	});

	it("does not rate-limit once the window has passed", async () => {
		const now = new Date("2026-01-01T00:00:00Z");
		for (let i = 0; i < OTP_RATE_LIMIT_MAX; i++) {
			await requestOtp(env.DB, PHONE, { now });
		}

		const later = new Date(now.getTime() + 61 * 60_000);
		await expect(requestOtp(env.DB, PHONE, { now: later })).resolves.toBeDefined();
	});
});

describe("verifyOtp", () => {
	it("succeeds with the correct code and creates a new user", async () => {
		const { code } = await requestOtp(env.DB, PHONE);
		const { userId } = await verifyOtp(env.DB, PHONE, code);

		const user = await env.DB.prepare("SELECT id, phone_number FROM users WHERE id = ?")
			.bind(userId)
			.first<{ id: string; phone_number: string }>();
		expect(user?.phone_number).toBe(PHONE);
	});

	it("reuses the existing user on a repeat login", async () => {
		const first = await requestOtp(env.DB, PHONE);
		const { userId: firstUserId } = await verifyOtp(env.DB, PHONE, first.code);

		const second = await requestOtp(env.DB, PHONE);
		const { userId: secondUserId } = await verifyOtp(env.DB, PHONE, second.code);

		expect(secondUserId).toBe(firstUserId);
		const { count } = (await env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE phone_number = ?")
			.bind(PHONE)
			.first<{ count: number }>()) ?? { count: -1 };
		expect(count).toBe(1);
	});

	it("rejects an incorrect code", async () => {
		await requestOtp(env.DB, PHONE);
		await expect(verifyOtp(env.DB, PHONE, "000000")).rejects.toMatchObject({ status: 401 });
	});

	it("rejects reusing an already-verified code", async () => {
		const { code } = await requestOtp(env.DB, PHONE);
		await verifyOtp(env.DB, PHONE, code);
		await expect(verifyOtp(env.DB, PHONE, code)).rejects.toMatchObject({ status: 401 });
	});

	it("rejects an expired code", async () => {
		const now = new Date("2026-01-01T00:00:00Z");
		const { code } = await requestOtp(env.DB, PHONE, { now });
		const afterExpiry = new Date(now.getTime() + 6 * 60_000);
		await expect(verifyOtp(env.DB, PHONE, code, { now: afterExpiry })).rejects.toMatchObject({ status: 401 });
	});

	it("rejects when there is no pending OTP", async () => {
		await expect(verifyOtp(env.DB, PHONE, "123456")).rejects.toMatchObject({ status: 401 });
	});

	it(`locks out after ${OTP_MAX_VERIFY_ATTEMPTS} incorrect attempts, even with the correct code afterwards`, async () => {
		const { code } = await requestOtp(env.DB, PHONE);

		for (let i = 0; i < OTP_MAX_VERIFY_ATTEMPTS; i++) {
			await expect(verifyOtp(env.DB, PHONE, "000000")).rejects.toThrow(HttpError);
		}

		await expect(verifyOtp(env.DB, PHONE, code)).rejects.toMatchObject({ status: 401 });
	});

	it("rejects an invalid phone number format", async () => {
		await expect(verifyOtp(env.DB, "not-a-phone", "123456")).rejects.toMatchObject({ status: 400 });
	});
});
