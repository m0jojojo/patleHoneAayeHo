import { migrateUp } from "../../src/db/migrate";
import { migrations } from "../../src/db/migrations";

export async function applyMigrations(db: D1Database): Promise<void> {
	await migrateUp(db, migrations);
}
