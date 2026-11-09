# JamMates

Find teammates for itch.io game jams. Sign in with itch.io, say what you do, then post on a jam's board or start a team and invite people.

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

```sh
npx wrangler login
npx wrangler d1 create jammates          # copy the database_id into wrangler.jsonc
npx wrangler secret put SYNC_SECRET      # any long random string
# set vars.ITCH_CLIENT_ID in wrangler.jsonc, then:
npm run deploy                           # build + remote migrations + wrangler deploy
```

### Scheduled jam sync

`.github/workflows/sync-jams.yml` runs every 6 hours, and you can also trigger it from the Actions tab. In the GitHub repo settings, add:

- the **variable** `SYNC_URL`: your deployed URL, for example `https://jammates.<you>.workers.dev`
- the **secret** `SYNC_SECRET`: the same value you gave wrangler

The crawler runs in GitHub Actions, not in a Worker, because itch.io rate-limits aggressively. Polite crawling needs long waits between requests, and parsing needs more CPU than a free Worker gets. If itch.io changes its markup, the job **fails loudly** (it reports 0 jams parsed), so GitHub emails you. To update the parser, refresh the fixtures in `src/lib/jams/fixtures/` and run the tests.

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

JamMates is a fan project and is not affiliated with itch.io.
