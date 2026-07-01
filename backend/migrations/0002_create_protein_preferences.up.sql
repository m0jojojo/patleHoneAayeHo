CREATE TABLE protein_preferences (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id TEXT NOT NULL REFERENCES users(id),
	protein_type TEXT NOT NULL,
	frequency_comfort TEXT NOT NULL,
	source TEXT NOT NULL CHECK (source IN ('explicit', 'default', 'inferred')),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE (user_id, protein_type)
);
