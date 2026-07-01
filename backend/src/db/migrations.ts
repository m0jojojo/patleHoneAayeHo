import type { Migration } from "./types";

import createUsersUp from "../../migrations/0001_create_users.up.sql";
import createUsersDown from "../../migrations/0001_create_users.down.sql";
import createProteinPreferencesUp from "../../migrations/0002_create_protein_preferences.up.sql";
import createProteinPreferencesDown from "../../migrations/0002_create_protein_preferences.down.sql";
import createMealsLoggedUp from "../../migrations/0003_create_meals_logged.up.sql";
import createMealsLoggedDown from "../../migrations/0003_create_meals_logged.down.sql";
import createUsualMealsUp from "../../migrations/0004_create_usual_meals.up.sql";
import createUsualMealsDown from "../../migrations/0004_create_usual_meals.down.sql";

// Each migration's up/down SQL is authored in migrations/*.sql (the same files the CLI runner,
// scripts/migrate.mjs, applies via `wrangler d1 execute`) and imported here as raw text so the
// exact same statements are exercised by tests.
export const migrations: Migration[] = [
	{ id: "0001_create_users", up: [createUsersUp], down: [createUsersDown] },
	{
		id: "0002_create_protein_preferences",
		up: [createProteinPreferencesUp],
		down: [createProteinPreferencesDown],
	},
	{ id: "0003_create_meals_logged", up: [createMealsLoggedUp], down: [createMealsLoggedDown] },
	{ id: "0004_create_usual_meals", up: [createUsualMealsUp], down: [createUsualMealsDown] },
];
