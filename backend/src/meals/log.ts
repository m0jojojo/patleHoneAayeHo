import type { DishMacros } from "../nutrition/dishes";
import { recordUsualMealStatement } from "./usual-meals";

export interface LogMealInput {
	dishLabels: string[];
	// Opaque to this layer — whatever shape the client used to arrive at `macros` (e.g. per-dish
	// portion multipliers/oil levels). Stored as-is for later display; never parsed here.
	portionEstimate: unknown;
	macros: DishMacros;
	sourceImageRef?: string | null;
}

export function validateLogMealInput(input: {
	dishLabels?: unknown;
	portionEstimate?: unknown;
	macros?: unknown;
}): string | null {
	if (!Array.isArray(input.dishLabels) || input.dishLabels.length === 0) {
		return "dishLabels must be a non-empty array of strings.";
	}
	if (input.dishLabels.some((label) => typeof label !== "string" || label.length === 0)) {
		return "dishLabels must be a non-empty array of strings.";
	}

	if (input.portionEstimate === undefined || input.portionEstimate === null) {
		return "portionEstimate is required.";
	}

	const macros = input.macros as Partial<DishMacros> | undefined;
	if (
		!macros ||
		typeof macros.calories !== "number" ||
		typeof macros.proteinG !== "number" ||
		typeof macros.carbsG !== "number" ||
		typeof macros.fatG !== "number" ||
		[macros.calories, macros.proteinG, macros.carbsG, macros.fatG].some(
			(value) => !Number.isFinite(value) || value < 0,
		)
	) {
		return "macros must include non-negative calories, proteinG, carbsG, and fatG.";
	}

	return null;
}

export async function logMeal(db: D1Database, userId: string, input: LogMealInput): Promise<{ id: string }> {
	const id = crypto.randomUUID();

	const insertMealStatement = db
		.prepare(
			"INSERT INTO meals_logged (id, user_id, timestamp, dish_labels, portion_estimate, macros, source_image_ref) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			userId,
			new Date().toISOString(),
			JSON.stringify(input.dishLabels),
			JSON.stringify(input.portionEstimate),
			JSON.stringify(input.macros),
			input.sourceImageRef ?? null,
		);

	// Every log updates the "usual meals" library too (Phase 7) - both writes happen atomically
	// so a partial failure can't log a meal without tracking it, or vice versa.
	await db.batch([insertMealStatement, recordUsualMealStatement(db, userId, input.dishLabels)]);

	return { id };
}
