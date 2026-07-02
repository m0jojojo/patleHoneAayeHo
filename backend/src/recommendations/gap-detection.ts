// Protein-gap threshold and timing rule for firing a recommendation.
//
// KNOWN SIMPLIFICATION: the real rule should be "a few hours before the user's typical last
// meal," but we don't track per-user meal-timing patterns yet. Until that data exists, this uses
// a fixed cutoff hour instead - see docs/recommendation-engine.md.
export const PROTEIN_GAP_THRESHOLD_G = 15;
export const RECOMMENDATION_CUTOFF_HOUR = 21; // 9 PM UTC - see the "today" caveat in docs/schema.md

export function shouldRecommendProteinGap(remainingProteinG: number, now: Date = new Date()): boolean {
	return remainingProteinG >= PROTEIN_GAP_THRESHOLD_G && now.getUTCHours() < RECOMMENDATION_CUTOFF_HOUR;
}
