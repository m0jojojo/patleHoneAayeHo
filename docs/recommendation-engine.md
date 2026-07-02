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

If any candidate has `protein_preferences.source = 'explicit'` (set via the "My Proteins" settings
screen, Phase 9), that one is recommended.

> Example: user has explicitly set "chicken" as a frequent protein. Even if they've been logging
> paneer constantly, chicken still wins this tier.

### 2. Passive override (inferred from logging history)

If no explicit preference exists, check whether logging history gives a strong, unambiguous
signal for one candidate: **5+ logs in the last 14 days, with zero logs for every other
candidate** in that window (see [docs/frequency-learning.md](frequency-learning.md) for the full
rationale and edge cases). Dish → protein matching uses
`backend/src/recommendations/dish-protein-map.ts` (e.g. `"Chicken curry"` → `"chicken"`). The
message is aggregate, not tied to one specific day: *"Add some paneer — you've been eating it
often lately."*

> Example: user selected both paneer and dal_lentils at onboarding, has logged paneer dishes 6
> times in the last two weeks and dal_lentils zero times. Paneer wins this tier. If dal_lentils
> also had even one log in that window, neither would be unambiguous enough, and the recommendation
> would fall through to tier 3 instead.

### 3. Cold-start default

If neither of the above has data (brand new user, hasn't logged anything yet), fall back to the
first protein they selected during onboarding (ordered by `protein_preferences.id`, i.e.
insertion order). The message is generic: *"Add some paneer to help hit your protein target
today."*

> Example: user just finished onboarding, selected paneer and dal_lentils, hasn't logged a single
> meal yet. Paneer (selected first) is recommended.

## Dismissals

`POST /recommendations/dismiss` logs which protein was dismissed and when
(`recommendation_dismissals`). It doesn't change today's recommendation — it exists to feed Phase
9's repeated-dismissal detection (dismissing the same protein 3 times in a row without accepting
it prompts the user to adjust that protein's frequency setting directly — see
[docs/frequency-learning.md](frequency-learning.md)).

## Endpoints

Both require a session:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/recommendations/current` | Today's recommendation, or `null` if no gap (or too late in the day) |
| `POST` | `/recommendations/dismiss` | Log that the user dismissed a given protein's recommendation |

## Adding a new dish that represents a protein source

If you add a new dish to the nutrition catalog (Phase 5) that's a meaningful protein source, add
a matching entry to `DISH_NAME_TO_PROTEIN_TYPE` in
`backend/src/recommendations/dish-protein-map.ts` — otherwise tier 2 (passive override) can never
pick up that dish.
