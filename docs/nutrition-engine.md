# Nutrition engine

Two independent pieces: a dish nutrition catalog (given a dish + portion, return macros) and a
TDEE/daily-target calculator (given a user's profile, return how much they should eat today).
Neither depends on the other yet — they get combined in Phase 6 (meal scanning), which will look
up a scanned dish's macros and compare them against these daily targets.

## Dish nutrition catalog

### Data source

The seeded dishes (`backend/migrations/0009_create_dishes.up.sql`) use **approximate,
commonly-cited nutrition values** for standard Indian home-cooking portions — a reasonable MVP
starting point, not certified lab data. Before relying on this for anything beyond
demos/development, replace these with real figures from the
[Indian Food Composition Tables (IFCT 2017)](https://www.ifct2017.com/) or USDA FoodData Central.

### The base-macros-plus-oil-variance model

Dishes are stored as:

| Column | Meaning |
|---|---|
| `base_calories` / `base_protein_g` / `base_carbs_g` / `base_fat_g` | Macros for the dish's standard portion, **not counting variable cooking oil/ghee** |
| `oil_variance_low_tsp` / `_medium_tsp` / `_high_tsp` | How many teaspoons of oil/ghee a "light", "typical", and "generous" home cook uses for this dish. `NULL` on all three means the dish doesn't vary (e.g. plain rice, a boiled egg, fruit) |

Why split it this way: home-cooked Indian food varies enormously in fat/calories based on how much
oil or ghee went in, but the protein and carbs come from the actual ingredients (lentils, chicken,
vegetables) and don't change with cooking oil. Modeling oil as an adjustable add-on, rather than
baking one fixed fat value into each dish, lets a single dish record answer "how many calories is
this if it's low-oil vs. a ghee-heavy version" without needing three entirely separate dish
entries.

The conversion: 1 tsp of oil/ghee ≈ 5g fat ≈ 45 kcal (`backend/src/nutrition/dishes.ts`).

```
fat (g)      = base_fat_g + oilTsp * 5
calories     = base_calories + oilTsp * 45
protein (g)  = base_protein_g   (unaffected by oil)
carbs (g)    = base_carbs_g     (unaffected by oil)
```

All four are then multiplied by a `portionMultiplier` (1 = standard portion, 2 = double, etc).

If `oilLevel` isn't specified, it defaults to `"medium"` (a reasonable typical-home-cooking
assumption). Dishes with no recorded variance ignore `oilLevel` entirely — there's nothing to
adjust.

### Adding a new dish

1. Add a row to `backend/migrations/0009_create_dishes.up.sql`'s `INSERT` (or, once that migration
   has shipped, a new migration with its own `INSERT` — never edit an already-applied migration).
2. Decide: does this dish's fat/calories meaningfully change based on home-cooking oil/ghee
   amount? If yes, set all three `oil_variance_*_tsp` columns (a reasonable low/typical/generous
   guess is fine to start). If no (a fixed dish — rice, fruit, a boiled egg), leave all three
   `NULL`.
3. Add a test case in `backend/test/nutrition/dishes.spec.ts` following the existing pattern.

## TDEE (Total Daily Energy Expenditure)

### Formula: Mifflin-St Jeor

```
BMR (men)   = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
BMR (women) = 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
TDEE        = BMR * activity multiplier
```

**Why Mifflin-St Jeor** over the older Harris-Benedict equation: it's the formula most commonly
recommended today (including by the Academy of Nutrition and Dietetics) as more accurate for
modern populations — Harris-Benedict was developed in 1919 and tends to overestimate BMR.

This is why `users.sex` exists (added in this phase) — Mifflin-St Jeor requires it, and nothing
else in the app did before now.

### Activity multipliers

| Activity level | Multiplier |
|---|---|
| `sedentary` | 1.2 |
| `light` | 1.375 |
| `moderate` | 1.55 |
| `active` | 1.725 |
| `very_active` | 1.9 |

These are the standard multipliers paired with Mifflin-St Jeor and line up with the 5-tier
`activity_level` scale collected during onboarding (Phase 4).

## Daily macro targets

Given a TDEE, a goal adjusts the calorie target and how protein/fat/carbs are split
(`backend/src/nutrition/daily-targets.ts`):

| Goal | Calorie adjustment | Protein target | Fat |
|---|---|---|---|
| `lose_weight` | TDEE − 500 (deficit) | 2.0 g/kg bodyweight | 25% of calories |
| `build_muscle` | TDEE + 300 (surplus) | 2.2 g/kg bodyweight | 25% of calories |
| `eat_healthier` | TDEE (maintenance) | 1.6 g/kg bodyweight | 30% of calories |

Protein is calculated per kilogram of bodyweight rather than as a percentage of calories — that's
standard sports-nutrition practice, and it keeps protein sensible even when calorie targets are
very different between goals. Carbs get whatever calories are left after protein and fat are
subtracted (never negative — clamped to 0 in the unlikely case protein+fat alone exceed the
calorie target).

Calories never drop below **1200/day**, regardless of how large a deficit the math would
otherwise produce for a low-TDEE profile — a safety floor, not a recommendation to actually eat
that little.

### Why goals produce different protein targets at the same TDEE

Two people with identical TDEE but different goals get different protein targets because protein
scales with **bodyweight**, and the *reason* to eat more protein differs by goal: `build_muscle`
uses a higher g/kg to support muscle growth, `lose_weight` uses a slightly lower (but still high)
g/kg to preserve muscle during a deficit, and `eat_healthier` uses a more moderate maintenance
level. See `backend/test/nutrition/daily-targets.spec.ts` for worked examples.

## Endpoint

`GET /nutrition/daily-targets` (requires a session) returns the current user's TDEE and daily
targets, computed from their stored profile (`sex`, `height`, `weight`, `age`, `activity_level`,
`goal`). Returns `400` if onboarding (body stats + goal) isn't complete yet — there's nothing to
compute without a profile.
