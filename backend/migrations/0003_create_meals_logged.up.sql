CREATE TABLE meals_logged (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id),
	timestamp TEXT NOT NULL,
	dish_labels TEXT NOT NULL,
	portion_estimate TEXT NOT NULL,
	macros TEXT NOT NULL,
	source_image_ref TEXT
);
