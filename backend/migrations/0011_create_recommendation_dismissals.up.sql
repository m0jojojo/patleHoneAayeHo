CREATE TABLE recommendation_dismissals (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id),
	protein_type TEXT NOT NULL,
	dismissed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
