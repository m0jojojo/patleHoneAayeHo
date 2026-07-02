import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { getPassiveOverrideProtein } from "../../src/recommendations/passive-override";
import { applyMigrations } from "../helpers/setup";

const NOW = new Date("2026-01-15T10:00:00.000Z");

beforeEach(async () => {
	await applyMigrations(env.DB);
});

async function createUser(): Promise<string> {
	const id = crypto.randomUUID();
	await env.DB.prepare("INSERT INTO users (id, phone_number) VALUES (?, ?)")
		.bind(id, `+91${Math.floor(Math.random() * 1_000_000_000)}`)
		.run();
	return id;
}

async function logMeal(userId: string, dishLabels: string[], daysAgo: number) {
	const timestamp = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60_000).toISOString();
	await env.DB.prepare(
		"INSERT INTO meals_logged (id, user_id, timestamp, dish_labels, portion_estimate, macros, source_image_ref) VALUES (?, ?, ?, ?, ?, ?, NULL)",
	)
		.bind(crypto.randomUUID(), userId, timestamp, JSON.stringify(dishLabels), JSON.stringify({}), JSON.stringify({}))
		.run();
}

describe("getPassiveOverrideProtein", () => {
	it("returns null when no candidate has met the 5-log threshold", async () => {
		const userId = await createUser();
		for (let i = 0; i < 4; i += 1) await logMeal(userId, ["Paneer curry"], i);

		expect(await getPassiveOverrideProtein(env.DB, userId, ["paneer", "dal_lentils"], NOW)).toBeNull();
	});

	it("returns the protein once it has 5+ logs in the window and every competitor has zero", async () => {
		const userId = await createUser();
		for (let i = 0; i < 5; i += 1) await logMeal(userId, ["Paneer curry"], i);

		expect(await getPassiveOverrideProtein(env.DB, userId, ["paneer", "dal_lentils"], NOW)).toBe("paneer");
	});

	it("returns null when a competing candidate has any logs at all, even just one", async () => {
		const userId = await createUser();
		for (let i = 0; i < 5; i += 1) await logMeal(userId, ["Paneer curry"], i);
		await logMeal(userId, ["Dal (tadka)"], 1);

		expect(await getPassiveOverrideProtein(env.DB, userId, ["paneer", "dal_lentils"], NOW)).toBeNull();
	});

	it("ignores logs older than the 14-day window", async () => {
		const userId = await createUser();
		for (let i = 0; i < 5; i += 1) await logMeal(userId, ["Paneer curry"], 20 + i);

		expect(await getPassiveOverrideProtein(env.DB, userId, ["paneer", "dal_lentils"], NOW)).toBeNull();
	});

	it("counts one occurrence per meal, not per dish, even if the protein appears twice in one meal", async () => {
		const userId = await createUser();
		// Same meal logged 5 times, each containing paneer only once - this should count as 5.
		for (let i = 0; i < 5; i += 1) await logMeal(userId, ["Paneer curry", "Roti (whole wheat, plain)"], i);

		expect(await getPassiveOverrideProtein(env.DB, userId, ["paneer", "dal_lentils"], NOW)).toBe("paneer");
	});

	it("returns null when there are no candidates", async () => {
		const userId = await createUser();
		expect(await getPassiveOverrideProtein(env.DB, userId, [], NOW)).toBeNull();
	});

	it("returns null when two candidates both meet the threshold (ambiguous, not unanimous)", async () => {
		const userId = await createUser();
		for (let i = 0; i < 5; i += 1) await logMeal(userId, ["Paneer curry"], i);
		for (let i = 0; i < 5; i += 1) await logMeal(userId, ["Dal (tadka)"], i + 10);

		expect(await getPassiveOverrideProtein(env.DB, userId, ["paneer", "dal_lentils"], NOW)).toBeNull();
	});
});
