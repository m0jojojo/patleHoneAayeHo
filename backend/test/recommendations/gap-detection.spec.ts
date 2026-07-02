import { describe, expect, it } from "vitest";
import { shouldRecommendProteinGap } from "../../src/recommendations/gap-detection";

const MORNING = new Date("2026-01-01T10:00:00.000Z");
const LATE_NIGHT = new Date("2026-01-01T22:00:00.000Z");

describe("shouldRecommendProteinGap", () => {
	it("fires when protein is 15g+ short and it's before the cutoff hour", () => {
		expect(shouldRecommendProteinGap(15, MORNING)).toBe(true);
		expect(shouldRecommendProteinGap(30, MORNING)).toBe(true);
	});

	it("does not fire when the user is on-target on protein", () => {
		expect(shouldRecommendProteinGap(0, MORNING)).toBe(false);
	});

	it("does not fire when the user is over-target on protein (negative remaining)", () => {
		expect(shouldRecommendProteinGap(-10, MORNING)).toBe(false);
	});

	it("does not fire just under the threshold", () => {
		expect(shouldRecommendProteinGap(14.9, MORNING)).toBe(false);
	});

	it("does not fire after the cutoff hour, even with a large gap", () => {
		expect(shouldRecommendProteinGap(50, LATE_NIGHT)).toBe(false);
	});
});
