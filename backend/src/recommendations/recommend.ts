import { getTodaySummary } from "../meals/today";
import { getUsualMeals } from "../meals/usual-meals";
import { isProteinAllowedForDietType, PROTEIN_TYPES, type DietType } from "../onboarding/constants";
import { proteinTypeForDishLabel } from "./dish-protein-map";
import { shouldRecommendProteinGap } from "./gap-detection";

export type RecommendationSource = "explicit" | "history" | "default";

export interface Recommendation {
	// Always "addition" - see docs/recommendation-engine.md for why this is a literal, tested
	// invariant rather than just a convention: the product must never suggest a swap.
	type: "addition";
	proteinType: string;
	proteinLabel: string;
	source: RecommendationSource;
	message: string;
	remainingProteinG: number;
}

interface ProteinPreferenceRow {
	protein_type: string;
	source: string;
}

async function getProteinPreferences(db: D1Database, userId: string): Promise<ProteinPreferenceRow[]> {
	const { results } = await db
		.prepare("SELECT protein_type, source FROM protein_preferences WHERE user_id = ? ORDER BY id ASC")
		.bind(userId)
		.all<ProteinPreferenceRow>();
	return results;
}

function proteinLabel(proteinType: string): string {
	return PROTEIN_TYPES.find((protein) => protein.id === proteinType)?.label ?? proteinType;
}

function formatWeekday(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function buildRecommendation(
	proteinType: string,
	source: RecommendationSource,
	remainingProteinG: number,
	lastLoggedAt?: string,
): Recommendation {
	const label = proteinLabel(proteinType);
	const message =
		source === "history" && lastLoggedAt
			? `Add some ${label.toLowerCase()} — you had it ${formatWeekday(lastLoggedAt)}.`
			: `Add some ${label.toLowerCase()} to help hit your protein target today.`;

	return { type: "addition", proteinType, proteinLabel: label, source, message, remainingProteinG };
}

// The priority order, in one place (see docs/recommendation-engine.md for the full writeup with
// examples):
//   1. explicit protein_preferences (Phase 9 lets a user set these directly)
//   2. usual_meals logging history (what they've actually been eating, most frequent first)
//   3. cold-start default: the first protein they selected during onboarding
// At every tier, candidates are restricted to protein_preferences the user already selected
// (diet-type filtering re-checked here too, not just at onboarding) - this function can never
// suggest a food the user hasn't already told us about.
export async function getProteinGapRecommendation(
	db: D1Database,
	userId: string,
	now: Date = new Date(),
): Promise<Recommendation | null> {
	const user = await db
		.prepare("SELECT diet_type FROM users WHERE id = ?")
		.bind(userId)
		.first<{ diet_type: string | null }>();
	if (!user?.diet_type) return null;

	let remainingProteinG: number;
	try {
		const summary = await getTodaySummary(db, userId, now);
		remainingProteinG = summary.remaining.proteinG;
	} catch {
		// Onboarding (body stats/goal) incomplete - daily targets aren't available yet, so there's
		// nothing to compute a gap against.
		return null;
	}

	if (!shouldRecommendProteinGap(remainingProteinG, now)) return null;

	const dietType = user.diet_type as DietType;
	const preferences = await getProteinPreferences(db, userId);
	const candidates = preferences.filter((preference) => isProteinAllowedForDietType(preference.protein_type, dietType));
	if (candidates.length === 0) return null;

	const explicit = candidates.find((preference) => preference.source === "explicit");
	if (explicit) {
		return buildRecommendation(explicit.protein_type, "explicit", remainingProteinG);
	}

	const usualMeals = await getUsualMeals(db, userId);
	const candidateProteinTypes = new Set(candidates.map((preference) => preference.protein_type));
	for (const meal of usualMeals) {
		const dishLabels: string[] = JSON.parse(meal.dish_labels);
		for (const dishLabel of dishLabels) {
			const proteinType = proteinTypeForDishLabel(dishLabel);
			if (proteinType && candidateProteinTypes.has(proteinType)) {
				return buildRecommendation(proteinType, "history", remainingProteinG, meal.last_logged_at);
			}
		}
	}

	return buildRecommendation(candidates[0].protein_type, "default", remainingProteinG);
}
