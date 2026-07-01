import type { Migration } from "./types";

export async function ensureMigrationsTable(db: D1Database): Promise<void> {
	await db.exec(
		"CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))",
	);
}

export async function appliedMigrationIds(db: D1Database): Promise<string[]> {
	const { results } = await db
		.prepare("SELECT id FROM _migrations ORDER BY applied_at ASC, id ASC")
		.all<{ id: string }>();
	return results.map((row) => row.id);
}

// Applies every migration not yet recorded in `_migrations`, in array order.
// Each migration's statements + its tracking row commit together via batch(), so a
// failure partway through a migration can't leave `_migrations` out of sync with the schema.
export async function migrateUp(db: D1Database, migrations: Migration[]): Promise<string[]> {
	await ensureMigrationsTable(db);
	const applied = new Set(await appliedMigrationIds(db));
	const newlyApplied: string[] = [];

	for (const migration of migrations) {
		if (applied.has(migration.id)) continue;

		await db.batch([
			...migration.up.map((sql) => db.prepare(sql)),
			db.prepare("INSERT INTO _migrations (id) VALUES (?)").bind(migration.id),
		]);
		newlyApplied.push(migration.id);
	}

	return newlyApplied;
}

// Rolls back the most recently applied `steps` migrations, most recent first.
export async function migrateDown(
	db: D1Database,
	migrations: Migration[],
	steps: number = 1,
): Promise<string[]> {
	await ensureMigrationsTable(db);
	const applied = await appliedMigrationIds(db);
	const toRevert = applied.slice(-steps).reverse();
	const byId = new Map(migrations.map((migration) => [migration.id, migration]));
	const reverted: string[] = [];

	for (const id of toRevert) {
		const migration = byId.get(id);
		if (!migration) {
			throw new Error(`Cannot roll back unknown migration: ${id}`);
		}

		await db.batch([
			...migration.down.map((sql) => db.prepare(sql)),
			db.prepare("DELETE FROM _migrations WHERE id = ?").bind(id),
		]);
		reverted.push(id);
	}

	return reverted;
}
