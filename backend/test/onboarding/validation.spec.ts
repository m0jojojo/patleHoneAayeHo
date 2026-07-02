import { describe, expect, it } from "vitest";
import { isValidActivityLevel, isValidDietType, isValidGoal, validateBodyStats } from "../../src/onboarding/validation";

describe("isValidGoal / isValidDietType / isValidActivityLevel", () => {
	it("accepts the known enum values", () => {
		expect(isValidGoal("lose_weight")).toBe(true);
		expect(isValidDietType("vegan")).toBe(true);
		expect(isValidActivityLevel("moderate")).toBe(true);
	});

	it("rejects unknown values", () => {
		expect(isValidGoal("get_ripped")).toBe(false);
		expect(isValidDietType("carnivore")).toBe(false);
		expect(isValidActivityLevel("lazy")).toBe(false);
	});
});

describe("validateBodyStats", () => {
	const valid = { height: 170, weight: 70, age: 35, activityLevel: "moderate" as const };

	it("accepts a realistic profile", () => {
		expect(validateBodyStats(valid)).toBeNull();
	});

	it("rejects zero height", () => {
		expect(validateBodyStats({ ...valid, height: 0 })).toMatch(/height/i);
	});

	it("rejects negative weight", () => {
		expect(validateBodyStats({ ...valid, weight: -70 })).toMatch(/weight/i);
	});

	it("rejects age over 120", () => {
		expect(validateBodyStats({ ...valid, age: 121 })).toMatch(/age/i);
	});

	it("rejects a non-integer age", () => {
		expect(validateBodyStats({ ...valid, age: 35.5 })).toMatch(/age/i);
	});

	it("rejects an invalid activity level", () => {
		expect(validateBodyStats({ ...valid, activityLevel: "lazy" })).toMatch(/activity/i);
	});

	it("rejects missing fields", () => {
		expect(validateBodyStats({})).not.toBeNull();
	});
});
