import { proteinTypeForDishLabel } from "./dish-protein-map";

// If the same protein gets dismissed this many times in a row (with no acceptance in between),
// surface an inline prompt suggesting the user adjust that protein's frequency setting directly,
// rather than keep recommending something they clearly don't want right now.
export const REPEATED_DISMISSAL_THRESHOLD = 3;

// Logging a dismissal doesn't change today's recommendation - it just feeds Phase 9's passive
// learning (repeated dismissals of the same protein should eventually surface a prompt to adjust
// that protein's frequency setting).
export async function recordDismissal(
	db: D1Database,
	userId: string,
	proteinType: string,
	now: Date = new Date(),
): Promise<void> {
	await db
		.prepare("INSERT INTO recommendation_dismissals (id, user_id, protein_type, dismissed_at) VALUES (?, ?, ?, ?)")
		.bind(crypto.randomUUID(), userId, proteinType, now.toISOString())
		.run();
}

interface MealRow {
	timestamp: string;
	dish_labels: string;
}

// "Accepting" a recommendation isn't a separate button - logging a meal that actually contains
// the recommended protein counts as accepting it, and resets the dismissal counter (the reset
// condition the brief itself suggests). Rows are already ordered by timestamp DESC, so the first
// match found is the most recent.
async function lastAcceptedAt(db: D1Database, userId: string, proteinType: string): Promise<string | null> {
	const { results } = await db
		.prepare("SELECT timestamp, dish_labels FROM meals_logged WHERE user_id = ? ORDER BY timestamp DESC")
		.bind(userId)
		.all<MealRow>();

	for (const row of results) {
		const dishLabels: string[] = JSON.parse(row.dish_labels);
		if (dishLabels.some((label) => proteinTypeForDishLabel(label) === proteinType)) {
			return row.timestamp;
		}
	}

	return null;
}

// Counts dismissals of this protein since it was last accepted (or ever, if never accepted).
export async function countDismissalsSinceLastAccepted(
	db: D1Database,
	userId: string,
	proteinType: string,
): Promise<number> {
	const acceptedAt = await lastAcceptedAt(db, userId, proteinType);

	const query = acceptedAt
		? db
				.prepare("SELECT COUNT(*) as count FROM recommendation_dismissals WHERE user_id = ? AND protein_type = ? AND dismissed_at > ?")
				.bind(userId, proteinType, acceptedAt)
		: db
				.prepare("SELECT COUNT(*) as count FROM recommendation_dismissals WHERE user_id = ? AND protein_type = ?")
				.bind(userId, proteinType);

	const { results } = await query.all<{ count: number }>();
	return results[0]?.count ?? 0;
}
