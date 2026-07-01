CREATE TABLE usual_meals (
	user_id TEXT NOT NULL REFERENCES users(id),
	meal_signature TEXT NOT NULL,
	frequency_count INTEGER NOT NULL DEFAULT 1,
	last_logged_at TEXT NOT NULL,
	PRIMARY KEY (user_id, meal_signature)
);
