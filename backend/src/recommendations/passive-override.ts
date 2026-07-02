import { proteinTypeForDishLabel } from "./dish-protein-map";

// The passive-override rule (Phase 9, see docs/frequency-learning.md): among proteins the user
// hasn't set an explicit preference for, exactly one qualifies as a strong, unambiguous signal if
// it's been logged 5+ times in the last 14 days AND every other candidate has been logged zero
// times in that same window. This never writes to protein_preferences - it only affects which
// protein Phase 8's ranking picks for today's recommendation.
export const PASSIVE_OVERRIDE_MIN_LOGS = 5;
export const PASSIVE_OVERRIDE_WINDOW_DAYS = 14;

interface MealRow {
	dish_labels: string;
}

// One count per logged meal, not per dish - a single meal with two dishes mapping to the same
// protein only counts once, so "logged 5+ times" means 5 separate meals, not 5 dish mentions.
async function countProteinLogsInWindow(
	db: D1Database,
	userId: string,
	candidateProteinTypes: string[],
	windowStart: Date,
): Promise<Map<string, number>> {
	const counts = new Map<string, number>(candidateProteinTypes.map((proteinType) => [proteinType, 0]));

	const { results } = await db
		.prepare("SELECT dish_labels FROM meals_logged WHERE user_id = ? AND timestamp >= ?")
		.bind(userId, windowStart.toISOString())
		.all<MealRow>();

	for (const row of results) {
		const dishLabels: string[] = JSON.parse(row.dish_labels);
		const proteinsInThisMeal = new Set<string>();
		for (const label of dishLabels) {
			const proteinType = proteinTypeForDishLabel(label);
			if (proteinType && counts.has(proteinType)) proteinsInThisMeal.add(proteinType);
		}
		for (const proteinType of proteinsInThisMeal) {
			counts.set(proteinType, (counts.get(proteinType) ?? 0) + 1);
		}
	}

	return counts;
}

export async function getPassiveOverrideProtein(
	db: D1Database,
	userId: string,
	candidateProteinTypes: string[],
	now: Date = new Date(),
): Promise<string | null> {
	if (candidateProteinTypes.length === 0) return null;

	const windowStart = new Date(now.getTime() - PASSIVE_OVERRIDE_WINDOW_DAYS * 24 * 60 * 60_000);
	const counts = await countProteinLogsInWindow(db, userId, candidateProteinTypes, windowStart);

	const strong = candidateProteinTypes.filter(
		(proteinType) => (counts.get(proteinType) ?? 0) >= PASSIVE_OVERRIDE_MIN_LOGS,
	);
	if (strong.length !== 1) return null;

	const [winner] = strong;
	const allOthersZero = candidateProteinTypes.every(
		(proteinType) => proteinType === winner || (counts.get(proteinType) ?? 0) === 0,
	);
	return allOthersZero ? winner : null;
}
