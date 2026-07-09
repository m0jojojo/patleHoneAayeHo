# UI design system

A shared visual language for restyling screens, starting with the Dashboard. Built after comparing
our meal-scan results against HealthifyMe's app and noticing our screens were all inline-styled
one-offs (hardcoded hex values duplicated per screen) rather than pulling from a common set of
design decisions.

## Scope

This restyles the **presentation** of data we already have (today's meals, macro progress, the
recommendation card) - it deliberately does not add new trackers (weight, water, steps, sleep),
a coach-chat feature, or a multi-tab bottom navigation bar, all of which appear in the HealthifyMe
reference but aren't things this app tracks. See `CHANGELOG.md` for the plain-English summary.

## Tokens (`frontend/src/theme/tokens.ts`)

Every component below pulls from this instead of inlining hex values or magic numbers:

| Token group | Contents |
|---|---|
| `colors` | Page/surface/border colors, text colors, brand + semantic state colors (`success`/`warning`/`danger`/`info`), and one accent color per macro (`calories`/`protein`/`carbs`/`fat`) |
| `spacing` | `xs` (4) through `xxl` (32), a 4px-based scale |
| `radius` | `sm` (6) through `xl` (16), plus `pill` (999) for fully-rounded buttons |
| `shadows` | A single `card` preset covering both Android (`elevation`) and iOS (`shadow*`) properties |
| `typography` | Named roles (`title`, `subtitle`, `body`, `bodyBold`, `caption`, `label`, `statValue`) rather than raw font sizes |

## Icons

`@expo/vector-icons` (Ionicons) was chosen over alternatives because it needs no native linking
and works identically in Expo Go and the standalone release APK this project already builds. Its
required peer dependency, `expo-font`, is installed alongside it - without it, icons can silently
fail outside of Expo Go specifically, so this was smoke-tested before any component was built on
top of it (`frontend/src/theme/iconSmokeTest.test.tsx`).

## Component inventory (`frontend/src/components/`)

**Primitives** - small, single-purpose, reused across composite components:

| Component | Purpose |
|---|---|
| `Card` | Base rounded, shadowed surface |
| `ProgressBar` | Horizontal bar; fill color reflects the *true* (unclamped) percentage of target - green when on track, amber when behind pace (`< 85%`), red when over (`> 100%`) - while the visual width is clamped at 100% |
| `StatBadgeIcon` | Colored circular icon chip; icon name and tint color are chosen by the caller |
| `PillButton` | Rounded pill button (`subtle` or `solid` variant), replacing plain text links. Accepts an optional `style` override (e.g. `flex: 1` for the calendar's evenly-split Cancel/Done buttons) |
| `SectionLabel` | Small icon+label section header |
| `EmptyState` | Friendlier "nothing here yet" treatment than a bare gray text line |
| `BottomNavBar` | Simplified bottom bar: a static Home indicator + a centered, elevated "+" that triggers the scan-meal action - no Diet/Coach/Streaks tabs, since those aren't features this app has |
| `CalendarModal` | Custom month-grid date picker (no calendar library) - lets the dashboard load a past day's summary; future dates are shown but disabled |

**Composites** - assembled from the primitives above, each mapped to data the backend already
returns:

| Component | Purpose |
|---|---|
| `MacroSummaryCard` | The viewed day's calories as the headline number (caption reads "Eaten today" or "Eaten on 5 Jul" via its `dateLabel` prop), with the meal-scan camera action embedded in the card header, and protein/carbs/fat as three color-coded mini `ProgressBar`s underneath |
| `MealLogCard` | One logged meal: time, calorie readout, dish list, and a small per-macro breakdown row, with an optional delete button |
| `MealTypeSection` | One meal-type slot (Breakfast/Morning Snack/Lunch/Evening Snack/Dinner) on the Today-detail screen: a header with summed calories, then a `MealLogCard` per meal or an `EmptyState` |

## Shared date helpers (`frontend/src/dateUtils.ts`)

`formatDateString`/`todayDateString`/`formatDateForDisplay` are the single source of truth for
"YYYY-MM-DD" formatting and short display labels (e.g. "9 Jul"), used by `CalendarModal`,
`DashboardScreen`, and `TodayDetailScreen` - written once to avoid three slightly-different copies
of the same date math.

## Dashboard composition

`DashboardScreen.tsx` composes these as: header (profile-icon avatar → `onOpenSettings`, a date
title, and a calendar-icon button that opens `CalendarModal`) → `MacroSummaryCard` →
recommendation/frequency-prompt banners (`Card` + `PillButton`, only shown when viewing today,
since a protein-gap recommendation doesn't make sense attached to a past day) → `SectionLabel` →
a `MealLogCard` per logged meal, or `EmptyState` when none exist. `BottomNavBar` and (when open)
`CalendarModal` sit outside the scrollable content.

Picking a date from the calendar re-fetches `getTodaySummary(selectedDate)` and updates every
date-dependent label on the screen; tapping "Logged today" passes that same date through to
`TodayDetailScreen`, so drilling in from a past day shows that day's meals, not always real today.

Every existing `testID` was preserved during the initial restyle (loading/error states, the scan
and settings buttons, the recommendation/dismiss/frequency-prompt flow, per-meal rows, and the
empty state) - the only test assertions that changed then were the two that checked the *exact
text format* of a macro value (previously `"500 / 2000"`, now `"500g"` next to a `ProgressBar`).

## Testing approach

React Native Testing Library isn't a visual-regression tool, so component tests verify *correct
data-to-visual mapping* (e.g. a macro over 100% of target renders the danger color) rather than
pixel-perfect appearance. Visual/spacing/contrast correctness is confirmed by hand on a real device
- see the manual verification step tracked alongside this work.
