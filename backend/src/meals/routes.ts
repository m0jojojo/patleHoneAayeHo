import type { Hono } from "hono";
import { HttpError } from "../auth/errors";
import type { AuthEnv } from "../auth/middleware";
import { requireSession } from "../auth/middleware";
import { calculateDishMacros, getDishByName, type OilLevel } from "../nutrition/dishes";
import { logMeal, validateLogMealInput } from "./log";
import { scanMeal } from "./scan";
import { getTodaySummary } from "./today";
import { getUsualMeals } from "./usual-meals";

const OIL_LEVELS: OilLevel[] = ["low", "medium", "high"];

function isValidOilLevel(value: unknown): value is OilLevel {
	return typeof value === "string" && (OIL_LEVELS as string[]).includes(value);
}

export function registerMealRoutes(app: Hono<AuthEnv>): void {
	app.post("/meals/scan", requireSession, async (c) => {
		const body = await c.req.json<{ imageBase64?: string }>().catch(() => ({}) as { imageBase64?: string });
		if (!body.imageBase64) {
			throw new HttpError(400, "imageBase64 is required");
		}

		const result = await scanMeal(c.env.DB, body.imageBase64);
		return c.json(result);
	});

	// Turns a resolved disambiguation answer (or a manual portion/oil adjustment) into concrete
	// macros for one dish, reusing the same lookup + oil-adjustment logic from Phase 5.
	app.post("/meals/dish-macros", requireSession, async (c) => {
		const body = await c.req
			.json<{ dishName?: string; oilLevel?: string; portionMultiplier?: number }>()
			.catch(() => ({}) as Record<string, unknown>);

		if (!body.dishName) {
			throw new HttpError(400, "dishName is required");
		}

		const dish = await getDishByName(c.env.DB, body.dishName);
		if (!dish) {
			throw new HttpError(404, `Unknown dish: ${body.dishName}`);
		}

		const oilLevel = isValidOilLevel(body.oilLevel) ? body.oilLevel : undefined;
		const portionMultiplier =
			typeof body.portionMultiplier === "number" && Number.isFinite(body.portionMultiplier)
				? body.portionMultiplier
				: undefined;

		const macros = calculateDishMacros(dish, { oilLevel, portionMultiplier });
		return c.json({ macros });
	});

	app.post("/meals/log", requireSession, async (c) => {
		const body = await c.req
			.json<{ dishLabels?: unknown; portionEstimate?: unknown; macros?: unknown; sourceImageRef?: string | null }>()
			.catch(() => ({}) as Record<string, unknown>);

		const error = validateLogMealInput(body);
		if (error) {
			throw new HttpError(400, error);
		}

		const { id, showSettingsNudge } = await logMeal(c.env.DB, c.get("user").id, {
			dishLabels: body.dishLabels as string[],
			portionEstimate: body.portionEstimate,
			macros: body.macros as { calories: number; proteinG: number; carbsG: number; fatG: number },
			sourceImageRef: body.sourceImageRef ?? null,
		});

		return c.json({ id, showSettingsNudge });
	});

	app.get("/meals/today", requireSession, async (c) => {
		const summary = await getTodaySummary(c.env.DB, c.get("user").id);
		return c.json(summary);
	});

	// Sorted by frequency - reused by Phase 8's recommendation engine to rank candidate additions.
	app.get("/meals/usual", requireSession, async (c) => {
		const usualMeals = await getUsualMeals(c.env.DB, c.get("user").id);
		return c.json({
			usualMeals: usualMeals.map((row) => ({
				dishLabels: JSON.parse(row.dish_labels) as string[],
				frequencyCount: row.frequency_count,
				lastLoggedAt: row.last_logged_at,
			})),
		});
	});
}
