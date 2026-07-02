import { Hono } from "hono";
import { HttpError } from "./auth/errors";
import type { AuthEnv } from "./auth/middleware";
import { requireSession } from "./auth/middleware";
import { requestOtp, verifyOtp } from "./auth/otp";
import { createSession } from "./auth/session";
import { registerOnboardingRoutes } from "./onboarding/routes";
import { registerNutritionRoutes } from "./nutrition/routes";
import { registerMealRoutes } from "./meals/routes";

const app = new Hono<AuthEnv>();

app.onError((err, c) => {
	if (err instanceof HttpError) {
		return c.json({ error: err.message }, err.status as 400 | 401 | 404 | 429);
	}
	console.error(err);
	return c.json({ error: "Internal error" }, 500);
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/auth/otp/request", async (c) => {
	const body = await c.req.json<{ phoneNumber?: string }>().catch(() => ({}) as { phoneNumber?: string });
	if (!body.phoneNumber) {
		throw new HttpError(400, "phoneNumber is required");
	}

	await requestOtp(c.env.DB, body.phoneNumber);
	return c.json({ success: true });
});

app.post("/auth/otp/verify", async (c) => {
	const body = await c.req
		.json<{ phoneNumber?: string; code?: string }>()
		.catch(() => ({}) as { phoneNumber?: string; code?: string });
	if (!body.phoneNumber || !body.code) {
		throw new HttpError(400, "phoneNumber and code are required");
	}

	const { userId } = await verifyOtp(c.env.DB, body.phoneNumber, body.code);
	const { token } = await createSession(c.env.DB, userId);
	return c.json({ token });
});

app.get("/auth/me", requireSession, (c) => {
	return c.json({ user: c.get("user") });
});

registerOnboardingRoutes(app);
registerNutritionRoutes(app);
registerMealRoutes(app);

export default app;
