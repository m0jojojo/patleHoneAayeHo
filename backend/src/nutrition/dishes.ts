export type OilLevel = "low" | "medium" | "high";

export interface DishRow {
	id: string;
	name: string;
	standard_portion_label: string;
	base_calories: number;
	base_protein_g: number;
	base_carbs_g: number;
	base_fat_g: number;
	oil_variance_low_tsp: number | null;
	oil_variance_medium_tsp: number | null;
	oil_variance_high_tsp: number | null;
}

export interface DishMacros {
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
}

// 1 tsp of cooking oil/ghee ~= 5g, and fat is ~9 kcal/g.
const OIL_FAT_G_PER_TSP = 5;
const OIL_CALORIES_PER_TSP = OIL_FAT_G_PER_TSP * 9;

function oilTspForLevel(dish: DishRow, oilLevel: OilLevel): number {
	const column =
		oilLevel === "low"
			? dish.oil_variance_low_tsp
			: oilLevel === "medium"
				? dish.oil_variance_medium_tsp
				: dish.oil_variance_high_tsp;
	return column ?? 0;
}

export interface CalculateDishMacrosOptions {
	// 1 = the dish's standard portion, 0.5 = half, 2 = double, etc.
	portionMultiplier?: number;
	// Ignored for dishes with no oil variance recorded (fixed dishes like rice, egg, fruit).
	// Defaults to "medium" — a reasonable home-cooking assumption absent other information.
	oilLevel?: OilLevel;
}

// The oil/ghee adjustment: a dish's protein and carbs come from its non-oil ingredients and don't
// change with how much oil/ghee went into cooking it, but fat and calories do. `base_fat_g` /
// `base_calories` already capture a dish's "floor" (e.g. the fat naturally in paneer or chicken);
// the oil variance columns add *on top of* that floor for dishes where home-cooking oil usage
// varies a lot (dal, sabzi, curries). Dishes with no variance recorded (NULL columns) are
// unaffected by `oilLevel` entirely.
export function calculateDishMacros(dish: DishRow, options: CalculateDishMacrosOptions = {}): DishMacros {
	const portionMultiplier = options.portionMultiplier ?? 1;
	const oilTsp = oilTspForLevel(dish, options.oilLevel ?? "medium");

	return {
		calories: (dish.base_calories + oilTsp * OIL_CALORIES_PER_TSP) * portionMultiplier,
		proteinG: dish.base_protein_g * portionMultiplier,
		carbsG: dish.base_carbs_g * portionMultiplier,
		fatG: (dish.base_fat_g + oilTsp * OIL_FAT_G_PER_TSP) * portionMultiplier,
	};
}

export async function getDishByName(db: D1Database, name: string): Promise<DishRow | null> {
	return db.prepare("SELECT * FROM dishes WHERE name = ?").bind(name).first<DishRow>();
}
