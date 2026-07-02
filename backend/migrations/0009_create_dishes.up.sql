CREATE TABLE dishes (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	standard_portion_label TEXT NOT NULL,
	base_calories REAL NOT NULL,
	base_protein_g REAL NOT NULL,
	base_carbs_g REAL NOT NULL,
	base_fat_g REAL NOT NULL,
	oil_variance_low_tsp REAL,
	oil_variance_medium_tsp REAL,
	oil_variance_high_tsp REAL
);

INSERT INTO dishes (id, name, standard_portion_label, base_calories, base_protein_g, base_carbs_g, base_fat_g, oil_variance_low_tsp, oil_variance_medium_tsp, oil_variance_high_tsp) VALUES
	('dal_tadka', 'Dal (tadka)', '1 katori (~150g)', 120, 7, 18, 2, 0.5, 1.5, 3),
	('roti', 'Roti (whole wheat, plain)', '1 piece (~40g)', 80, 3, 15, 1, NULL, NULL, NULL),
	('rice_white', 'White rice (cooked)', '1 katori (~150g)', 150, 3, 33, 0.3, NULL, NULL, NULL),
	('paneer_curry', 'Paneer curry', '1 katori (~150g)', 150, 12, 8, 8, 1, 2, 4),
	('chicken_curry', 'Chicken curry', '1 katori (~150g, with gravy)', 180, 20, 5, 6, 1, 2, 4),
	('mixed_veg_sabzi', 'Mixed vegetable sabzi', '1 katori (~150g)', 70, 2, 10, 1, 0.5, 1.5, 3),
	('curd_plain', 'Curd (dahi, plain)', '1 katori (~100g)', 60, 3.5, 4.5, 3.5, NULL, NULL, NULL),
	('egg_boiled', 'Boiled egg', '1 egg (~50g)', 78, 6.5, 0.5, 5, NULL, NULL, NULL),
	('banana', 'Banana', '1 medium (~120g)', 105, 1.3, 27, 0.4, NULL, NULL, NULL);
