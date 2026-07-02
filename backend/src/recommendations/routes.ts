import type { Hono } from "hono";
import { HttpError } from "../auth/errors";
import type { AuthEnv } from "../auth/middleware";
import { requireSession } from "../auth/middleware";
import { isValidProteinId } from "../onboarding/constants";
import { countDismissalsSinceLastAccepted, recordDismissal, REPEATED_DISMISSAL_THRESHOLD } from "./dismiss";
import { getProteinGapRecommendation } from "./recommend";

export function registerRecommendationRoutes(app: Hono<AuthEnv>): void {
	app.get("/recommendations/current", requireSession, async (c) => {
		const recommendation = await getProteinGapRecommendation(c.env.DB, c.get("user").id);
		return c.json({ recommendation });
	});

	app.post("/recommendations/dismiss", requireSession, async (c) => {
		const body = await c.req.json<{ proteinType?: string }>().catch(() => ({}) as { proteinType?: string });
		if (!body.proteinType || !isValidProteinId(body.proteinType)) {
			throw new HttpError(400, "proteinType must be a known protein id");
		}

		const userId = c.get("user").id;
		await recordDismissal(c.env.DB, userId, body.proteinType);

		const consecutiveDismissals = await countDismissalsSinceLastAccepted(c.env.DB, userId, body.proteinType);
		const suggestFrequencyPrompt = consecutiveDismissals >= REPEATED_DISMISSAL_THRESHOLD;

		return c.json({ success: true, suggestFrequencyPrompt });
	});
}
