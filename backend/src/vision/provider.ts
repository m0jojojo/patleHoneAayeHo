export interface VisionDish {
	// Must match a `dishes.name` row for nutrition lookup to succeed (see src/meals/scan.ts).
	label: string;
	confidence: number; // 0-1
	portionMultiplier: number; // 1 = a standard portion
}

export interface VisionResult {
	dishes: VisionDish[];
}

export type VisionProvider = (imageBase64: string) => Promise<VisionResult>;

// Stubbed until a real Gemini API key is configured (see docs/meal-scanning.md for why Gemini was
// chosen and how to swap this out). Deterministic — no network call, no cost, so local dev and
// manual testing work without an account. Returns one high-confidence fixed dish and one
// lower-confidence variable-oil dish, a reasonably realistic-looking plate.
export const stubVisionProvider: VisionProvider = async () => {
	return {
		dishes: [
			{ label: "Roti (whole wheat, plain)", confidence: 0.92, portionMultiplier: 2 },
			{ label: "Dal (tadka)", confidence: 0.55, portionMultiplier: 1 },
		],
	};
};
