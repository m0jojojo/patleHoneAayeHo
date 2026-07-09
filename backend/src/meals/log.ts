import type { DishMacros } from "../nutrition/dishes";
import { recordUsualMealStatement } from "./usual-meals";

export type MealType = "breakfast" | "morning_snack" | "lunch" | "evening_snack" | "dinner";

export const MEAL_TYPES: MealType[] = ["breakfast", "morning_snack", "lunch", "evening_snack", "dinner"];

export function isValidMealType(value: unknown): value is MealType {
	return typeof value === "string" && (MEAL_TYPES as string[]).includes(value);
}

export interface LogMealInput {
	dishLabels: string[];
	// Opaque to this layer — whatever shape the client used to arrive at `macros` (e.g. per-dish
	// portion multipliers/oil levels). Stored as-is for later display; never parsed here.
	portionEstimate: unknown;
	macros: DishMacros;
	mealType: MealType;
	sourceImageRef?: string | null;
}

export function validateLogMealInput(input: {
	dishLabels?: unknown;
	portionEstimate?: unknown;
	macros?: unknown;
	mealType?: unknown;
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

	if (!isValidMealType(input.mealType)) {
		return `mealType must be one of: ${MEAL_TYPES.join(", ")}.`;
	}

	return null;
}

export interface LogMealResult {
	id: string;
	// True only for a user's very first-ever logged meal - the frontend uses this to show a
	// one-time, skippable nudge toward the "My Proteins" settings screen (Phase 9).
	showSettingsNudge: boolean;
}

export async function logMeal(db: D1Database, userId: string, input: LogMealInput): Promise<LogMealResult> {
	const existing = await db
		.prepare("SELECT COUNT(*) as count FROM meals_logged WHERE user_id = ?")
		.bind(userId)
		.first<{ count: number }>();
	const isFirstMeal = (existing?.count ?? 0) === 0;

	const id = crypto.randomUUID();

	const insertMealStatement = db
		.prepare(
			"INSERT INTO meals_logged (id, user_id, timestamp, dish_labels, portion_estimate, macros, source_image_ref, meal_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			userId,
			new Date().toISOString(),
			JSON.stringify(input.dishLabels),
			JSON.stringify(input.portionEstimate),
			JSON.stringify(input.macros),
			input.sourceImageRef ?? null,
			input.mealType,
		);

	// Every log updates the "usual meals" library too (Phase 7) - both writes happen atomically
	// so a partial failure can't log a meal without tracking it, or vice versa.
	await db.batch([insertMealStatement, recordUsualMealStatement(db, userId, input.dishLabels)]);

	return { id, showSettingsNudge: isFirstMeal };
}

// Deliberately does NOT touch usual_meals' frequency_count - that's a lifetime "how often do you
// eat this" learning signal for the recommendation engine (Phases 8/9), not a live-recomputed
// aggregate, and safely decrementing it would need to know whether any other still-existing
// meals_logged row shares the same signature. Documented as a known limitation in
// docs/usual-meals.md. Scoped to `WHERE id = ? AND user_id = ?` so a user can never delete
// another user's meal by guessing an id. Returns whether a row was actually deleted, so the caller
// can tell "deleted" apart from "nothing there to delete."
export async function deleteMeal(db: D1Database, userId: string, mealId: string): Promise<boolean> {
	const result = await db.prepare("DELETE FROM meals_logged WHERE id = ? AND user_id = ?").bind(mealId, userId).run();
	return result.meta.changes > 0;
}
