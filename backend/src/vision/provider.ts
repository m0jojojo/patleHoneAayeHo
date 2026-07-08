import type { DishMacros } from "../nutrition/dishes";
import { scanWithGemini } from "./gemini";

export interface VisionDish {
	// Must match a `dishes.name` row for nutrition lookup to succeed (see src/meals/scan.ts).
	label: string;
	confidence: number; // 0-1
	portionMultiplier: number; // 1 = a standard portion - only meaningful when label matches a known dish name
	// The vision provider's own best-guess macros for the whole visible quantity (not per portion).
	// Only used by scanMeal as a fallback when `label` doesn't match a `dishes` row - a catalog
	// lookup is trusted over this whenever one is available.
	estimatedMacros?: DishMacros;
}

export interface VisionResult {
	dishes: VisionDish[];
}

export type VisionProvider = (imageBase64: string) => Promise<VisionResult>;

// Deterministic fallback — no network call, no cost, so local dev and manual testing work without
// a Gemini account. Returns one high-confidence fixed dish and one lower-confidence variable-oil
// dish, a reasonably realistic-looking plate.
export const stubVisionProvider: VisionProvider = async () => {
	return {
		dishes: [
			{ label: "Roti (whole wheat, plain)", confidence: 0.92, portionMultiplier: 2 },
			{ label: "Dal (tadka)", confidence: 0.55, portionMultiplier: 1 },
		],
	};
};

// On/off based on whether a Gemini API key is configured (see docs/meal-scanning.md) — mirrors
// `auth/send-otp.ts`'s pattern for MSG91. Returns undefined (fall back to the stub) when no key is
// set, so local dev and CI never need a real account.
export function createVisionProvider(geminiApiKey: string | undefined): VisionProvider | undefined {
	if (!geminiApiKey) return undefined;
	return (imageBase64) => scanWithGemini(geminiApiKey, imageBase64);
}
