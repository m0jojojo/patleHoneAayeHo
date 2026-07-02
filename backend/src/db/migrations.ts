import type { Migration } from "./types";

import createUsersUp from "../../migrations/0001_create_users.up.sql";
import createUsersDown from "../../migrations/0001_create_users.down.sql";
import createProteinPreferencesUp from "../../migrations/0002_create_protein_preferences.up.sql";
import createProteinPreferencesDown from "../../migrations/0002_create_protein_preferences.down.sql";
import createMealsLoggedUp from "../../migrations/0003_create_meals_logged.up.sql";
import createMealsLoggedDown from "../../migrations/0003_create_meals_logged.down.sql";
import createUsualMealsUp from "../../migrations/0004_create_usual_meals.up.sql";
import createUsualMealsDown from "../../migrations/0004_create_usual_meals.down.sql";
import createOtpRequestsUp from "../../migrations/0005_create_otp_requests.up.sql";
import createOtpRequestsDown from "../../migrations/0005_create_otp_requests.down.sql";
import createSessionsUp from "../../migrations/0006_create_sessions.up.sql";
import createSessionsDown from "../../migrations/0006_create_sessions.down.sql";
import addOnboardingCompletedAtUp from "../../migrations/0007_add_onboarding_completed_at.up.sql";
import addOnboardingCompletedAtDown from "../../migrations/0007_add_onboarding_completed_at.down.sql";
import addSexToUsersUp from "../../migrations/0008_add_sex_to_users.up.sql";
import addSexToUsersDown from "../../migrations/0008_add_sex_to_users.down.sql";
import createDishesUp from "../../migrations/0009_create_dishes.up.sql";
import createDishesDown from "../../migrations/0009_create_dishes.down.sql";
import addDishLabelsToUsualMealsUp from "../../migrations/0010_add_dish_labels_to_usual_meals.up.sql";
import addDishLabelsToUsualMealsDown from "../../migrations/0010_add_dish_labels_to_usual_meals.down.sql";

// Splits a .sql file's raw text into individual statements on ";", so a single file can contain
// more than one statement (e.g. a CREATE TABLE followed by seed INSERTs) while each statement is
// still run as its own db.prepare() call, as D1 requires.
function statements(sql: string): string[] {
	return sql
		.split(";")
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0);
}

// Each migration's up/down SQL is authored in migrations/*.sql (the same files the CLI runner,
// scripts/migrate.mjs, applies via `wrangler d1 execute`) and imported here as raw text so the
// exact same statements are exercised by tests.
export const migrations: Migration[] = [
	{ id: "0001_create_users", up: statements(createUsersUp), down: statements(createUsersDown) },
	{
		id: "0002_create_protein_preferences",
		up: statements(createProteinPreferencesUp),
		down: statements(createProteinPreferencesDown),
	},
	{
		id: "0003_create_meals_logged",
		up: statements(createMealsLoggedUp),
		down: statements(createMealsLoggedDown),
	},
	{
		id: "0004_create_usual_meals",
		up: statements(createUsualMealsUp),
		down: statements(createUsualMealsDown),
	},
	{
		id: "0005_create_otp_requests",
		up: statements(createOtpRequestsUp),
		down: statements(createOtpRequestsDown),
	},
	{ id: "0006_create_sessions", up: statements(createSessionsUp), down: statements(createSessionsDown) },
	{
		id: "0007_add_onboarding_completed_at",
		up: statements(addOnboardingCompletedAtUp),
		down: statements(addOnboardingCompletedAtDown),
	},
	{
		id: "0008_add_sex_to_users",
		up: statements(addSexToUsersUp),
		down: statements(addSexToUsersDown),
	},
	{ id: "0009_create_dishes", up: statements(createDishesUp), down: statements(createDishesDown) },
	{
		id: "0010_add_dish_labels_to_usual_meals",
		up: statements(addDishLabelsToUsualMealsUp),
		down: statements(addDishLabelsToUsualMealsDown),
	},
];
