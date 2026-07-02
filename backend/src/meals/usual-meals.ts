// The matching rule for "is this the same meal as before": the exact set of dish labels,
// case-insensitively, order-independent. See docs/usual-meals.md for the full rationale and
// known limitations (e.g. it does NOT account for portion size, so "1 roti" and "3 rotis" count
// as the same meal; and it's an exact-set match, so adding or dropping even one dish from an
// otherwise-identical plate counts as a different meal).
export function computeMealSignature(dishLabels: string[]): string {
	return dishLabels
		.map((label) => label.trim().toLowerCase())
		.filter((label) => label.length > 0)
		.sort()
		.join("|");
}

export interface UsualMealRow {
	meal_signature: string;
	dish_labels: string;
	frequency_count: number;
	last_logged_at: string;
}

// Upserts in a single atomic statement: a brand-new signature starts at frequency_count 1; an
// existing one increments rather than creating a duplicate row (usual_meals' primary key is
// (user_id, meal_signature), so ON CONFLICT targets exactly the matching-meal case). The
// signature itself is normalized (lowercased) for matching, but the original-cased dish labels
// are stored alongside it (refreshed on every log) purely for display.
export function recordUsualMealStatement(db: D1Database, userId: string, dishLabels: string[]): D1PreparedStatement {
	const signature = computeMealSignature(dishLabels);
	const now = new Date().toISOString();

	return db
		.prepare(
			`INSERT INTO usual_meals (user_id, meal_signature, dish_labels, frequency_count, last_logged_at)
			 VALUES (?, ?, ?, 1, ?)
			 ON CONFLICT (user_id, meal_signature) DO UPDATE SET
			   frequency_count = frequency_count + 1,
			   last_logged_at = excluded.last_logged_at,
			   dish_labels = excluded.dish_labels`,
		)
		.bind(userId, signature, JSON.stringify(dishLabels), now);
}

export async function getUsualMeals(db: D1Database, userId: string): Promise<UsualMealRow[]> {
	const { results } = await db
		.prepare(
			"SELECT meal_signature, dish_labels, frequency_count, last_logged_at FROM usual_meals WHERE user_id = ? ORDER BY frequency_count DESC, last_logged_at DESC",
		)
		.bind(userId)
		.all<UsualMealRow>();

	return results;
}
