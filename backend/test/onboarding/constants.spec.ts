import { describe, expect, it } from "vitest";
import {
	getAllowedProteinTypes,
	isProteinAllowedForDietType,
	isValidProteinId,
	PROTEIN_TYPES,
} from "../../src/onboarding/constants";

describe("diet-type protein filtering", () => {
	it("never allows chicken or fish for a vegetarian - highest-risk trust rule in the app", () => {
		const allowed = getAllowedProteinTypes("vegetarian").map((p) => p.id);
		expect(allowed).not.toContain("chicken");
		expect(allowed).not.toContain("fish");
	});

	it("never allows chicken or fish for an eggetarian, but does allow eggs", () => {
		const allowed = getAllowedProteinTypes("eggetarian").map((p) => p.id);
		expect(allowed).not.toContain("chicken");
		expect(allowed).not.toContain("fish");
		expect(allowed).toContain("eggs");
	});

	it("excludes eggs and dairy in addition to meat/fish for a vegan", () => {
		const allowed = getAllowedProteinTypes("vegan").map((p) => p.id);
		expect(allowed).not.toContain("chicken");
		expect(allowed).not.toContain("fish");
		expect(allowed).not.toContain("eggs");
		expect(allowed).not.toContain("paneer");
		expect(allowed).not.toContain("dairy");
		expect(allowed).toContain("dal_lentils");
	});

	it("allows every protein type for non_veg", () => {
		const allowed = getAllowedProteinTypes("non_veg").map((p) => p.id);
		expect(allowed).toEqual(PROTEIN_TYPES.map((p) => p.id));
	});

	it("isProteinAllowedForDietType agrees with getAllowedProteinTypes", () => {
		for (const dietType of ["vegetarian", "eggetarian", "non_veg", "vegan"] as const) {
			const allowedIds = new Set(getAllowedProteinTypes(dietType).map((p) => p.id));
			for (const protein of PROTEIN_TYPES) {
				expect(isProteinAllowedForDietType(protein.id, dietType)).toBe(allowedIds.has(protein.id));
			}
		}
	});

	it("rejects an unknown protein id", () => {
		expect(isValidProteinId("beef")).toBe(false);
		expect(isValidProteinId("chicken")).toBe(true);
	});
});
