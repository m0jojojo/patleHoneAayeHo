import type { Context, Next } from "hono";
import { validateSession, type SessionUser } from "./session";

export type AuthEnv = { Bindings: Env; Variables: { user: SessionUser } };

export async function requireSession(c: Context<AuthEnv>, next: Next): Promise<Response | void> {
	const authHeader = c.req.header("Authorization") ?? "";
	const [scheme, token] = authHeader.split(" ");

	if (scheme !== "Bearer" || !token) {
		return c.json({ error: "Missing or invalid Authorization header" }, 401);
	}

	const user = await validateSession(c.env.DB, token);
	if (!user) {
		return c.json({ error: "Invalid or expired session" }, 401);
	}

	c.set("user", user);
	await next();
}
