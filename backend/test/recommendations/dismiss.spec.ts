import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { countDismissalsSinceLastAccepted, recordDismissal } from "../../src/recommendations/dismiss";
import { applyMigrations } from "../helpers/setup";
import { signUpAndGetToken } from "../helpers/signup";

const PHONE = "+919876543210";

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

async function logMeal(userId: string, dishLabels: string[], at: Date) {
	await env.DB.prepare(
		"INSERT INTO meals_logged (id, user_id, timestamp, dish_labels, portion_estimate, macros, source_image_ref) VALUES (?, ?, ?, ?, ?, ?, NULL)",
	)
		.bind(crypto.randomUUID(), userId, at.toISOString(), JSON.stringify(dishLabels), JSON.stringify({}), JSON.stringify({}))
		.run();
}

describe("countDismissalsSinceLastAccepted", () => {
	it("is zero when a protein has never been dismissed", async () => {
		const userId = await createUser();
		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "paneer")).toBe(0);
	});

	it("counts up with each dismissal", async () => {
		const userId = await createUser();
		await recordDismissal(env.DB, userId, "paneer", new Date("2026-01-01T00:00:00.000Z"));
		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "paneer")).toBe(1);

		await recordDismissal(env.DB, userId, "paneer", new Date("2026-01-02T00:00:00.000Z"));
		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "paneer")).toBe(2);
	});

	it("resets to zero once the user logs a meal containing that protein (accepting it)", async () => {
		const userId = await createUser();
		await recordDismissal(env.DB, userId, "paneer", new Date("2026-01-01T00:00:00.000Z"));
		await recordDismissal(env.DB, userId, "paneer", new Date("2026-01-02T00:00:00.000Z"));
		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "paneer")).toBe(2);

		await logMeal(userId, ["Paneer curry"], new Date("2026-01-03T00:00:00.000Z"));
		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "paneer")).toBe(0);

		// Dismissals continue counting fresh after the reset.
		await recordDismissal(env.DB, userId, "paneer", new Date("2026-01-04T00:00:00.000Z"));
		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "paneer")).toBe(1);
	});

	it("tracks each protein independently", async () => {
		const userId = await createUser();
		await recordDismissal(env.DB, userId, "paneer", new Date("2026-01-01T00:00:00.000Z"));
		await recordDismissal(env.DB, userId, "paneer", new Date("2026-01-02T00:00:00.000Z"));
		await recordDismissal(env.DB, userId, "dal_lentils", new Date("2026-01-01T00:00:00.000Z"));

		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "paneer")).toBe(2);
		expect(await countDismissalsSinceLastAccepted(env.DB, userId, "dal_lentils")).toBe(1);
	});
});

describe("POST /recommendations/dismiss - repeated-dismissal prompt", () => {
	function authedFetch(path: string, token: string, init: RequestInit = {}) {
		return SELF.fetch(`https://example.com${path}`, {
			...init,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				...init.headers,
			},
		});
	}

	function dismiss(token: string, proteinType: string) {
		return authedFetch("/recommendations/dismiss", token, {
			method: "POST",
			body: JSON.stringify({ proteinType }),
		});
	}

	it("does not suggest a frequency prompt before the threshold (3) is reached", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);

		const first = await dismiss(token, "paneer");
		expect((await first.json<{ suggestFrequencyPrompt: boolean }>()).suggestFrequencyPrompt).toBe(false);

		const second = await dismiss(token, "paneer");
		expect((await second.json<{ suggestFrequencyPrompt: boolean }>()).suggestFrequencyPrompt).toBe(false);
	});

	it("suggests a frequency prompt on the 3rd consecutive dismissal of the same protein", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);

		await dismiss(token, "paneer");
		await dismiss(token, "paneer");
		const third = await dismiss(token, "paneer");

		expect((await third.json<{ suggestFrequencyPrompt: boolean }>()).suggestFrequencyPrompt).toBe(true);
	});

	it("does not count dismissals of a different protein toward the threshold", async () => {
		const token = await signUpAndGetToken(env.DB, PHONE);

		await dismiss(token, "paneer");
		await dismiss(token, "dal_lentils");
		const third = await dismiss(token, "paneer");

		// Only 2 dismissals of paneer specifically - dal_lentils' dismissal doesn't count toward it.
		expect((await third.json<{ suggestFrequencyPrompt: boolean }>()).suggestFrequencyPrompt).toBe(false);
	});
});
