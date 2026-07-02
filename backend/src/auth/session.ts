import { generateSessionToken, sha256Hex } from "./crypto";

export const SESSION_DURATION_DAYS = 30;

export async function createSession(
	db: D1Database,
	userId: string,
	now: Date = new Date(),
): Promise<{ token: string }> {
	const token = generateSessionToken();
	const tokenHash = await sha256Hex(token);
	const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60_000).toISOString();

	await db
		.prepare("INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
		.bind(crypto.randomUUID(), tokenHash, userId, now.toISOString(), expiresAt)
		.run();

	return { token };
}

export interface SessionUser {
	id: string;
	phoneNumber: string;
}

interface SessionRow {
	id: string;
	phone_number: string;
	expires_at: string;
}

export async function validateSession(
	db: D1Database,
	token: string,
	now: Date = new Date(),
): Promise<SessionUser | null> {
	const tokenHash = await sha256Hex(token);

	const row = await db
		.prepare(
			`SELECT users.id as id, users.phone_number as phone_number, sessions.expires_at as expires_at
			 FROM sessions
			 JOIN users ON sessions.user_id = users.id
			 WHERE sessions.token_hash = ?`,
		)
		.bind(tokenHash)
		.first<SessionRow>();

	if (!row) return null;
	if (new Date(row.expires_at).getTime() < now.getTime()) return null;

	return { id: row.id, phoneNumber: row.phone_number };
}
