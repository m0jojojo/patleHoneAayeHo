import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendOtpViaMsg91 } from "../../src/auth/msg91";

const originalFetch = global.fetch;

describe("sendOtpViaMsg91", () => {
	afterEach(() => {
		global.fetch = originalFetch;
	});

	it("posts the phone number (without the leading +) and code to MSG91's OTP endpoint", async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
		global.fetch = mockFetch;

		await sendOtpViaMsg91("test-auth-key", "+919876543210", "482913");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://control.msg91.com/api/v5/otp",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({ authkey: "test-auth-key" }),
			}),
		);
		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body).toEqual({ mobile: "919876543210", otp: "482913", otp_expiry: 5 });
	});

	it("throws when MSG91 responds with a non-2xx status", async () => {
		global.fetch = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));

		await expect(sendOtpViaMsg91("test-auth-key", "+919876543210", "482913")).rejects.toThrow(
			/MSG91 send failed/,
		);
	});
});

describe("createSendOtp", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		global.fetch = originalFetch;
	});

	it("returns undefined (falls back to the console stub) when no auth key is configured", async () => {
		const { createSendOtp } = await import("../../src/auth/send-otp");
		expect(createSendOtp(undefined)).toBeUndefined();
		expect(createSendOtp("")).toBeUndefined();
	});

	it("sends via MSG91 when an auth key is configured", async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
		global.fetch = mockFetch;

		const { createSendOtp } = await import("../../src/auth/send-otp");
		const sendOtp = createSendOtp("real-key");
		expect(sendOtp).toBeDefined();

		await sendOtp!("+919876543210", "111222");
		expect(mockFetch).toHaveBeenCalled();
	});

	it("falls back to logging the code if the MSG91 call throws, without rejecting", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

		const { createSendOtp } = await import("../../src/auth/send-otp");
		const sendOtp = createSendOtp("real-key");

		await expect(sendOtp!("+919876543210", "111222")).resolves.toBeUndefined();
	});
});
