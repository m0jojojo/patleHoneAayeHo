# Changelog

Plain-English, one line per phase.

- **Phase 1 — Project Scaffolding & Environment**: set up the basic skeleton for the app — an
  empty Expo (React Native) app on the frontend and an empty Cloudflare Workers backend, both with
  a working health-check, tests, linting, and a CI pipeline that runs on every push.
- **Phase 2 — Database Schema & Migrations**: created the four database tables the app needs
  (users, protein preferences, logged meals, and the "usual meals" library), plus a tool to apply
  or roll back those changes safely, and tests proving both directions work.
- **Phase 3 — Phone OTP Authentication**: users can now sign up and log in with just a phone
  number and a one-time code — no passwords, no third-party login. Includes rate limiting, code
  expiry, a secure session, and the phone number + code entry screens. Text delivery is stubbed
  (logged, not actually sent) until a real SMS provider is chosen.
- **Phase 4 — Onboarding Flow**: new users now walk through 5 screens (goal, diet type, protein
  preferences, body stats, and a promise screen) that build their profile. Vegetarians/vegans
  never see meat, fish, or (for vegans) eggs and dairy as protein options — enforced on both the
  screen and the server. Backing out mid-onboarding and returning resumes exactly where you left
  off instead of starting over. (Added a "sex" field to the body stats screen too — needed for
  the calorie math in Phase 5.)
- **Phase 5 — Nutrition Database + TDEE Calculation**: seeded a starter nutrition catalog of 9
  common home-cooked dishes (with an adjustable oil/ghee amount for dishes like dal where that
  varies a lot), and added the math that turns a user's profile into a daily calorie/protein/carb/
  fat target — building muscle vs. losing weight now produce different targets even at the same
  energy level.
- **Phase 6 — Meal Scanning**: users can now photograph (or pick from their gallery) a meal and
  get back an editable calorie/protein/carb/fat breakdown before logging it — corrections you make
  are what actually get saved. If a dish's macros depend a lot on how much oil/ghee was used and
  we're not confident, the app asks instead of guessing. Photo identification (Gemini, chosen as
  the vision provider) is stubbed for now, same as OTP delivery was in Phase 3, until a real API
  key is wired up.
- **Phase 7 — Daily Tracking + "Usual Meals" Library**: the home screen is now a real dashboard —
  today's calories/protein/carbs/fat consumed vs. your daily target, and everything you've logged
  today. Behind the scenes, every logged meal quietly builds a "usual meals" list (which
  combinations of dishes you eat, and how often) that Phase 8 will use to recommend additions from
  food you already eat.
- **Phase 8 — Protein Gap Recommendations**: when you're 15g+ short on protein for the day (and
  it's not too late in the day), the dashboard now suggests adding something — always something
  you already eat, never a new food and never a "swap." It prefers what you've told us directly,
  then what you actually tend to log, then falls back to whatever you picked at onboarding. You
  can dismiss a suggestion, which is quietly noted for Phase 9 to learn from.
- **Phase 9 — Passive Frequency Learning**: added a "My Proteins" settings screen where you can
  directly say how often you want each protein suggested — that always wins over guessing. If you
  don't set anything, but clearly favor one protein in your actual logging (5+ times in two weeks,
  with none of the alternatives logged at all), the app quietly picks up on that instead of
  guessing blindly. After your first logged meal, a skippable prompt points you to that settings
  screen. Dismiss the same suggestion 3 times in a row and the dashboard offers to help you adjust
  it directly, instead of keep suggesting something you clearly don't want.
- **Real-world testing setup (Phases 10/11 skipped for now)**: got the app ready for multi-day
  testing on a phone that isn't tethered to a laptop. Text messages for the login code now really
  send (via MSG91) instead of only showing up in a developer log. The backend now runs on
  Cloudflare's real servers with a real database, not just on one laptop. Built a standalone
  installable app (no dev tools required to run it) and pointed it at that real backend. Photo
  identification now actually calls Gemini to recognize the dish in the photo, instead of always
  guessing the same "roti and dal" regardless of what's on the plate.
- **Better photo recognition accuracy**: photo scanning now lists each food item separately and
  counts duplicates (e.g. "4 eggs," not just "eggs"), and prefers specific names over generic ones.
  Dishes that aren't in our small nutrition catalog now get a usable AI-estimated macro
  breakdown (clearly labeled "AI estimate," still fully editable) instead of just showing zeros -
  while dal, sabzi, and curries (where oil amount matters a lot) still go through the more
  trustworthy catalog + confirmed-oil-level path as before.
- **Dashboard redesign**: the home screen has a real visual design now instead of plain black-and-
  white text and boxes - rounded cards, colored icons per macro, and progress bars that turn amber
  or red when you're behind or over target instead of one flat black bar. Today's calories are now
  the headline number, with the scan-a-meal camera action built right into that card. Nothing about
  how the screen works changed, only how it looks.
- **Bottom nav bar**: added a simple bottom bar to the home screen with a Home indicator and a
  floating "+" button that opens the scanner - the same quick-access shortcut you'd expect from a
  tracking app, without the extra sections (Diet/Coach/Streaks) we don't have.
- **Delete a logged meal**: each meal on today's log now has a small trash icon - tap it, confirm,
  and it's removed from today's log and totals. Doesn't affect what the recommendation engine has
  learned about how often you eat that combination (that's tracked separately and isn't undone by
  deleting a single entry).
- **Meal-type grouping (Breakfast/Morning Snack/Lunch/Evening Snack/Dinner)**: when logging a meal,
  you now pick which one it was (guessed for you based on the time of day, but always changeable).
  Tapping "Logged today" on the home screen opens a new detail view that groups everything you've
  eaten today into those five sections instead of one flat list, matching how food-tracking apps
  usually lay out a full day.
- **View a past day + profile/calendar header**: the home screen's top bar is now a profile icon
  (opens My Proteins) on one side and a calendar icon on the other. Tapping the calendar lets you
  pick any past date and see that day's meals, macros, and totals instead of only ever today's -
  the "Logged today" detail view follows along too, showing whichever day you picked. Today-only
  suggestions (the protein recommendation) only show up while you're actually viewing today.
