#!/usr/bin/env node
// CLI runner for the SQL files in migrations/. Applies them to a real D1 instance
// (local by default, or --remote) via `wrangler d1 execute`, tracked in a `_migrations` table.
//
// Usage:
//   node scripts/migrate.mjs up [--remote]
//   node scripts/migrate.mjs down [--steps=N] [--remote]
//   node scripts/migrate.mjs status [--remote]
//
// The actual up/down behavior is also covered by test/db/migrate.spec.ts, which runs the same
// migrations/*.sql files against an in-memory D1 instance — this script is just the plumbing to
// apply them to a persistent local or remote D1 database during development/deployment.

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const WRANGLER_BIN = path.join(__dirname, "..", "node_modules", "wrangler", "bin", "wrangler.js");

// Must match wrangler.jsonc's d1_databases[0].database_name.
const DATABASE_NAME = "ingredient-first-db";

function listMigrationIds() {
	const files = readdirSync(MIGRATIONS_DIR);
	const ids = new Set(files.map((file) => file.replace(/\.(up|down)\.sql$/, "")));
	return Array.from(ids).sort();
}

function wranglerD1Execute({ sql, file, remote }) {
	const args = ["d1", "execute", DATABASE_NAME, remote ? "--remote" : "--local", "--json"];
	if (file) args.push("--file", file);
	if (sql) args.push("--command", sql);

	const output = execFileSync(process.execPath, [WRANGLER_BIN, ...args], { encoding: "utf-8" });
	// `--remote` prints upload/progress lines (e.g. "├ Checking if file needs uploading") before
	// the JSON result, which `--local` doesn't - strip anything before the JSON array starts.
	const jsonStart = output.indexOf("[");
	return JSON.parse(jsonStart === -1 ? output : output.slice(jsonStart));
}

function ensureMigrationsTable(remote) {
	wranglerD1Execute({
		remote,
		sql: "CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))",
	});
}

function appliedIds(remote) {
	const result = wranglerD1Execute({
		remote,
		sql: "SELECT id FROM _migrations ORDER BY applied_at ASC, id ASC",
	});
	return (result[0]?.results ?? []).map((row) => row.id);
}

function up(remote) {
	ensureMigrationsTable(remote);
	const applied = new Set(appliedIds(remote));
	const pending = listMigrationIds().filter((id) => !applied.has(id));

	for (const id of pending) {
		console.log(`Applying ${id}...`);
		wranglerD1Execute({ remote, file: path.join(MIGRATIONS_DIR, `${id}.up.sql`) });
		wranglerD1Execute({ remote, sql: `INSERT INTO _migrations (id) VALUES ('${id}')` });
	}

	console.log(pending.length === 0 ? "Already up to date." : `Applied ${pending.length} migration(s).`);
}

function down(remote, steps) {
	ensureMigrationsTable(remote);
	const toRevert = appliedIds(remote).slice(-steps).reverse();

	if (toRevert.length === 0) {
		console.log("Nothing to roll back.");
		return;
	}

	for (const id of toRevert) {
		console.log(`Rolling back ${id}...`);
		wranglerD1Execute({ remote, file: path.join(MIGRATIONS_DIR, `${id}.down.sql`) });
		wranglerD1Execute({ remote, sql: `DELETE FROM _migrations WHERE id = '${id}'` });
	}

	console.log(`Rolled back ${toRevert.length} migration(s).`);
}

function status(remote) {
	ensureMigrationsTable(remote);
	const applied = new Set(appliedIds(remote));
	for (const id of listMigrationIds()) {
		console.log(`${applied.has(id) ? "[applied]" : "[pending]"}  ${id}`);
	}
}

const [, , command, ...rest] = process.argv;
const remote = rest.includes("--remote");
const stepsArg = rest.find((arg) => arg.startsWith("--steps="));
const steps = stepsArg ? Number(stepsArg.split("=")[1]) : 1;

switch (command) {
	case "up":
		up(remote);
		break;
	case "down":
		down(remote, steps);
		break;
	case "status":
		status(remote);
		break;
	default:
		console.error("Usage: node scripts/migrate.mjs <up|down|status> [--remote] [--steps=N]");
		process.exit(1);
}
