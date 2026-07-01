CREATE TABLE users (
	id TEXT PRIMARY KEY,
	phone_number TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	goal TEXT,
	diet_type TEXT,
	height REAL,
	weight REAL,
	age INTEGER,
	activity_level TEXT
);
