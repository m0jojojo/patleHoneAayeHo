# Onboarding flow

Five screens a new user completes right after phone verification (Phase 3), ending with a
populated profile and landing in the main app.

## The non-negotiable rule

**A vegetarian must never see or be recommended chicken or fish. Ever.** This is enforced in two
independent places, on purpose:

1. **Frontend (Screen 3)** filters the protein list shown, based on the diet type chosen on
   Screen 2 — so the user never even sees a disallowed option.
2. **Backend** re-validates the same rule when protein preferences are saved, rejecting the
   request if a disallowed protein sneaks through (e.g. a direct API call bypassing the app).

Both sides use the same list of rules, kept in two files (no shared package between the apps
yet): `backend/src/onboarding/constants.ts` and `frontend/src/onboarding/constants.ts`. If you
ever need to change which proteins are excluded for a diet type, change both.

## Screens, in order

### Screen 1 — Goal

*"What's your goal?"* One of:

| Value | Label |
|---|---|
| `lose_weight` | Lose weight |
| `build_muscle` | Build muscle |
| `eat_healthier` | Eat healthier |

Saved immediately on tap via `PATCH /onboarding/goal`, to `users.goal`.

### Screen 2 — Diet type

*"What do you eat?"* One of:

| Value | Label |
|---|---|
| `vegetarian` | Vegetarian |
| `eggetarian` | Eggetarian |
| `non_veg` | Non-vegetarian |
| `vegan` | Vegan |

Saved immediately on tap via `PATCH /onboarding/diet-type`, to `users.diet_type`. This choice
drives Screen 3's filtering.

### Screen 3 — Protein preferences (multi-select, filtered)

*"Which proteins do you already eat?"* The full catalog:

| id | Label |
|---|---|
| `chicken` | Chicken |
| `fish` | Fish & Seafood |
| `eggs` | Eggs |
| `paneer` | Paneer |
| `dairy` | Milk & Dairy |
| `tofu_soy` | Tofu & Soy |
| `dal_lentils` | Dal & Lentils |
| `nuts_seeds` | Nuts & Seeds |
| `mushroom` | Mushroom |

Excluded per diet type (everything else in the catalog is shown):

| Diet type | Excluded |
|---|---|
| `non_veg` | *(nothing excluded)* |
| `eggetarian` | chicken, fish |
| `vegetarian` | chicken, fish, eggs |
| `vegan` | chicken, fish, eggs, paneer, dairy |

At least one protein must be selected to continue. Saved via `PATCH /onboarding/protein-preferences`
with `proteinIds: string[]` — this **replaces** the user's onboarding-set preferences each time
(idempotent: backing out and reselecting doesn't leave stale or duplicate rows). Every row is
written with:

- `source = 'default'`
- `frequency_comfort = 'few_times_a_week'`

(`source` becomes `'explicit'` only later, if the user edits it themselves in settings — Phase 9.)

### Screen 4 — Body stats

Sex, height, weight, age, and activity level. Height/weight/age are validated both client- and
server-side against the same ranges:

| Field | Valid range |
|---|---|
| Height | 100–250 cm |
| Weight | 30–300 kg |
| Age | 13–120 (whole number) |

Sex is one of `male` / `female` — added specifically because the Mifflin-St Jeor TDEE formula
(Phase 5) uses a different constant per sex; there was no other need for it before that.

Activity level is one of: `sedentary`, `light`, `moderate`, `active`, `very_active` — the standard
5-tier scale used directly by the TDEE calculation (Phase 5).

Saved via `PATCH /onboarding/body-stats`, to `users.height` / `weight` / `age` / `activity_level` /
`sex`.

### Screen 5 — Promise + start scanning

Static copy: *"We won't ask you to eat differently."* One CTA, **"Start scanning"**, which calls
`POST /onboarding/complete` (sets `users.onboarding_completed_at`, idempotently — calling it twice
keeps the original timestamp) and routes into the main app.

## Resuming mid-onboarding

`GET /onboarding/status` returns the user's current progress:

```json
{
  "goal": "lose_weight",
  "dietType": "vegetarian",
  "proteinPreferences": ["paneer", "dal_lentils"],
  "bodyStats": null,
  "completed": false
}
```

The app calls this once right after sign-in and picks the first incomplete screen (goal → diet
type → protein preferences → body stats → promise screen → home) — a user who backs out mid-flow
and comes back resumes exactly there, rather than restarting or duplicating any rows. All the
onboarding endpoints are plain `UPDATE`s (or a delete+insert replace, for protein preferences), so
resubmitting the same screen is always safe.

## Endpoints

All require a valid session (`Authorization: Bearer <token>`, from Phase 3):

| Method | Path | Purpose |
|---|---|---|
| `PATCH` | `/onboarding/goal` | Save Screen 1 |
| `PATCH` | `/onboarding/diet-type` | Save Screen 2 |
| `PATCH` | `/onboarding/protein-preferences` | Save Screen 3 (replaces prior `default` selections) |
| `PATCH` | `/onboarding/body-stats` | Save Screen 4 |
| `POST` | `/onboarding/complete` | Mark Screen 5 done |
| `GET` | `/onboarding/status` | Current progress, for resuming |
| `GET` | `/onboarding/protein-types` | Static catalog, optionally `?dietType=` filtered |
