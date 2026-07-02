import { getTodaySummary } from "../meals/today";
import { isProteinAllowedForDietType, PROTEIN_TYPES, type DietType } from "../onboarding/constants";
import { shouldRecommendProteinGap } from "./gap-detection";
import { getPassiveOverrideProtein } from "./passive-override";

export type RecommendationSource = "explicit" | "inferred" | "default";

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

function buildRecommendation(
	proteinType: string,
	source: RecommendationSource,
	remainingProteinG: number,
): Recommendation {
	const label = proteinLabel(proteinType);
	const message =
		source === "inferred"
			? `Add some ${label.toLowerCase()} — you've been eating it often lately.`
			: `Add some ${label.toLowerCase()} to help hit your protein target today.`;

	return { type: "addition", proteinType, proteinLabel: label, source, message, remainingProteinG };
}

// The priority order, in one place (see docs/recommendation-engine.md and
// docs/frequency-learning.md for the full writeup with examples):
//   1. explicit protein_preferences (Phase 9's "My Proteins" settings screen)
//   2. passive override: strong, unambiguous logging history (Phase 9's threshold rule)
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

	const nonExplicitProteinTypes = candidates.map((preference) => preference.protein_type);
	const inferredProteinType = await getPassiveOverrideProtein(db, userId, nonExplicitProteinTypes, now);
	if (inferredProteinType) {
		return buildRecommendation(inferredProteinType, "inferred", remainingProteinG);
	}

	return buildRecommendation(candidates[0].protein_type, "default", remainingProteinG);
}
