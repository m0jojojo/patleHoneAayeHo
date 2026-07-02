import type { Hono } from "hono";
import type { AuthEnv } from "../auth/middleware";
import { requireSession } from "../auth/middleware";
import { getUserDailyTargets } from "./user-targets";

export function registerNutritionRoutes(app: Hono<AuthEnv>): void {
	app.get("/nutrition/daily-targets", requireSession, async (c) => {
		const targets = await getUserDailyTargets(c.env.DB, c.get("user").id);
		return c.json(targets);
	});
}
