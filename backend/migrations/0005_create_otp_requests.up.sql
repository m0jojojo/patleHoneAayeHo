CREATE TABLE otp_requests (
	id TEXT PRIMARY KEY,
	phone_number TEXT NOT NULL,
	code_hash TEXT NOT NULL,
	attempts INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	expires_at TEXT NOT NULL,
	consumed_at TEXT
);
