# Protein gap recommendations

When a user is short on protein for the day, suggest adding something — never swapping, never a
food they haven't already told us about.

## The non-negotiable rule

Every recommendation this engine produces is an **addition**. The response's `type` field is
always the literal `"addition"` — there is no code path that produces `"swap"`, and a test
(`backend/test/recommendations/recommend.spec.ts`) asserts this holds across all three priority
tiers below.

Every recommendation also comes from the user's own `protein_preferences` (selected during
onboarding, Phase 4) — this engine never introduces a protein the user hasn't already selected.
Diet-type filtering (a vegetarian never gets recommended chicken/fish) is re-checked here too, not
just trusted from onboarding — see the "defense in depth" test that inserts an invalid preference
row directly and confirms it's still filtered out.

## When a recommendation fires

Two conditions, both required (`backend/src/recommendations/gap-detection.ts`):

1. **Remaining protein for the day is 15g or more.** (`PROTEIN_GAP_THRESHOLD_G`)
2. **It's before a fixed cutoff hour — currently 9 PM UTC.** (`RECOMMENDATION_CUTOFF_HOUR`)

> **Known simplification.** The real rule should be "a few hours before the user's *typical* last
> meal," but nothing tracks a per-user meal-timing pattern yet. Until that data exists, a fixed
> cutoff hour stands in for it. When real per-user timing data becomes available (e.g. derived
> from `meals_logged` timestamps over time), replace the fixed cutoff in `shouldRecommendProteinGap`
> with a per-user computed one.

If remaining protein is negative (the user is over-target) or below 15g, or it's past the cutoff,
`GET /recommendations/current` returns `{ "recommendation": null }`.

## Picking what to recommend (priority order)

Given a gap exists, the candidate universe is **only the proteins the user selected during
onboarding** (`protein_preferences` rows for that user, diet-type-filtered again defensively).
Within that universe, three tiers, checked in order — the first one with data wins:

### 1. Explicit preference

If any candidate has `protein_preferences.source = 'explicit'` (set via Phase 9's settings
screen — no rows will actually have this source until Phase 9 ships, but the ranking is ready for
it), that one is recommended.

> Example: user has explicitly set "chicken" as a frequent protein. Even if they've been logging
> paneer constantly, chicken still wins this tier.

### 2. Logging history (`usual_meals`)

If no explicit preference exists, look at the user's `usual_meals` (Phase 7), most frequent first,
and recommend the first one whose dishes map to a candidate protein (via
`backend/src/recommendations/dish-protein-map.ts`, a small explicit table connecting nutrition
catalog dish names to protein-type ids — e.g. `"Chicken curry"` → `"chicken"`). The message
references the day it was last logged: *"Add some paneer — you had it Wednesday."*

> Example: user selected both paneer and dal_lentils at onboarding but has only ever actually
> logged paneer dishes. Paneer wins this tier over dal_lentils, since there's no explicit
> preference to check first.

### 3. Cold-start default

If neither of the above has data (brand new user, hasn't logged anything yet), fall back to the
first protein they selected during onboarding (ordered by `protein_preferences.id`, i.e.
insertion order). The message is generic: *"Add some paneer to help hit your protein target
today."*

> Example: user just finished onboarding, selected paneer and dal_lentils, hasn't logged a single
> meal yet. Paneer (selected first) is recommended.

## Dismissals

`POST /recommendations/dismiss` logs which protein was dismissed and when
(`recommendation_dismissals`). It doesn't change today's recommendation — it exists purely to feed
Phase 9's passive learning (repeated dismissals of the same protein should eventually prompt the
user to adjust that protein's frequency setting).

## Endpoints

Both require a session:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/recommendations/current` | Today's recommendation, or `null` if no gap (or too late in the day) |
| `POST` | `/recommendations/dismiss` | Log that the user dismissed a given protein's recommendation |

## Adding a new dish that represents a protein source

If you add a new dish to the nutrition catalog (Phase 5) that's a meaningful protein source, add
a matching entry to `DISH_NAME_TO_PROTEIN_TYPE` in
`backend/src/recommendations/dish-protein-map.ts` — otherwise tier 2 (logging history) can never
pick up that dish.
