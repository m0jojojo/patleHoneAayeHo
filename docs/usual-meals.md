# Usual meals

Quietly builds a personal "meals this user tends to eat" library from logging history, so Phase 8
can recommend additions from things the user already actually eats (never something new).

## The matching rule (explicit — this will need tuning later)

Two logged meals count as **the same meal** if and only if they have **the exact same set of
dish labels, compared case-insensitively and order-independently.**

Implementation (`backend/src/meals/usual-meals.ts`):

```ts
function computeMealSignature(dishLabels: string[]): string {
  return dishLabels
    .map((label) => label.trim().toLowerCase())
    .filter((label) => label.length > 0)
    .sort()
    .join("|");
}
```

So `["Roti", "Dal (tadka)"]` and `["dal (tadka)", "ROTI"]` produce the same signature (order and
case don't matter) and count as one "usual meal," incrementing `frequency_count`. Logging a
combination for the first time creates a new `usual_meals` row starting at `frequency_count = 1`.

### What this rule does *not* account for (known limitations, on purpose — MVP scope)

- **Portion size.** "1 roti" and "3 rotis" are the same signature — the matching rule only looks
  at *which* dishes, not how much of them. A user eating very different quantities of the same
  dishes still counts as their "usual meal."
- **Exact dish-label match, no fuzzy matching.** "Dal (tadka)" and "Dal" (if ever logged as two
  different labels) would count as two different meals, even though a human would call them the
  same dish. This matters most for manually-typed dish names (Phase 6's fallback when vision
  fails) — free text won't reliably match the catalog's exact naming.
- **Exact-set match, not subset/overlap.** Adding or dropping even one dish from an otherwise
  identical plate (e.g. roti+dal vs. roti+dal+sabzi) counts as a completely different "usual
  meal," not a variation of the same one.

These are reasonable starting points for an MVP but are the first things to revisit if Phase 8's
recommendations feel wrong — e.g. a user who logs "roti + dal" and "roti + dal + sabzi" about
equally often will show up as two separate, lower-frequency "usual meals" rather than one
frequently-eaten one.

- **Deleting a logged meal doesn't decrement `frequency_count`.** `DELETE /meals/log/:id` (see
  docs/meal-scanning.md) only removes the `meals_logged` row — `frequency_count` is treated as a
  lifetime "how often do you eat this" learning signal for the recommendation engine, not a
  live-recomputed aggregate. Safely decrementing it would need to know whether any other
  still-existing `meals_logged` row shares the same signature, which isn't tracked. In practice
  this means deleting a mistaken log entry doesn't "un-teach" the recommendation engine.

## Storage

`usual_meals` (primary key `(user_id, meal_signature)`):

| Column | Purpose |
|---|---|
| `meal_signature` | The normalized (lowercased, sorted, joined) signature used for matching |
| `dish_labels` | The original-cased dish labels from the most recent time this signature was logged — kept only for display, never used for matching |
| `frequency_count` | How many times this exact signature has been logged |
| `last_logged_at` | Updated every time the signature is logged again |

The upsert (`recordUsualMealStatement`) is a single atomic `INSERT ... ON CONFLICT (user_id,
meal_signature) DO UPDATE` — no separate "does this exist?" query needed, and it runs in the same
`db.batch()` as the `meals_logged` insert, so a meal can never get logged without also updating
(or starting) its usual-meals tracking, and vice versa.

## Endpoints

- `GET /meals/today` — today's logged meals plus consumed/target/remaining macros (today is
  currently a UTC calendar-day match on the stored timestamp — a known simplification that
  doesn't yet account for the user's actual local timezone).
- `GET /meals/usual` — this user's usual meals, sorted by `frequency_count` descending, each with
  its (display) dish labels, frequency, and last-logged time. This is what Phase 8's
  recommendation engine will read from to rank candidate additions.
