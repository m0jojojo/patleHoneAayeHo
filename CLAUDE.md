# Build Prompt: Macro-Adaptive Diet App for Indian Parents

**Paste this whole document into Claude Code as your project brief (e.g. save as `CLAUDE.md` in repo root, or paste directly into the first session).**

---

## 0. Ground Rules for Claude Code (read this first, follow for every phase)

You are building this system in **strict phases**. Do not skip ahead, do not build multiple phases in one pass, and do not combine tasks unless explicitly told to.

For every phase:

1. Read the phase's task list. Each task is small enough to hand to a junior engineer — implement them one at a time, in order.
2. Write tests alongside the code, not after. Every task that touches logic (not pure UI markup) needs a corresponding test.
3. After finishing all tasks in a phase, **run the full test suite** for that phase and show me the output.
4. If any test fails, fix it before moving on. Do not proceed to the next phase with failing tests.
5. Update the relevant documentation (see "Documentation Requirements" per phase) before considering the phase done.
6. **Stop and ask me explicitly**: "Phase [N] is complete, all tests passing. Ready to commit and push?" Do not run `git add`, `git commit`, or `git push` until I respond with explicit approval. Never assume approval from a previous phase carries forward.
7. Use small, atomic commits per task within a phase if it makes the diff easier to review — but only push once, at the end of the phase, after I approve.
8. If you're blocked or a task is ambiguous, ask me rather than guessing and building the wrong thing.
9. Keep a running `CHANGELOG.md` — one line per phase, plain English, no jargon.

---

## 1. Project Overview (give Claude Code this context once, up front)

**What we're building:** A mobile-first app for Indian parents (30s-50s, new to structured fitness) that lets them scan a meal photo, get a macro breakdown, and receive food recommendations that work *with* their existing eating habits instead of replacing them. The core differentiator: never suggest new foods — always recommend from what the user already eats, based on their stated preferences and logged history.

**Tech stack (decided, do not re-litigate unless blocked):**
- Frontend: React Native (Expo) — mobile-first, ship to both iOS/Android from one codebase
- Backend: Cloudflare Workers + D1 (SQLite at the edge) for MVP scale; flag clearly in code comments if/where this will need to migrate to Postgres later
- Auth: Phone OTP only for v1. No Clerk, no Better Auth, no email/password. (Lesson from a prior project — third-party auth added scaling risk we don't need yet.)
- Vision: Gemini 1.5/2.0 Vision API (or GPT-4V — pick one, document the choice) for dish identification + rough portion estimation from photos. Do not build a custom CV model.
- Nutrition data: Custom seeded database (IFCT/USDA-based) of Indian dishes and common home-cooking variants, with adjustable oil/ghee variance.
- Payments: Razorpay for UPI support — scaffolded early, wired up in the payments phase, not retrofitted later.

**Non-negotiable product rule to bake into every recommendation feature:** recommendations are always *additions* to what the user already eats, never *swaps*. Never suggest a food the user hasn't selected as a preference or previously logged.

---

## 2. Phase Breakdown

### Phase 1 — Project Scaffolding & Environment

**Objective:** Empty-but-running skeleton for both frontend and backend, deployable, with CI wired up.

Tasks:
1. Initialize Expo React Native project with TypeScript template.
2. Initialize Cloudflare Workers project with D1 binding configured (empty DB for now).
3. Set up environment variable handling for both (`.env.example` committed, real `.env` gitignored) — placeholders for Gemini/GPT-4V API key, Razorpay keys, D1 connection.
4. Set up a basic CI pipeline (GitHub Actions) that runs lint + tests on every push.
5. Set up testing frameworks: Jest for backend logic, React Native Testing Library for frontend components.
6. Write a single smoke test on each side (frontend renders a placeholder screen, backend responds 200 on a health-check route) to confirm the pipeline works end to end.

Tests to pass:
- CI pipeline runs green on a fresh clone.
- `GET /health` returns `200 { status: "ok" }`.
- App boots in Expo Go / simulator without crashing.

Documentation:
- `README.md`: how to run frontend and backend locally, how to run tests, how to set env vars.

---

### Phase 2 — Database Schema & Migrations

**Objective:** All tables the system needs exist, are migrated, and are documented — no business logic yet.

Tasks:
1. Design and create migration for `users` table (id, phone number, created_at, goal, diet_type, height, weight, age, activity_level).
2. Design and create migration for `protein_preferences` table (user_id, protein_type, frequency_comfort, source: explicit|default|inferred).
3. Design and create migration for `meals_logged` table (id, user_id, timestamp, dish_labels JSON, portion_estimate JSON, macros JSON, source_image_ref).
4. Design and create migration for `usual_meals` table (user_id, meal_signature, frequency_count, last_logged_at) — this will back the "usual meals" library later.
5. Write a migration runner script (up/down) and document how to run it.
6. Write schema tests: each migration applies cleanly, rolls back cleanly, and produces the expected columns/types.

Tests to pass:
- All migrations run up and down without error on a fresh D1 instance.
- Schema snapshot test confirms expected tables/columns exist.

Documentation:
- `docs/schema.md`: ER diagram (text/mermaid is fine) plus a plain-English description of what each table is for.

---

### Phase 3 — Phone OTP Authentication

**Objective:** A user can sign up / log in with just a phone number and OTP. No other auth method.

Tasks:
1. Backend: endpoint to request OTP (rate-limited, log attempts).
2. Backend: endpoint to verify OTP and issue a session token.
3. Backend: session validation middleware for protected routes.
4. Frontend: phone number entry screen.
5. Frontend: OTP entry screen with resend/expiry countdown.
6. Frontend: store session token securely (Expo SecureStore, not AsyncStorage).

Tests to pass:
- Requesting OTP for a valid phone number succeeds; invalid formats are rejected.
- Verifying a correct OTP issues a valid session token; incorrect OTP is rejected; expired OTP is rejected.
- Protected route rejects requests with no/invalid token, accepts requests with valid token.
- Rate limiting kicks in after N requests (define N, document it).

Documentation:
- `docs/auth.md`: flow diagram of OTP request → verify → session, plus rate-limit and expiry values.

---

### Phase 4 — Onboarding Flow (5 screens)

**Objective:** New user completes onboarding and lands with a populated profile.

Tasks (build and test one screen at a time, in this order):
1. Screen 1 — Goal selection (lose weight / build muscle / eat healthier). Save to `users.goal`.
2. Screen 2 — Diet type selection (veg / eggetarian / non-veg / vegan). Save to `users.diet_type`.
3. Screen 3 — Protein source multi-select, **filtered by Screen 2's answer** (e.g. chicken/fish never shown to a vegetarian). Save selections to `protein_preferences` with `source: default` and a default `frequency_comfort` of "few times a week."
4. Screen 4 — Body stats form (height, weight, age, activity level). Save to `users` table. Validate realistic ranges (no negative weight, sane height bounds, etc.) client- and server-side.
5. Screen 5 — Static promise screen ("we won't ask you to eat differently...") with a "Start scanning" CTA that marks onboarding complete and routes to the main app.
6. Backend: single endpoint (or small set) to persist onboarding data, idempotent if the user backs out and retries a screen.

Tests to pass:
- Diet-type filtering: selecting "vegetarian" on Screen 2 removes chicken/fish from Screen 3's options — write this as an explicit test, it's the highest-risk trust-breaking bug in this phase.
- Full onboarding flow, submitted end to end, produces a correctly populated `users` row and correct `protein_preferences` rows with `source: default`.
- Body stats validation rejects nonsense input (0 height, negative weight, age > 120, etc.).
- A user who exits mid-onboarding and returns resumes rather than duplicating rows.

Documentation:
- `docs/onboarding.md`: screen-by-screen spec, including the filtering logic and default values, so a designer or PM can read it without reading code.

---

### Phase 5 — Nutrition Database + TDEE Calculation

**Objective:** Given a dish label and portion, return accurate macros. Given a user profile, return their daily macro targets.

Tasks:
1. Source and seed the Indian dish nutrition dataset (dish name, per-standard-portion macros, common variants e.g. "dal" ± ghee/oil range).
2. Write the portion-to-macro lookup function, including the oil/ghee adjustment logic.
3. Write the TDEE/BMR calculation function (Mifflin-St Jeor or similar, document which formula and why) using height/weight/age/activity_level.
4. Write the daily macro target function (protein/carb/fat targets derived from TDEE + goal).
5. Backend endpoint: given a user_id, return their current daily targets.

Tests to pass:
- Nutrition lookup returns correct macros for a known set of test dishes, including at least one high-variance dish (dal) tested at low/medium/high oil assumptions.
- TDEE calculation matches hand-calculated reference values for at least 3 test profiles (different age/weight/activity combos).
- Daily targets differ correctly by goal (e.g. "build muscle" produces a different protein target than "lose weight" for the same TDEE).

Documentation:
- `docs/nutrition-engine.md`: formula used, data sources cited, and how to add a new dish to the database.

---

### Phase 6 — Meal Scanning (Vision API Integration)

**Objective:** User photographs a meal, gets back an editable macro breakdown.

Tasks:
1. Frontend: camera capture screen (or photo library picker as fallback).
2. Backend: endpoint that accepts an image, calls the vision API, returns dish labels + rough portion estimate.
3. Backend: if vision confidence is low, return a disambiguation question (e.g. "how much ghee/oil, roughly?") instead of a guess.
4. Backend: combine vision output + nutrition DB lookup (Phase 5) into a final macro breakdown.
5. Frontend: results screen showing identified dishes, estimated macros, and an edit/correct option before confirming the log.
6. Backend: on confirm, write to `meals_logged`.

Tests to pass:
- Mock vision API responses (do not hit the real API in tests) covering: high-confidence single dish, multi-dish plate, low-confidence triggering disambiguation.
- End-to-end: image in → macros out → user edits a value → corrected value is what gets saved, not the original estimate.
- Failure handling: vision API timeout or error returns a graceful fallback (manual entry), not a crash.

Documentation:
- `docs/meal-scanning.md`: pipeline diagram (image → vision → DB lookup → disambiguation → log), and how to swap vision providers later if needed.

---

### Phase 7 — Daily Tracking + "Usual Meals" Library

**Objective:** Users see macro progress against daily targets, and the system quietly builds a personal meal library from logging history.

Tasks:
1. Backend: endpoint returning today's logged meals + running macro totals vs. targets (from Phase 5).
2. Frontend: daily dashboard showing consumed vs. remaining macros (simple bars/numbers, no clutter).
3. Backend: after each meal log, check `usual_meals` for a matching signature (same dish combo); increment frequency or insert new row.
4. Backend: expose a "usual meals" list endpoint, sorted by frequency, for later reuse in recommendations (Phase 8).

Tests to pass:
- Logging a meal correctly updates daily totals and remaining macros.
- Logging the same meal signature twice increments `usual_meals.frequency_count` rather than creating a duplicate row.
- A genuinely new meal combination creates a new `usual_meals` row.

Documentation:
- `docs/usual-meals.md`: what counts as a "matching" meal signature (be explicit — this logic will need tuning later, document the current matching rule clearly so it's easy to revisit).

---

### Phase 8 — Protein Gap Recommendations

**Objective:** When protein is short, recommend an addition from the user's own preferences/history — never a swap, never a novel food.

Tasks:
1. Backend: gap-detection function — given today's logged macros vs. targets and time-of-day, determine if a protein-gap recommendation should trigger (use the threshold/timing rule from earlier spec: e.g. 15g+ short, a few hours before typical last meal).
2. Backend: recommendation-selection function — rank candidate additions using, in order: (a) explicit `protein_preferences.frequency_comfort` if set, (b) `usual_meals` frequency data if available, (c) static default lookup table if neither exists yet (new user cold-start case).
3. Backend: endpoint returning the current recommendation (or none, if no gap).
4. Frontend: display the recommendation inline on the dashboard, phrased as an addition ("add 2 eggs, like you did Tuesday"), with a dismiss action.
5. Backend: log dismissals — this feeds Phase 9.

Tests to pass:
- No recommendation fires when the user is on-target or over on protein.
- Recommendation correctly prioritizes explicit preference data over inferred history over static defaults, tested with fixtures representing each case in isolation.
- A vegetarian user is never recommended chicken/fish (regression test tied back to Phase 4's diet-type filtering — this must hold end to end, not just at onboarding).
- Recommendation is always framed/tagged internally as an "addition," never a "swap" — add a test that asserts the recommendation type field is never `swap`.

Documentation:
- `docs/recommendation-engine.md`: the full priority-ranking logic (explicit > inferred > default) written out plainly, with examples.

---

### Phase 9 — Passive Frequency Learning

**Objective:** Recommendation quality improves automatically from behavior, without requiring the user to visit settings.

Tasks:
1. Backend: settings screen support — endpoint to let users explicitly set/update `frequency_comfort` per protein (source becomes `explicit`).
2. Frontend: "My Proteins" settings screen, one row per selected protein with the 3-option toggle.
3. Backend: post-first-scan nudge trigger (soft, skippable) prompting the user to the settings screen.
4. Backend: passive override logic — if a protein has strong logging signal (define and document a clear threshold, e.g. logged 5+ times in 14 days with zero for a competing preference) and the user has never set it explicitly, adjust its effective frequency weight used in Phase 8's ranking, without overwriting the stored `default` value.
5. Backend: repeated-dismissal detection — if a specific recommended item is dismissed N times in a row, surface an inline prompt to adjust that item's frequency setting.

Tests to pass:
- Explicit settings always take priority over passive inference, even when logging history disagrees — test this directly, it's the core precedence rule.
- Passive override only activates once the defined threshold is met, not before.
- Dismissal counter resets correctly (define and test the reset condition, e.g. resets when the user accepts a recommendation for that item).

Documentation:
- `docs/frequency-learning.md`: precedence rules (explicit > passive > default) and the exact thresholds used, so these can be tuned later without re-reading code.

---

### Phase 10 — Payments (Razorpay / UPI)

**Objective:** Paywall or premium-tier gating works end to end with UPI support, scaffolded cleanly rather than bolted on.

Tasks:
1. Backend: Razorpay integration for order creation and payment verification (webhook handling included).
2. Backend: subscription/entitlement table tracking what a user has access to.
3. Frontend: paywall screen at whatever gate point is decided (define this explicitly before building — e.g. free for 14 days, then gated).
4. Backend: entitlement check middleware on gated routes.
5. Test-mode Razorpay keys used throughout; document how to switch to live keys for production.

Tests to pass:
- Order creation and webhook verification tested against Razorpay's test/mock mode, not live payments.
- Entitlement check correctly blocks/allows access based on subscription state.
- Webhook signature verification rejects tampered payloads.

Documentation:
- `docs/payments.md`: what's gated, pricing/trial logic, and the test-mode → live-mode switch procedure.

---

### Phase 11 — Polish, Deployment, Monitoring

**Objective:** Production-ready, observable, deployed.

Tasks:
1. Error tracking wired up (e.g. Sentry) on both frontend and backend.
2. Basic analytics events for the key funnel: onboarding completion, first scan, recommendation shown/accepted/dismissed.
3. Production deployment pipeline for Cloudflare Workers + D1.
4. App store / Play store build config (can be a documented manual step if automated CI/CD isn't in scope yet).
5. Final pass on `README.md` and all `/docs` files to confirm they still match the shipped system.

Tests to pass:
- Full end-to-end smoke test: sign up → onboard → scan a meal → see recommendation → dismiss/accept it, run against a staging deployment, not just local.
- Error tracking confirmed working by triggering a deliberate test error and verifying it appears in the dashboard.

Documentation:
- `docs/deployment.md`: full deploy procedure, rollback procedure, and where to find logs/error tracking.

---

## 3. Reminder for Claude Code

At the start of every session, re-read Section 0 (Ground Rules) before touching code. Confirm with me which phase we're starting or resuming before writing anything.
