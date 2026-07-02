import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createSession, validateSession } from "../../src/auth/session";
import { applyMigrations } from "../helpers/setup";

beforeEach(async () => {
	await applyMigrations(env.DB);
	await env.DB.prepare("INSERT INTO users (id, phone_number) VALUES ('u1', '+919876543210')").run();
});

describe("createSession / validateSession", () => {
	it("issues a token that resolves back to the user", async () => {
		const { token } = await createSession(env.DB, "u1");
		const user = await validateSession(env.DB, token);
		expect(user).toEqual({ id: "u1", phoneNumber: "+919876543210" });
	});

	it("rejects an unknown token", async () => {
		const user = await validateSession(env.DB, "not-a-real-token");
		expect(user).toBeNull();
	});

	it("rejects an expired session", async () => {
		const issuedAt = new Date("2026-01-01T00:00:00Z");
		const { token } = await createSession(env.DB, "u1", issuedAt);

		const wellPastExpiry = new Date(issuedAt.getTime() + 31 * 24 * 60 * 60_000);
		const user = await validateSession(env.DB, token, wellPastExpiry);
		expect(user).toBeNull();
	});

	it("stores a hash of the token, not the token itself", async () => {
		const { token } = await createSession(env.DB, "u1");
		const row = await env.DB.prepare("SELECT token_hash FROM sessions WHERE user_id = ?")
			.bind("u1")
			.first<{ token_hash: string }>();
		expect(row?.token_hash).not.toBe(token);
	});
});
