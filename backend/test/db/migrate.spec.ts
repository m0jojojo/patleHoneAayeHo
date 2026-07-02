import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { appliedMigrationIds, migrateDown, migrateUp } from "../../src/db/migrate";
import { migrations } from "../../src/db/migrations";

async function tableNames(db: D1Database): Promise<string[]> {
	const { results } = await db
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('_migrations', '_cf_METADATA') ORDER BY name",
		)
		.all<{ name: string }>();
	return results.map((row) => row.name);
}

async function columnNames(db: D1Database, table: string): Promise<string[]> {
	const { results } = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
	return results.map((row) => row.name);
}

describe("migrations", () => {
	const ALL_TABLES = [
		"dishes",
		"meals_logged",
		"otp_requests",
		"protein_preferences",
		"sessions",
		"usual_meals",
		"users",
	].sort();

	it("registers all nine expected migrations in order", () => {
		expect(migrations.map((m) => m.id)).toEqual([
			"0001_create_users",
			"0002_create_protein_preferences",
			"0003_create_meals_logged",
			"0004_create_usual_meals",
			"0005_create_otp_requests",
			"0006_create_sessions",
			"0007_add_onboarding_completed_at",
			"0008_add_sex_to_users",
			"0009_create_dishes",
		]);
	});

	it("apply cleanly and create the expected tables", async () => {
		const applied = await migrateUp(env.DB, migrations);
		expect(applied).toEqual(migrations.map((m) => m.id));
		expect(await tableNames(env.DB)).toEqual(ALL_TABLES);
	});

	it("is idempotent - running up again applies nothing new", async () => {
		await migrateUp(env.DB, migrations);
		const secondRun = await migrateUp(env.DB, migrations);
		expect(secondRun).toEqual([]);
	});

	it("produces the expected columns for users", async () => {
		await migrateUp(env.DB, migrations);
		expect(await columnNames(env.DB, "users")).toEqual([
			"id",
			"phone_number",
			"created_at",
			"goal",
			"diet_type",
			"height",
			"weight",
			"age",
			"activity_level",
			"onboarding_completed_at",
			"sex",
		]);
	});

	it("produces the expected columns for protein_preferences", async () => {
		await migrateUp(env.DB, migrations);
		expect(await columnNames(env.DB, "protein_preferences")).toEqual([
			"id",
			"user_id",
			"protein_type",
			"frequency_comfort",
			"source",
			"created_at",
		]);
	});

	it("produces the expected columns for meals_logged", async () => {
		await migrateUp(env.DB, migrations);
		expect(await columnNames(env.DB, "meals_logged")).toEqual([
			"id",
			"user_id",
			"timestamp",
			"dish_labels",
			"portion_estimate",
			"macros",
			"source_image_ref",
		]);
	});

	it("produces the expected columns for usual_meals", async () => {
		await migrateUp(env.DB, migrations);
		expect(await columnNames(env.DB, "usual_meals")).toEqual([
			"user_id",
			"meal_signature",
			"frequency_count",
			"last_logged_at",
		]);
	});

	it("produces the expected columns for otp_requests", async () => {
		await migrateUp(env.DB, migrations);
		expect(await columnNames(env.DB, "otp_requests")).toEqual([
			"id",
			"phone_number",
			"code_hash",
			"attempts",
			"created_at",
			"expires_at",
			"consumed_at",
		]);
	});

	it("produces the expected columns for sessions", async () => {
		await migrateUp(env.DB, migrations);
		expect(await columnNames(env.DB, "sessions")).toEqual([
			"id",
			"token_hash",
			"user_id",
			"created_at",
			"expires_at",
		]);
	});

	it("rejects a protein_preferences row with an invalid source", async () => {
		await migrateUp(env.DB, migrations);
		await env.DB.prepare("INSERT INTO users (id, phone_number) VALUES ('u1', '+911234567890')").run();
		await expect(
			env.DB.prepare(
				"INSERT INTO protein_preferences (user_id, protein_type, frequency_comfort, source) VALUES ('u1', 'paneer', 'daily', 'guessed')",
			).run(),
		).rejects.toThrow();
	});

	it("rejects a users row with an invalid sex", async () => {
		await migrateUp(env.DB, migrations);
		await expect(
			env.DB.prepare("INSERT INTO users (id, phone_number, sex) VALUES ('u2', '+911234567891', 'other')").run(),
		).rejects.toThrow();
	});

	it("allows a null sex on users", async () => {
		await migrateUp(env.DB, migrations);
		await expect(
			env.DB.prepare("INSERT INTO users (id, phone_number) VALUES ('u3', '+911234567892')").run(),
		).resolves.toBeDefined();
	});

	it("rolls back cleanly, in reverse order", async () => {
		await migrateUp(env.DB, migrations);
		const reverted = await migrateDown(env.DB, migrations, migrations.length);
		expect(reverted).toEqual([...migrations].reverse().map((m) => m.id));
		expect(await tableNames(env.DB)).toEqual([]);
		expect(await appliedMigrationIds(env.DB)).toEqual([]);
	});

	it("rolls back only the most recently applied migration by default", async () => {
		await migrateUp(env.DB, migrations);
		const reverted = await migrateDown(env.DB, migrations);
		expect(reverted).toEqual(["0009_create_dishes"]);
		expect(await tableNames(env.DB)).not.toContain("dishes");
	});

	it("can be re-applied after a full rollback with no leftover state", async () => {
		await migrateUp(env.DB, migrations);
		await migrateDown(env.DB, migrations, migrations.length);
		const reapplied = await migrateUp(env.DB, migrations);
		expect(reapplied).toEqual(migrations.map((m) => m.id));
		expect(await tableNames(env.DB)).toEqual(ALL_TABLES);
	});

	it("seeds the dishes table with the expected number of rows", async () => {
		await migrateUp(env.DB, migrations);
		const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM dishes").all<{ count: number }>();
		expect(results[0].count).toBe(9);
	});
});
