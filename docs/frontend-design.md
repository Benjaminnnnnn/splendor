# User Profile & Achievements Frontend Design

## Goals

- Add an auth-gated `/profile` page for logged-in players; unauthenticated visitors are redirected to login.
- Keep visual language consistent with the existing MUI theme (Renaissance browns/golds, parchment backgrounds, rounded cards, subtle shadows).
- Surface the same core stats shown on the leaderboard (wins, games played, win rate, prestige, high score) plus any extra user_stats fields.
- Provide an Achievements subsection with collectible, interactive badges that feel game-like and clearly communicate locked vs. unlocked status.

## Navigation and Access

- Route: `/profile` linked from the header (username button/box); wrap in a `RequireAuth` guard that redirects to `/login?redirect=/profile`.
- Ownership: show the logged-in user’s profile only; if we later allow viewing others, gate by role and fetch by `userId` param.
- Refresh: refetch profile data on mount and when an `achievement_unlocked` toast/event fires after a game completes.

## Data and API Assumptions

- Use the planned `GET /users/:userId/profile` to fetch `{ user, stats, achievements }` (reuse `LeaderboardEntry` shape for stats where possible).
- Stats fields to render: `games_played`, `games_won`, win rate (derived), `total_prestige_points`, `highest_prestige_score`, `total_cards_purchased`, `total_nobles_acquired`, `fastest_win_time`, `favorite_gem_type`.
- Achievements payload: unlocked + locked arrays with `code`, `name`, `description`, `category`, `icon`, `unlockedAt`, optional `progressValue/detail`. Keep client read-only; evaluation happens server-side.
- Cache profile data in a lightweight client store/context to avoid double-fetching when toggling tabs.

## Page Layout (desktop first)

- Hero header: parchment-toned `Paper` with avatar initial, username, join date/last login, and a compact “rank chip” (if available). Include quick actions: “View Leaderboard”, “Edit Settings”.
- Tabs: `Stats` and `Achievements` (MUI Tabs) with sticky tab bar on scroll.
- Stats tab:
  - KPI cards (`Card`/`Paper`) in a grid: Games Played, Games Won, Win Rate, Total Prestige, Highest Score, Fastest Win. Use gold gradients for top metrics, neutral parchment for others.
  - Detail table mirroring leaderboard columns for familiarity; add secondary metrics as list chips (favorite gem, cards purchased, nobles).
  - Trend mini-panels: a small progress bar for win rate and a timeline sparkline placeholder for future expansion (static for now, data-ready later).
- Achievements tab:
  - Filters row: category `Chip` filters (All/Milestone/Skill/Speed/etc) and a toggle for “Unlocked first”.
  - Badge grid (responsive, 2–4 columns): each badge is a `Card` with layered styles—gold foil gradient for unlocked, desaturated parchment with lock icon overlay for locked. Show icon, name, description, category pill, and unlocked date or hint text.
  - Interaction: orchestrated/staggered reveals via `framer-motion` variants (e.g., staggerChildren on list, scale+fade per badge). Hover/focus lifts the card (`translateY(-4px)`), adds a glowing border, and reveals progress (e.g., “72% toward 100 cards”). Click opens a modal/drawer with richer lore text and criteria.
  - Empty/locked state: if no achievements unlocked yet, show a call-to-action panel (“Finish your first game to unlock ‘First Game’”) plus a button to join/create a lobby.

## Visual and Interaction Details

- Background: reuse the warm parchment (`colors.background.default`) with subtle vignette; avoid the full-dark gradient used on the leaderboard to keep the profile cozy and readable.
- Components: prefer `Paper`, `Card`, `Grid`, `Chip`, `LinearProgress`, `Avatar`, `Tooltip`, `Dialog`. Use `colors.primary/secondary` for accents and `borderRadius.xl` for badge cards.
- Motion: respect `prefers-reduced-motion`; default hover animations use `animations.hover` (lift + soft shadow). Badge modal opens with a quick `animations.popup` scale if motion is allowed. For the badge grid, use `framer-motion` for staggered fade/scale in, and a subtle sparkle/shine pass on newly unlocked badges (short duration, disabled when reduced motion is preferred).
- Gamified touches: add faint particle sparkle on newly unlocked badges (one-time), and a shimmering border animation for “rare” categories. Keep effects subtle to avoid distraction.
- The artwork for achievement badges are located at `client/public/achievement-art`. They all have intuitive filenames so you should be able to map the achievement art with the actual achievement catalog.

## Responsive and State Handling

- Mobile: stack hero then tabs; stats cards collapse to 2-per-row or single column; badge grid becomes 1–2 columns with reduced padding.
- Loading: skeletons for hero, stats cards, and badge grid; block interactions until data resolves.
- Errors: inline `Alert` with retry; keep tabs disabled until a successful fetch.
- Empty states: distinct copy for “no stats yet” (new account) vs. “no achievements unlocked” (encourage play).

## Interaction Flows

- Unlock flow: after a game ends, validate if there are new game achievements unlocked;
  - If unlocked, display some cool animation of badge unlocking in a modal or something. After animation is ended, the user will be given the choice of "View Achievement" which takes them to the `/profile` page or close the current dialogue. If navigated to `/profile`, we will scroll to the Achievements section and highlight newly unlocked badges (brief glow).
  - If nothing unlocked, nothing will happen. No additional implementation needed.
- Accessibility: ensure tab focus indicators, tooltips for icons, sufficient contrast on gradients, and keyboard activation for badge cards/modals.
- Test hooks: add `data-testid` on key containers (`profile-hero`, `stats-card-games`, `achievements-grid`, `badge-card-{code}`) to enable deterministic UI tests.
