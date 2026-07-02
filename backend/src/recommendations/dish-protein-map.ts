// Bridges two catalogs that otherwise don't know about each other: the nutrition `dishes` table
// (Phase 5, keyed by dish `name`) and the onboarding protein catalog (Phase 4, keyed by
// `protein_type` id). Only dishes that are meaningfully "a protein source" are listed here — a
// plain roti or rice isn't a protein pick even though it has some protein content.
//
// If you add a new dish to the nutrition catalog that represents a protein source, add an entry
// here too (see docs/recommendation-engine.md).
export const DISH_NAME_TO_PROTEIN_TYPE: Record<string, string> = {
	"Dal (tadka)": "dal_lentils",
	"Paneer curry": "paneer",
	"Chicken curry": "chicken",
	"Curd (dahi, plain)": "dairy",
	"Boiled egg": "eggs",
};

export function proteinTypeForDishLabel(dishLabel: string): string | null {
	return DISH_NAME_TO_PROTEIN_TYPE[dishLabel] ?? null;
}
