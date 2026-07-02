import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { requestOtp } from "../../src/auth/otp";
import { applyMigrations } from "../helpers/setup";

const PHONE = "+919876543210";

beforeEach(async () => {
	await applyMigrations(env.DB);
});

function postJson(path: string, body: unknown) {
	return SELF.fetch(`https://example.com${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /auth/otp/request", () => {
	it("accepts a valid phone number", async () => {
		const response = await postJson("/auth/otp/request", { phoneNumber: PHONE });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
	});

	it("rejects an invalid phone number", async () => {
		const response = await postJson("/auth/otp/request", { phoneNumber: "not-a-phone" });
		expect(response.status).toBe(400);
	});

	it("rejects a missing phoneNumber", async () => {
		const response = await postJson("/auth/otp/request", {});
		expect(response.status).toBe(400);
	});

	it("never echoes the OTP code back in the response", async () => {
		const response = await postJson("/auth/otp/request", { phoneNumber: PHONE });
		const body = await response.text();
		expect(body).not.toMatch(/\d{6}/);
	});

	it("rate-limits after repeated requests", async () => {
		let lastStatus = 0;
		for (let i = 0; i < 6; i++) {
			const response = await postJson("/auth/otp/request", { phoneNumber: PHONE });
			lastStatus = response.status;
		}
		expect(lastStatus).toBe(429);
	});
});

describe("POST /auth/otp/verify", () => {
	it("issues a session token for the correct code", async () => {
		const { code } = await requestOtp(env.DB, PHONE);
		const response = await postJson("/auth/otp/verify", { phoneNumber: PHONE, code });
		expect(response.status).toBe(200);
		const body = await response.json<{ token: string }>();
		expect(typeof body.token).toBe("string");
		expect(body.token.length).toBeGreaterThan(20);
	});

	it("rejects an incorrect code", async () => {
		await requestOtp(env.DB, PHONE);
		const response = await postJson("/auth/otp/verify", { phoneNumber: PHONE, code: "000000" });
		expect(response.status).toBe(401);
	});

	it("rejects a missing code", async () => {
		const response = await postJson("/auth/otp/verify", { phoneNumber: PHONE });
		expect(response.status).toBe(400);
	});
});

describe("GET /auth/me (protected route)", () => {
	it("rejects a request with no token", async () => {
		const response = await SELF.fetch("https://example.com/auth/me");
		expect(response.status).toBe(401);
	});

	it("rejects a request with an invalid token", async () => {
		const response = await SELF.fetch("https://example.com/auth/me", {
			headers: { Authorization: "Bearer not-a-real-token" },
		});
		expect(response.status).toBe(401);
	});

	it("accepts a request with a valid token", async () => {
		const { code } = await requestOtp(env.DB, PHONE);
		const verifyResponse = await postJson("/auth/otp/verify", { phoneNumber: PHONE, code });
		const { token } = await verifyResponse.json<{ token: string }>();

		const response = await SELF.fetch("https://example.com/auth/me", {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(response.status).toBe(200);
		const body = await response.json<{ user: { phoneNumber: string } }>();
		expect(body.user.phoneNumber).toBe(PHONE);
	});
});
