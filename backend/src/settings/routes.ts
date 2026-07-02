import type { Hono } from "hono";
import { HttpError } from "../auth/errors";
import type { AuthEnv } from "../auth/middleware";
import { requireSession } from "../auth/middleware";
import { isValidFrequencyComfort, isValidProteinId, PROTEIN_TYPES } from "../onboarding/constants";

interface ProteinPreferenceRow {
	protein_type: string;
	frequency_comfort: string;
	source: string;
}

function proteinLabel(proteinType: string): string {
	return PROTEIN_TYPES.find((protein) => protein.id === proteinType)?.label ?? proteinType;
}

// The "My Proteins" settings screen (Phase 9) - lets a user directly set how often they want a
// protein they already selected during onboarding to be recommended. This is the only thing that
// ever writes source = 'explicit', which Phase 8's recommendation ranking always prioritizes
// first.
export function registerSettingsRoutes(app: Hono<AuthEnv>): void {
	app.get("/settings/protein-preferences", requireSession, async (c) => {
		const { results } = await c.env.DB.prepare(
			"SELECT protein_type, frequency_comfort, source FROM protein_preferences WHERE user_id = ? ORDER BY id ASC",
		)
			.bind(c.get("user").id)
			.all<ProteinPreferenceRow>();

		return c.json({
			preferences: results.map((row) => ({
				proteinType: row.protein_type,
				proteinLabel: proteinLabel(row.protein_type),
				frequencyComfort: row.frequency_comfort,
				source: row.source,
			})),
		});
	});

	app.patch("/settings/protein-frequency", requireSession, async (c) => {
		const body = await c.req
			.json<{ proteinType?: string; frequencyComfort?: string }>()
			.catch(() => ({}) as Record<string, unknown>);

		if (!body.proteinType || !isValidProteinId(body.proteinType)) {
			throw new HttpError(400, "proteinType must be a known protein id");
		}
		if (!isValidFrequencyComfort(body.frequencyComfort)) {
			throw new HttpError(400, "frequencyComfort must be one of: rarely, few_times_a_week, daily");
		}

		const userId = c.get("user").id;
		const existing = await c.env.DB.prepare(
			"SELECT id FROM protein_preferences WHERE user_id = ? AND protein_type = ?",
		)
			.bind(userId, body.proteinType)
			.first<{ id: number }>();

		if (!existing) {
			// Settings only ever adjusts a protein the user already selected during onboarding -
			// never adds a new one (that would be a new preference, not a frequency setting).
			throw new HttpError(404, "You haven't selected this protein, so there's nothing to update.");
		}

		await c.env.DB.prepare(
			"UPDATE protein_preferences SET frequency_comfort = ?, source = 'explicit' WHERE user_id = ? AND protein_type = ?",
		)
			.bind(body.frequencyComfort, userId, body.proteinType)
			.run();

		return c.json({ success: true });
	});
}
