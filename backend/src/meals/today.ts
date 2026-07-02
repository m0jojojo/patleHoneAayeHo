import type { DishMacros } from "../nutrition/dishes";
import { getUserDailyTargets } from "../nutrition/user-targets";

export interface LoggedMealSummary {
	id: string;
	timestamp: string;
	dishLabels: string[];
	macros: DishMacros;
}

export interface TodaySummary {
	tdee: number;
	targets: DishMacros;
	consumed: DishMacros;
	remaining: DishMacros;
	meals: LoggedMealSummary[];
}

const ZERO_MACROS: DishMacros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

function addMacros(a: DishMacros, b: DishMacros): DishMacros {
	return {
		calories: a.calories + b.calories,
		proteinG: a.proteinG + b.proteinG,
		carbsG: a.carbsG + b.carbsG,
		fatG: a.fatG + b.fatG,
	};
}

function subtractMacros(a: DishMacros, b: DishMacros): DishMacros {
	return {
		calories: a.calories - b.calories,
		proteinG: a.proteinG - b.proteinG,
		carbsG: a.carbsG - b.carbsG,
		fatG: a.fatG - b.fatG,
	};
}

interface MealRow {
	id: string;
	timestamp: string;
	dish_labels: string;
	macros: string;
}

// "Today" is a UTC calendar-day match on the stored ISO timestamp - a known simplification for
// now (see docs/usual-meals.md-adjacent note in docs/schema.md); it doesn't yet account for a
// user's actual local timezone.
export async function getTodaySummary(db: D1Database, userId: string, now: Date = new Date()): Promise<TodaySummary> {
	const todayPrefix = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

	const { tdee, ...targets } = await getUserDailyTargets(db, userId);

	const { results } = await db
		.prepare(
			"SELECT id, timestamp, dish_labels, macros FROM meals_logged WHERE user_id = ? AND timestamp LIKE ? ORDER BY timestamp ASC",
		)
		.bind(userId, `${todayPrefix}%`)
		.all<MealRow>();

	const meals: LoggedMealSummary[] = results.map((row) => ({
		id: row.id,
		timestamp: row.timestamp,
		dishLabels: JSON.parse(row.dish_labels),
		macros: JSON.parse(row.macros),
	}));

	const consumed = meals.reduce((sum, meal) => addMacros(sum, meal.macros), ZERO_MACROS);
	const remaining = subtractMacros(targets, consumed);

	return { tdee, targets, consumed, remaining, meals };
}
