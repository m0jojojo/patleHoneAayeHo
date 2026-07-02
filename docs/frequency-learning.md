# Passive frequency learning

Makes the recommendation engine (Phase 8) get smarter from behavior over time, without requiring
the user to visit settings — while still letting them take full manual control if they want to.

## Precedence: explicit > passive > default

This is the same three-tier structure Phase 8 shipped, refined here with exact, documented
thresholds (see [docs/recommendation-engine.md](recommendation-engine.md) for the full ranking
writeup and examples):

1. **Explicit** — the user directly set a protein's frequency via the "My Proteins" settings
   screen (`protein_preferences.source = 'explicit'`). Always wins, no matter what their logging
   history looks like.
2. **Passive (inferred)** — no explicit preference, but logging history shows a strong,
   unambiguous signal (see threshold below). Never overwrites the stored row — it only affects
   which protein gets recommended *today*.
3. **Default** — neither of the above; falls back to the first protein selected at onboarding.

**Explicit always beats passive**, even when they disagree — e.g. a user explicitly set "chicken"
to a low frequency, but has been logging paneer constantly. Chicken's explicit setting still wins;
passive inference never gets a chance to override an explicit choice
(`backend/test/recommendations/recommend.spec.ts`, "tier 1 (explicit) beats passive override").

## The passive-override threshold

`backend/src/recommendations/passive-override.ts`:

> A protein qualifies for passive override if it's been logged **5 or more times in the last 14
> days**, **and every other candidate protein has been logged zero times** in that same window.

Both conditions matter:

- **5+ in 14 days** — anything less isn't yet a strong enough signal; the system falls back to the
  cold-start default instead of guessing too eagerly.
- **Zero for every competitor** — if two candidate proteins both have some logging history (even
  just one log each), the signal isn't unambiguous enough to act on passively, so no override
  applies (falls back to default). This is deliberately strict — a passive override should only
  kick in when it's obvious, not when it's a coin flip.

"Logged" counts one occurrence per *meal*, not per dish — a single meal containing the same
protein twice still only counts once.

## Settings: "My Proteins"

`GET /settings/protein-preferences` / `PATCH /settings/protein-frequency` — a settings screen
listing every protein the user selected during onboarding, each with a 3-option toggle:

| Value | Label |
|---|---|
| `rarely` | Rarely |
| `few_times_a_week` | A few times a week |
| `daily` | Daily |

Setting any of these marks that row `source = 'explicit'` — the only thing in the app that ever
writes that source value. You can only adjust a protein you already selected at onboarding
(`PATCH /settings/protein-frequency` returns `404` for any other protein) — settings never adds a
*new* protein to someone's preferences, only tunes the frequency of ones already chosen.

## The post-first-scan nudge

`POST /meals/log` returns `showSettingsNudge: true` exactly once per user — the response to their
very first-ever logged meal (checked via a `COUNT(*)` on `meals_logged` before the insert). The
app shows a soft, skippable screen ("Set preferences" / "Skip for now") pointing at the settings
screen. It never nags again after that first meal, regardless of what the user chooses.

## Repeated-dismissal detection

`backend/src/recommendations/dismiss.ts`. If the **same** protein gets dismissed **3 times in a
row**, `POST /recommendations/dismiss` returns `suggestFrequencyPrompt: true`, and the dashboard
shows an inline "Want to adjust how often we suggest X?" prompt linking to the settings screen.

### The reset condition

The counter is **"dismissals of this protein since it was last accepted."** "Accepted" isn't a
separate button — logging a meal that actually contains the recommended protein counts as
accepting it (via the same dish → protein mapping used elsewhere), and resets the count to zero.
Concretely: 2 dismissals of paneer, then a meal containing paneer gets logged, then a 3rd dismissal
of paneer only counts as *1* toward the threshold, not 3 — the earlier two were "forgiven" by the
acceptance in between.

Each protein's dismissal count is tracked independently — dismissing paneer twice and dal_lentils
once doesn't push paneer over the threshold from dal_lentils' dismissal.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/settings/protein-preferences` | List the user's proteins with current frequency/source |
| `PATCH` | `/settings/protein-frequency` | Set a protein's frequency explicitly (`source` becomes `explicit`) |
| `POST` | `/meals/log` | (Existing, Phase 6) now also returns `showSettingsNudge` |
| `POST` | `/recommendations/dismiss` | (Existing, Phase 8) now also returns `suggestFrequencyPrompt` |
