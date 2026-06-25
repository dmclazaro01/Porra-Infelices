# Porras Infelices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a World Cup 2026 prediction pool app deployed on GitHub Pages with Supabase backend, simplified scoring system, and automatic result sync via football-data.org API.

**Architecture:** SPA in vanilla JS + Vite, deployed to GitHub Pages. Supabase provides auth, PostgreSQL, and real-time updates. An Edge Function syncs match results from football-data.org. The frontend replicates the original porra.iamyipi.net UI with our custom scoring.

**Tech Stack:** Vanilla JS, Vite, Supabase JS SDK, football-data.org API v2, GitHub Pages

---

## File Structure

```
porras-infelices/
  supabase/
    migrations/
      001_initial_schema.sql        - All tables, RLS policies, seed data
    functions/
      sync-results/                   - Edge Function to sync from football-data.org
      index.ts
  src/
    main.js                           - Entry point, init Supabase, load state, render
    api.js                             - All Supabase queries (auth, predictions, matches, etc.)
    auth.js                            - Login, signup, group choice, session management
    scoring.js                         - Points calculation logic (new scoring system)
    state.js                           - Global app state, reactive updates
    utils.js                           - Formatting, helpers, date utils
    render/
      login.js                         - Login screen + group choice
      topbar.js                        - Header with user info, lock status
      groups.js                        - Group prediction tab (1/X/2, standings, tiebreaks)
      knockout.js                      - Knockout bracket tab
      bonus.js                         - Pichichi + MVP tab
      results.js                       - Real results tab
      leaderboard.js                   - Leaderboard + prize pool
      rules.js                         - Rules tab (new scoring explained)
      picks.js                         - Public picks tab (locked until deadline)
      admin.js                         - Admin panel (manage players, payments, results)
    style.css                          - Main stylesheet (based on original Dell-1996 theme)
  index.html                           - HTML shell
  vite.config.js                       - Vite config with Supabase env vars
  package.json                         - Dependencies
  .env.example                         - Template for env vars
  .github/
    workflows/
      deploy.yml                       - GitHub Pages deploy workflow
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Initialize project with Vite**

```bash
cd "C:\Users\DANIE\OneDrive\Documentos\Github\Porras Infelices"
npm init -y
npm install @supabase/supabase-js vite
npm install -D terser
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY),
  },
});
```

- [ ] **Step 3: Create .env.example**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
FOOTBALL_DATA_API_TOKEN=your-token
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
*.local
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Porras Infelices · Mundial 2026</title>
  <link rel="stylesheet" href="/src/style.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: Update package.json scripts**

```json
{
  "name": "porras-infelices",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "terser": "^5.0.0"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: project setup with Vite and Supabase"
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write the complete SQL migration**

This single migration creates all tables, RLS policies, and seed data for the World Cup 2026. It includes:
- `player_groups` - groups/penas
- `profiles` - user profiles with role, group, payment status
- `teams` - 48 World Cup teams
- `groups_t` - 12 groups
- `matches` - all group stage matches (72) + knockout bracket slots
- `group_predictions` - 1/X/2 predictions per match per user
- `tiebreak_predictions` - manual tiebreak order per group per user
- `knockout_predictions` - bracket predictions per match per user
- `bonus_predictions` - top scorer + best player per user
- `settings` - global config (lock deadline, entry fee)
- `sync_log` - result sync tracking

RLS policies: players can only write their own predictions, can only read others' predictions after lock, admin can do everything.

The seed data includes all 48 teams with FIFA country codes, 12 groups, group stage match schedule, and knockout match slots.

- [ ] **Step 2: Apply migration to Supabase**

```bash
supabase link --project-ref lhbunbxawlbhfcvbkqmf
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: Supabase schema with RLS and World Cup 2026 seed data"
```

---

## Task 3: Core Modules (api.js, auth.js, state.js, utils.js)

**Files:**
- Create: `src/api.js`
- Create: `src/auth.js`
- Create: `src/state.js`
- Create: `src/utils.js`

- [ ] **Step 1: Create src/api.js**

Supabase client initialization + all DB query functions:
- `initSupabase()` - create client with env vars
- `fetchState()` - load all app state (matches, groups, settings, predictions, leaderboard)
- `login(name, password)` - authenticate
- `logout()` - sign out
- `saveGroupPrediction(matchId, prediction)` - save 1/X/2
- `saveTiebreak(groupLetter, teamOrder)` - save tiebreak order
- `saveKnockoutPrediction(matchNumber, winnerTeamId)` - save bracket pick
- `saveBonus(topScorer, bestPlayer)` - save bonus predictions
- `joinGroup(groupId)` - player joins a group
- `adminUpdateMatch(matchId, data)` - admin update match results
- `adminTogglePaid(userId)` - admin mark payment
- `adminToggleActive(userId)` - admin activate/deactivate player

Uses Supabase client with `@supabase/supabase-js`.

- [ ] **Step 2: Create src/auth.js**

Authentication flow:
- `handleLogin(form)` - form submission handler
- `handleLogout()` - sign out
- `handleGroupChoice(groupName)` - first-time group selection
- `getCurrentUser()` - get current session
- Auth state listener for auto-refresh

- [ ] **Step 3: Create src/state.js**

Global reactive application state:
- `state` object with all data (profile, matches, groups, predictions, leaderboard, etc.)
- `load()` - fetch all state from Supabase
- `subscribe(callback)` - reactivity
- Real-time subscription to match result updates
- Lock deadline timer (auto-lock when deadline passes)

- [ ] **Step 4: Create src/utils.js**

Utility functions:
- `formatDate(isoString)` - format dates in Spanish locale
- `formatMoney(cents)` - format euros
- `formatPoints(n)` - format point values
- `teamName(teamId)` - lookup team name from state
- `teamFlag(teamId)` - lookup team flag emoji
- `el(tag, attrs, children)` - DOM helper (from original)
- `field(label, control)` - form field helper

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: core modules - api, auth, state, utils"
```

---

## Task 4: Scoring Logic

**Files:**
- Create: `src/scoring.js`

- [ ] **Step 1: Create src/scoring.js**

All scoring calculation functions:

```js
// GROUP STAGE SCORING
// For each group, compare user's predicted standings with real standings:
// - +1 point per team correctly predicted as classified (1st or 2nd)
// - +1 extra point per team with exact position correct (1st as 1st, 2nd as 2nd)
// - +1 point per 3rd-place team correctly predicted as one of the 8 best thirds

function computeGroupPoints(userPredictions, realStandings, userTiebreaks) { ... }
function computeThirdPlacePoints(userTiebreaks, realBestThirds) { ... }

// KNOCKOUT SCORING
// +1 point per correct winner in each knockout match

function computeKnockoutPoints(userKnockoutPredictions, realResults) { ... }

// BONUS SCORING
// +5 for correct top scorer, +5 for correct MVP

function computeBonusPoints(userBonus, realTopScorer, realBestPlayer) { ... }

// TOTAL
function computeTotalPoints(userId, state) { ... }
```

- [ ] **Step 2: Commit**

```bash
git add src/scoring.js
git commit -m "feat: scoring logic - group, knockout, bonus, total"
```

---

## Task 5: UI - Login and Topbar

**Files:**
- Create: `src/render/login.js`
- Create: `src/render/topbar.js`

- [ ] **Step 1: Create src/render/login.js**

Login screen with name + password form, matching the original's retro Dell-1996 aesthetic. Also includes the group choice screen (first login after registration).

- [ ] **Step 2: Create src/render/topbar.js**

Top header bar with: brand name, user info, group name, lock status badge, admin badge, logout button. Same visual style as original.

- [ ] **Step 3: Commit**

```bash
git add src/render/
git commit -m "feat: login and topbar UI"
```

---

## Task 6: UI - Groups Tab

**Files:**
- Create: `src/render/groups.js`

- [ ] **Step 1: Create src/render/groups.js**

Group prediction tab. For each of the 12 groups:
- Display 6 matches with 1/X/2 buttons (odds shown as info, not for scoring)
- Computed standings table (based on user's predictions)
- Tiebreak arrows when teams are tied on points
- Group ribbon with team names
- Progress indicator (X/6 matches filled)

Logic mirrors the original: when user picks 1/X/2, standings recalculate live. Tiebreaks save with debounce. Lock banner at top of section.

- [ ] **Step 2: Commit**

```bash
git add src/render/groups.js
git commit -m "feat: groups tab with predictions and standings"
```

---

## Task 7: UI - Knockout Bracket

**Files:**
- Create: `src/render/knockout.js`

- [ ] **Step 1: Create src/render/knockout.js**

Knockout bracket tab. Two-sided bracket:
- Left: Round of 32 → Round of 16 → Quarter-finals → Semi-final 1
- Center: Final + 3rd place
- Right: Semi-final 2 → Quarter-finals → Round of 16 → Round of 32

Each match shows the two teams (derived from group standings predictions) and a clickable button to pick the winner. Matches cascade: picking a winner in an earlier round propagates that team forward.

Same visual layout as the original with bracket lines connecting rounds.

- [ ] **Step 2: Commit**

```bash
git add src/render/knockout.js
git commit -m "feat: knockout bracket tab"
```

---

## Task 8: UI - Bonus, Results, Rules Tabs

**Files:**
- Create: `src/render/bonus.js`
- Create: `src/render/results.js`
- Create: `src/render/rules.js`

- [ ] **Step 1: Create src/render/bonus.js**

Bonus tab: two text inputs (top scorer and best player) with auto-save. Shows +5 PTS burst. After lock, shows official results if available.

- [ ] **Step 2: Create src/render/results.js**

Results tab: real match results grouped by group (group stage) and by round (knockout). Shows scores, live indicator for in-progress matches. Auto-refreshes via Supabase realtime or polling.

- [ ] **Step 3: Create src/render/rules.js**

Rules tab explaining the simplified scoring system:
- Group classification: +1 classified, +1 exact position, +1 third-place qualifier
- Knockout: +1 per correct winner (flat)
- Bonus: +5 pichichi, +5 MVP
- Prize: 2€ entry, 2nd gets their bet back, 1st gets the rest

- [ ] **Step 4: Commit**

```bash
git add src/render/bonus.js src/render/results.js src/render/rules.js
git commit -m "feat: bonus, results, and rules tabs"
```

---

## Task 9: UI - Leaderboard, Picks, Admin Tabs

**Files:**
- Create: `src/render/leaderboard.js`
- Create: `src/render/picks.js`
- Create: `src/render/admin.js`

- [ ] **Step 1: Create src/render/leaderboard.js**

Leaderboard tab showing:
- Prize pool (2€ per player, 1st gets pot minus 2€, 2nd gets 2€)
- Main ranking table (position, name, group, points, prize, payment status)
- Group filter for admin
- Payment status indicators

- [ ] **Step 2: Create src/render/picks.js**

Public picks tab. Locked until deadline. After lock, shows other players' predictions:
- Player selector on the left
- Full prediction detail on the right (groups, knockout, bonus)
- Scoring status per pick (correct/wrong/pending)

- [ ] **Step 3: Create src/render/admin.js**

Admin panel with:
- Player management table (activate/deactivate, mark payments, assign groups)
- Match result update form
- Settings (lock deadline, entry fee)
- Bonus answer inputs (official top scorer and MVP)
- Sync results button (trigger Edge Function)

- [ ] **Step 4: Commit**

```bash
git add src/render/leaderboard.js src/render/picks.js src/render/admin.js
git commit -m "feat: leaderboard, picks, and admin tabs"
```

---

## Task 10: Main App + Styles

**Files:**
- Create: `src/main.js`
- Create: `src/style.css`

- [ ] **Step 1: Create src/main.js**

Main entry point:
- Initialize Supabase client
- Check auth state (logged in or not)
- Load full app state
- Set up real-time subscriptions
- Render appropriate screen (login, group choice, or main app)
- Tab navigation
- Auto-lock timer
- Periodic state refresh (60s)
- Download quiniela image (locked state feature from original)

- [ ] **Step 2: Create src/style.css**

Complete stylesheet replicating the original Dell-1996 catalog-era design:
- Black frame, white paper background
- Helvetica-Black headlines, Times Roman body
- Table-layout catalog UI
- Beveled 3D buttons
- Group ribbon colors per group (A-L, 6 colors cycling)
- Bracket board layout (3-column grid)
- Responsive breakpoints (980px, 720px)
- All component styles from the original CSS

- [ ] **Step 3: Commit**

```bash
git add src/main.js src/style.css
git commit -m "feat: main app entry and complete stylesheet"
```

---

## Task 11: Supabase Edge Function for Result Sync

**Files:**
- Create: `supabase/functions/sync-results/index.ts`

- [ ] **Step 1: Create the Edge Function**

Deno TypeScript Edge Function that:
1. Fetches World Cup 2026 matches from football-data.org API (`/v4/competitions/WC/matches`)
2. Updates match scores in Supabase
3. Fetches standings (`/v4/competitions/WC/standings`)
4. Fetches scorers (`/v4/competitions/WC/scorers`)
5. Updates the sync_log table
6. Returns summary of updated matches

Uses `FOOTBALL_DATA_API_TOKEN` environment variable for auth.

- [ ] **Step 2: Deploy Edge Function**

```bash
supabase functions deploy sync-results
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/
git commit -m "feat: Edge Function for football-data.org result sync"
```

---

## Task 12: Deploy Configuration

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create GitHub Actions workflow**

Builds the Vite project and deploys to GitHub Pages:
- Trigger on push to main branch
- Install dependencies
- Build with `npm run build`
- Deploy `dist/` folder to GitHub Pages
- Upload `dist/` artifact

- [ ] **Step 2: Add repository secrets documentation**

Document that these secrets need to be configured in GitHub:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: GitHub Pages deploy workflow"
```

---

## Task 13: Integration Testing + Polish

**Files:**
- Modify: various files for bug fixes

- [ ] **Step 1: Run dev server and test all tabs**

```bash
npm run dev
```

Test: login, group choice, group predictions, knockout bracket, bonus, results viewing, leaderboard, rules, admin panel.

- [ ] **Step 2: Fix any issues found during testing**

- [ ] **Step 3: Build for production**

```bash
npm run build
```

- [ ] **Step 4: Commit any fixes**

```bash
git add .
git commit -m "fix: integration testing fixes"
```