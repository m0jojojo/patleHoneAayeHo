import { describe, expect, it } from "vitest";
import { calculateDailyTargets } from "../../src/nutrition/daily-targets";

describe("calculateDailyTargets", () => {
	const tdee = 2500;
	const weightKg = 80;

	it("gives build_muscle a higher protein target than lose_weight for the same TDEE", () => {
		const loseWeight = calculateDailyTargets({ tdee, weightKg, goal: "lose_weight" });
		const buildMuscle = calculateDailyTargets({ tdee, weightKg, goal: "build_muscle" });
		expect(buildMuscle.proteinG).toBeGreaterThan(loseWeight.proteinG);
	});

	it("matches hand-calculated values for lose_weight", () => {
		const targets = calculateDailyTargets({ tdee, weightKg, goal: "lose_weight" });
		expect(targets.calories).toBeCloseTo(2000, 5);
		expect(targets.proteinG).toBeCloseTo(160, 5);
		expect(targets.fatG).toBeCloseTo(55.5556, 3);
		expect(targets.carbsG).toBeCloseTo(215, 3);
	});

	it("matches hand-calculated values for build_muscle", () => {
		const targets = calculateDailyTargets({ tdee, weightKg, goal: "build_muscle" });
		expect(targets.calories).toBeCloseTo(2800, 5);
		expect(targets.proteinG).toBeCloseTo(176, 5);
		expect(targets.fatG).toBeCloseTo(77.7778, 3);
		expect(targets.carbsG).toBeCloseTo(349, 3);
	});

	it("matches hand-calculated values for eat_healthier", () => {
		const targets = calculateDailyTargets({ tdee, weightKg, goal: "eat_healthier" });
		expect(targets.calories).toBeCloseTo(2500, 5);
		expect(targets.proteinG).toBeCloseTo(128, 5);
		expect(targets.fatG).toBeCloseTo(83.3333, 3);
		expect(targets.carbsG).toBeCloseTo(309.5, 3);
	});

	it("build_muscle targets more calories than lose_weight for the same TDEE (surplus vs deficit)", () => {
		const loseWeight = calculateDailyTargets({ tdee, weightKg, goal: "lose_weight" });
		const buildMuscle = calculateDailyTargets({ tdee, weightKg, goal: "build_muscle" });
		expect(buildMuscle.calories).toBeGreaterThan(loseWeight.calories);
	});

	it("never drops calories below the 1200 floor even for a very low TDEE", () => {
		const targets = calculateDailyTargets({ tdee: 1000, weightKg: 50, goal: "lose_weight" });
		expect(targets.calories).toBe(1200);
	});

	it("never produces negative carbs", () => {
		const targets = calculateDailyTargets({ tdee: 1200, weightKg: 120, goal: "build_muscle" });
		expect(targets.carbsG).toBeGreaterThanOrEqual(0);
	});
});
