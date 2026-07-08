import { calculateDishMacros, getDishByName, type DishMacros } from "../nutrition/dishes";
import { stubVisionProvider, type VisionProvider } from "../vision/provider";

// Below this, we ask the user rather than guess (only meaningful for dishes whose macros
// actually vary with cooking oil/ghee — see docs/meal-scanning.md).
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export const DISAMBIGUATION_QUESTION = "How much ghee/oil was used, roughly?";

export interface DishScanResult {
	label: string;
	matched: boolean;
	confidence: number;
	portionMultiplier: number;
	needsDisambiguation: boolean;
	disambiguationQuestion?: string;
	macros?: DishMacros;
	// "catalog" - looked up from the nutrition database (see nutrition/dishes.ts), trustworthy even
	// for oil-variable dishes since it's paired with a confirmed oil level. "estimated" - the vision
	// provider's own guess, used only when `label` isn't in the catalog at all - shown to the user
	// as a rougher estimate rather than an authoritative lookup.
	macrosSource?: "catalog" | "estimated";
}

export interface ScanResult {
	// True when the vision provider itself failed/timed out — the caller should fall back to
	// manual entry, not treat this as "no dishes found on an otherwise successful scan".
	visionFailed: boolean;
	dishes: DishScanResult[];
}

export interface ScanMealOptions {
	visionProvider?: VisionProvider;
}

export async function scanMeal(
	db: D1Database,
	imageBase64: string,
	options: ScanMealOptions = {},
): Promise<ScanResult> {
	const visionProvider = options.visionProvider ?? stubVisionProvider;

	let visionResult;
	try {
		visionResult = await visionProvider(imageBase64);
	} catch (error) {
		console.error("Vision provider failed:", error);
		return { visionFailed: true, dishes: [] };
	}

	const dishes: DishScanResult[] = [];

	for (const item of visionResult.dishes) {
		const dishRow = await getDishByName(db, item.label);

		if (!dishRow) {
			dishes.push({
				label: item.label,
				matched: false,
				confidence: item.confidence,
				portionMultiplier: item.portionMultiplier,
				needsDisambiguation: false,
				macros: item.estimatedMacros,
				macrosSource: item.estimatedMacros ? "estimated" : undefined,
			});
			continue;
		}

		const hasOilVariance = dishRow.oil_variance_medium_tsp !== null;
		const needsDisambiguation = hasOilVariance && item.confidence < LOW_CONFIDENCE_THRESHOLD;

		dishes.push({
			label: item.label,
			matched: true,
			confidence: item.confidence,
			portionMultiplier: item.portionMultiplier,
			needsDisambiguation,
			disambiguationQuestion: needsDisambiguation ? DISAMBIGUATION_QUESTION : undefined,
			macros: needsDisambiguation
				? undefined
				: calculateDishMacros(dishRow, { portionMultiplier: item.portionMultiplier }),
			macrosSource: needsDisambiguation ? undefined : "catalog",
		});
	}

	return { visionFailed: false, dishes };
}
