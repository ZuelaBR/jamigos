# Jamigos

**Find your party. Make your game.** Jamigos helps people find teammates for itch.io game jams. Sign in with itch.io, say what you do, then post on a jam's board or start a team and invite people.

**Stack:** SvelteKit 3 · Svelte 5 · Tailwind 4 · Drizzle ORM · Cloudflare Workers + D1 (free tier) · GitHub Actions for jam syncing.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # DEV_AUTH=1 enables the dev login
npm run db:migrate:local         # creates the local D1 database in .wrangler/
npm run dev
```

Open http://localhost:5173. Without an itch.io OAuth app, "Sign in" falls back to the dev login. You can also use `/auth/dev?user=alice` directly, which lets you test with several users in different browsers.

Fill the jam list with real data (this crawls itch.io slowly, about 5 seconds per page):

```sh
SYNC_PAGES=1 npm run sync:jams   # 1 page each of "in progress" and "upcoming"
```

### Testing

Unit tests run against an in-memory D1. The Playwright tests start their own dev server on port 5174, with a fresh database in `.wrangler/e2e/` on every run, so they never touch your dev data. That database is filled with **real itch.io jams** from the saved listing pages in `src/lib/jams/fixtures/`, rather than live itch.io, which keeps the tests fast and avoids rate limits. To refresh those pages, re-download `https://itch.io/jams/in-progress` and `https://itch.io/jams/upcoming` into that folder.

### Useful scripts

| Command                                | What it does                                                |
| -------------------------------------- | ----------------------------------------------------------- |
| `npm run check`                        | Type-check everything                                       |
| `npm run lint`                         | Prettier + ESLint                                           |
| `npx vitest run`                       | Unit tests (parsers, timezones, team rules on in-memory D1) |
| `npx playwright test`                  | End-to-end team flow (desktop + mobile) on a throwaway DB   |
| `npm run db:generate`                  | Generate a SQL migration after editing `schema.ts`          |
| `npm run db:migrate:local` / `:remote` | Apply migrations                                            |
| `npm run sync:jams`                    | Crawl itch.io jam listings and push them to the app         |

## itch.io login (OAuth)

1. Go to https://itch.io/user/settings/oauth-apps and create an app.
2. Add the redirect URLs `http://localhost:5173/auth/callback` and `https://<your-domain>/auth/callback`.
3. Put the **client ID** in `ITCH_CLIENT_ID`, in `.dev.vars` locally and in `wrangler.jsonc` → `vars` for production. You don't need a client secret, because the login uses PKCE.

We request only the `profile:me` scope. The access token is used once to read the profile and is never stored.

## Deploying to Cloudflare (free)

Follow these steps in order. The scheduled jam sync is the **last** step, because it needs the deployed app.

1. **Create the database and deploy:**

   ```sh
   npx wrangler login
   npx wrangler d1 create jamigos          # copy the database_id into wrangler.jsonc
   npx wrangler secret put SYNC_SECRET      # any long random string; keep it for step 3
   # set vars.ITCH_CLIENT_ID in wrangler.jsonc (see "itch.io login" above), then:
   npm run deploy                           # build + remote migrations + wrangler deploy
   ```

2. **Check the site** at the URL wrangler printed, for example `https://jamigos.<you>.workers.dev`.
3. **Give GitHub what the sync needs**, using the same `SYNC_SECRET` value as in step 1:

   ```sh
   gh variable set SYNC_URL --body https://jamigos.<you>.workers.dev
   gh secret set SYNC_SECRET
   ```

4. **Turn on the scheduled sync**, then start a first run straight away:

   ```sh
   npm run sync:enable   # checks steps 1–3 first and refuses if anything is missing
   npm run sync:run
   ```

### Scheduled jam sync

> **Status: disabled until the app is deployed.** Without a deployed app, every run would fail and GitHub would email you every 6 hours. Check the current state at any time with `npm run sync:status`.

`.github/workflows/sync-jams.yml` crawls itch.io's jam listings every 6 hours and pushes them to the app. It needs two things in the GitHub repository:

| Name          | Kind                 | Value                                                       |
| ------------- | -------------------- | ----------------------------------------------------------- |
| `SYNC_URL`    | Actions **variable** | your deployed app, e.g. `https://jamigos.<you>.workers.dev` |
| `SYNC_SECRET` | Actions **secret**   | the same value as the Worker secret `SYNC_SECRET`           |

Manage it with these commands (they need the GitHub CLI, signed in with `gh auth login`):

| Command                | What it does                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run sync:status`  | Shows whether the schedule is on, whether both settings exist, and the recent runs                           |
| `npm run sync:check`   | Verifies the variable, the secret, that the app responds, and that its sync endpoint exists; changes nothing |
| `npm run sync:enable`  | Runs the same checks, then turns the schedule on. It refuses if anything is missing                          |
| `npm run sync:disable` | Turns the schedule off (for example while you migrate or debug)                                              |
| `npm run sync:run`     | Triggers one sync now (the schedule must be on); follow it with `gh run watch`                               |

If someone turns the workflow on from GitHub's Actions tab before it's configured, its first step stops with a clear "Jam sync is not configured" error rather than a confusing crawler failure.

The crawler runs in GitHub Actions, not in a Worker, because itch.io rate-limits aggressively. Polite crawling needs long waits between requests, and parsing needs more CPU than a free Worker gets. If itch.io changes its markup, the job **fails loudly** (it reports 0 jams parsed), so GitHub emails you. To update the parser, refresh the fixtures in `src/lib/jams/fixtures/` and run the tests.

## Brand

Logos, icons and social images come from the Jamigos brand kit. The site uses the subset in `static/brand/`, served at `/brand/...`:

- `favicons/`: tab icons, the Apple touch icon, maskable app icons and `site.webmanifest`, linked from `src/app.html`
- `logos/jamigos-horizontal-{light,dark}.svg`: the header logo (180px wide; on small screens the header shows just the team mark)
- `icons/jamigos-team-{light,dark}.svg`: the team mark, also used on the home page
- `social/jamigos-open-graph-light.png`: the 1200×630 link-preview image (`og:image`)

Light/dark artwork is switched in CSS with the `only-light` / `only-dark` classes, which follow the theme switcher as well as the OS. Brand colours: coral `#FA5C5C` (buttons, with charcoal `#222` text as the kit specifies), ink `#222`. The name, tagline and theme colour are in `src/lib/config.ts`.

## How it's organised

```
src/lib/jams/parse.ts            itch.io HTML parsers (pure, fixture-tested)
src/lib/server/db/schema.ts      tables: users, sessions, jams, teams, team_members, lfg_posts, team_requests
src/lib/server/auth/             PKCE OAuth, sessions (hashed tokens), user upsert
src/lib/server/services/         business rules (teams.ts holds the invite/request/join logic)
src/routes/jams/[slug]/          the main board: players looking + teams recruiting
src/routes/teams/[id]/           team page with members' contact info and owner tools
scripts/sync-jams.ts             crawler used by the GitHub Action
```

Key rules: each user can be on **one team per jam** (enforced by a unique index). When someone joins a team, their LFG post closes and their other pending requests for that jam are cancelled. Contact details are visible only to signed-in users.

Two solo jammers can also **team up** without either of them starting a team first. One sends a team-up request; when the other accepts, a team named after both of them (for example "Mika & Devon") is created with both as members, and the sender is the owner who can rename it. Joining any team cancels your other pending invites, join requests and team-ups for that jam.

When someone accepts something you sent (a team-up, a join request or an invite), you get an update in your **Inbox**. Unread updates count towards the Inbox badge, and opening the Inbox marks them as read.

Jamigos is a fan project and is not affiliated with itch.io.
