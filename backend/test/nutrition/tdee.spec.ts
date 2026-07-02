import { describe, expect, it } from "vitest";
import { calculateBMR, calculateTDEE } from "../../src/nutrition/tdee";

// Reference values hand-calculated with Mifflin-St Jeor:
//   men:   BMR = 10*weight(kg) + 6.25*height(cm) - 5*age + 5
//   women: BMR = 10*weight(kg) + 6.25*height(cm) - 5*age - 161
//   TDEE = BMR * activity multiplier (sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9)
describe("calculateBMR / calculateTDEE", () => {
	it("matches a hand-calculated profile: male, 35, 75kg, 175cm, moderate", () => {
		const profile = { sex: "male" as const, weightKg: 75, heightCm: 175, age: 35, activityLevel: "moderate" as const };
		expect(calculateBMR(profile)).toBeCloseTo(1673.75, 5);
		expect(calculateTDEE(profile)).toBeCloseTo(2594.3125, 5);
	});

	it("matches a hand-calculated profile: female, 45, 65kg, 160cm, light", () => {
		const profile = { sex: "female" as const, weightKg: 65, heightCm: 160, age: 45, activityLevel: "light" as const };
		expect(calculateBMR(profile)).toBeCloseTo(1264, 5);
		expect(calculateTDEE(profile)).toBeCloseTo(1738, 5);
	});

	it("matches a hand-calculated profile: male, 50, 90kg, 180cm, sedentary", () => {
		const profile = { sex: "male" as const, weightKg: 90, heightCm: 180, age: 50, activityLevel: "sedentary" as const };
		expect(calculateBMR(profile)).toBeCloseTo(1780, 5);
		expect(calculateTDEE(profile)).toBeCloseTo(2136, 5);
	});

	it("gives a lower BMR for a woman than a man with identical weight/height/age", () => {
		const shared = { weightKg: 70, heightCm: 170, age: 30 };
		const male = calculateBMR({ ...shared, sex: "male" });
		const female = calculateBMR({ ...shared, sex: "female" });
		expect(female).toBeLessThan(male);
		expect(male - female).toBeCloseTo(166, 5); // the +5 vs -161 constants differ by 166
	});

	it("increases TDEE monotonically with activity level for the same BMR", () => {
		const base = { sex: "male" as const, weightKg: 80, heightCm: 178, age: 40 };
		const levels = ["sedentary", "light", "moderate", "active", "very_active"] as const;
		const tdees = levels.map((activityLevel) => calculateTDEE({ ...base, activityLevel }));
		for (let i = 1; i < tdees.length; i++) {
			expect(tdees[i]).toBeGreaterThan(tdees[i - 1]);
		}
	});
});
