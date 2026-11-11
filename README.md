# Jamigos

**Find your party. Make your game.** Jamigos helps people find teammates for itch.io game jams. Sign in with itch.io, post that you're looking for a team, or start a team and invite people.

This is an independent fan project, with no official affiliation with itch.io. It's a hobby project, not a business: there are no paid features, and I never plan to charge users. I vibe coded it with Claude and Codex. I can build it myself, but doing everything by hand didn't feel worth the time with those tools available.

The code is public here on GitHub. [Feature requests and bug reports](https://github.com/ZuelaBR/jamigos/issues/new) are welcome, as are pull requests. A project license has not been selected yet.

## What you can do

- Browse ongoing and upcoming jams, or search for a particular jam.
- Switch a jam board between **All**, **People**, and **Teams**. Discovery shows people looking for a team and teams recruiting members.
- Filter by role, with additional experience and timezone filters for people, or a skills-match filter for teams.
- Start a team, invite people, ask to join, or send a team-up request to another solo jammer.
- Find your owned and joined teams in **My teams**, linked from the homepage and account menu. Teams are grouped into current and past jams.
- Manage requests and see acceptance updates in your **Inbox**. There is no built-in chat; contact people through Discord or their itch.io profile.

You can belong to **one team per jam**, across as many different jams as you like. There is no app-imposed member limit. Joining a team closes your looking-for-team post and cancels your other pending invites, join requests and team-ups for that jam. Owners can switch recruiting on or off without deleting the team.

When two solo jammers team up, accepting the request creates a team with both people. The sender becomes the owner and can rename it. Inbox acceptance updates are history, not a statement of current membership: an update stays visible if the team is later disbanded. The inbox shows updates from the last 30 days, 20 per page, and marks only the updates on the page you open as read. That display window is not a database deletion policy.

## Data and visibility

The application stores its data in Cloudflare D1. Local development uses a separate database under `.wrangler/`.

| Data stored                                                                                                                              | Visibility in the app                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Public itch.io user ID, username, display name, avatar URL and profile link; bio, roles, tools, experience, timezone and portfolio links | Profile details are public after onboarding.                                |
| Discord username, if provided                                                                                                            | Visible to signed-in users, not just teammates.                             |
| Looking-for-team posts, teams, recruiting status, wanted roles and memberships                                                           | Public. **My teams** requires sign-in, but the teams themselves are public. |
| Invitations, join requests and solo team-up requests, including messages, timestamps and status                                          | Visible to the people involved; team owners manage team requests.           |
| Acceptance notifications and whether they've been read                                                                                   | Visible to the notification recipient.                                      |
| Account and activity timestamps, onboarding status, session-token hashes and expiry dates                                                | Internal application data.                                                  |
| Public jam listings copied from itch.io                                                                                                  | Public.                                                                     |

Jamigos requests only itch.io's `profile:me` permission. It does not collect your itch.io password or email address. The access token is used to fetch your public profile during login and is not saved in the database. A random session token is kept in an HTTP-only cookie; the database stores its hash and expiry. The avatar URL is refreshed from itch.io when you sign in.

These statements describe application data and access controls. They do not describe any infrastructure logs a hosting provider may keep. Public source code does not include the user database or local environment files. Never attach database dumps, real user data or credentials to a public issue or pull request.

## Local development

Use **Node.js 24**, matching the jam-sync workflow, and npm.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The example environment file sets `DEV_AUTH=1`. With that flag and an empty `ITCH_CLIENT_ID`, Sign in uses a local test account. You can also open `/auth/dev?user=alice` or `/auth/dev?user=bob` in separate browser profiles to test multiple users.

The shortcut works only in development with `DEV_AUTH=1`; it is unavailable in a production build. Keep production `DEV_AUTH` empty. The example `SYNC_SECRET` is for local use only; use a new random value for deployment. Keep `.dev.vars`, `.env` and `.wrangler/` out of Git.

To fill your local jam list, leave the dev server running and use a second terminal:

```sh
SYNC_PAGES=1 npm run sync:jams
```

This fetches one page each of itch.io's in-progress and upcoming listings, with a default five-second delay between requests. The crawler defaults to `http://localhost:5173` and reads `SYNC_SECRET` from `.dev.vars` unless set in its environment. Set `SYNC_URL` if your local server uses another origin.

### Tests and checks

```sh
npx playwright install chromium
npm run test:unit -- --run
npx playwright test
npm run check
npm run lint
npm run build
```

Unit tests use isolated D1 test databases. Playwright starts a server on **port 5174** and recreates only `.wrangler/e2e/` on every run. It seeds that database from saved itch.io listing pages in `src/lib/jams/fixtures/`, so tests do not crawl itch.io or use your regular local database.

Keep `.dev.vars` configured for local development: the browser tests need `DEV_AUTH=1`, and seeding reads `SYNC_SECRET` from that file. The suite covers desktop and mobile Chromium. It uses the local sign-in shortcut, so passing tests do not verify live itch.io OAuth or production infrastructure.

To refresh parser fixtures, save itch.io's [in-progress listing](https://itch.io/jams/in-progress) as `src/lib/jams/fixtures/in-progress.html` and its [upcoming listing](https://itch.io/jams/upcoming) as `src/lib/jams/fixtures/upcoming.html`. Keep the jam slugs used in browser tests available, or update those tests alongside the fixtures.

| Command                      | What it does                                                      |
| ---------------------------- | ----------------------------------------------------------------- |
| `npm run check`              | Svelte and TypeScript checks, plus Wrangler type validation       |
| `npm run lint`               | Prettier and ESLint                                               |
| `npm run test:unit -- --run` | Run unit tests once (`npm run test:unit` starts watch mode)       |
| `npx playwright test`        | Run browser tests after installing Chromium                       |
| `npm test`                   | Run unit tests, install Playwright browsers and run browser tests |
| `npm run build`              | Build for Cloudflare Workers                                      |
| `npm run db:generate`        | Generate a migration after changing the database schema           |
| `npm run db:migrate:local`   | Apply migrations to the local development database                |
| `npm run db:migrate:remote`  | Apply migrations to the configured remote database                |
| `npm run sync:jams`          | Fetch itch.io jam listings and send them to the app               |

## itch.io login (OAuth)

1. Create an app in [itch.io OAuth settings](https://itch.io/user/settings/oauth-apps).
2. Register `http://localhost:5173/auth/callback` and your deployed origin followed by `/auth/callback`. If you use `127.0.0.1` locally, register that host too and use it consistently.
3. Set `ITCH_CLIENT_ID` in `.dev.vars` for local use and in `wrangler.jsonc` under `vars` for production.

The implementation uses the [authorization code flow with PKCE](https://itch.io/docs/api/oauth#authorization-code-flow-recommended), which does not require a client secret. The callback origin must match the address used to open the app. Before launch, test a complete login and logout with a real itch.io account; the automated tests use development authentication.

## Deploying to Cloudflare

The app targets Cloudflare Workers and D1. Using a free tier depends on your account and usage; this README does not guarantee hosting costs.

1. Sign in and create the database:

   ```sh
   npx wrangler login
   npx wrangler d1 create jamigos
   ```

2. Copy the returned database ID into `wrangler.jsonc`. Set `vars.ITCH_CLIENT_ID` and leave `vars.DEV_AUTH` empty. Set a fresh, random sync secret through Wrangler's prompt:

   ```sh
   npx wrangler secret put SYNC_SECRET
   ```

3. Deploy:

   ```sh
   npm run deploy
   ```

   This builds the app, applies **remote** migrations, then deploys the Worker. Review generated migrations before running it.

4. Open the deployed URL, register its OAuth callback, and verify sign-in. Configure jam syncing only after the app works.

### Scheduled jam sync

The workflow in [`.github/workflows/sync-jams.yml`](.github/workflows/sync-jams.yml) declares a run every six hours and supports manual runs. Whether it is enabled is a GitHub setting, not something this README can guarantee. Check it with `npm run sync:status`; keep it disabled until the deployed app and sync settings are ready.

The management commands require the GitHub CLI, authenticated with access to this repository. Run them from this checkout. For a fork, configure the fork's own secrets, variables and deployment.

Set the deployed base URL as an Actions **variable**, and the same random secret used by the Worker as an Actions **secret**. Replace the example URL below:

```sh
gh variable set SYNC_URL --body "https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev"
gh secret set SYNC_SECRET
npm run sync:check
npm run sync:enable
npm run sync:run
```

`gh secret set` prompts for the value, so you do not need to put the secret in shell history. Never put it in `wrangler.jsonc`, a GitHub variable, an issue or a commit.

| Command                | What it does                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run sync:status`  | Show workflow state, configuration presence and recent runs                                              |
| `npm run sync:check`   | Check settings exist, the app responds and the endpoint rejects unauthenticated requests; change nothing |
| `npm run sync:enable`  | Run those checks, then enable the workflow                                                               |
| `npm run sync:disable` | Disable the workflow                                                                                     |
| `npm run sync:run`     | Trigger a manual run; this script requires the workflow to be enabled                                    |

The readiness check does **not** prove that the Worker and GitHub secrets match. After enabling, check the first run with `gh run watch`. If the settings are missing, the workflow fails at its configuration step. GitHub failure emails depend on your notification settings.

The crawler runs in GitHub Actions, outside the request-handling Worker, so it can wait between requests and retry rate limits. If a successful listing response parses to zero jams, the job fails; inspect the response, refresh the fixtures and run the parser tests before changing the parser.

## Contributing

[Open an issue](https://github.com/ZuelaBR/jamigos/issues/new) for a feature request or bug. Describe what you were trying to do, what happened and what you expected. For UI bugs, include the viewport size or device and a screenshot with personal information removed.

For a pull request, keep the change focused, explain the resulting behavior and include the checks you ran. Run formatting, lint and type checks; run the relevant unit or browser tests for behavior changes. Use synthetic accounts and local test data. Do not include credentials, database exports or screenshots with real contact details.

## How it's organised

```text
src/lib/jams/parse.ts        itch.io HTML parsers, tested against saved fixtures
src/lib/server/db/schema.ts users, sessions, jams, teams, memberships, posts, requests,
                            solo team-ups and notifications
src/lib/server/auth/        OAuth, hashed-session storage and itch.io profile updates
src/lib/server/services/    Business rules, board filters, home totals and My teams
src/lib/components/         Shared cards, forms, menus, dialogs and feedback
src/routes/jams/[slug]/     Jam board: All, People and Teams
src/routes/teams/           My teams and individual team management pages
src/routes/inbox/           Requests and acceptance history
scripts/sync-jams.ts        Crawler used locally and by GitHub Actions
```

## Brand

Assets live in `static/brand/`, served at `/brand/`:

- `favicons/`: browser icons, Apple touch icon and web app manifest, linked from `src/app.html`
- `logos/jamigos-horizontal-{light,dark}.svg`: header logo
- `icons/jamigos-team-{light,dark}.svg`: the team mark shown on mobile and the homepage
- `social/jamigos-open-graph-light.png`: the 1200×630 link-preview image

The `only-light` and `only-dark` CSS classes follow the selected theme, including the system setting. Brand colours are coral `#FA5C5C` and ink `#222`; buttons use ink text on coral. App name, tagline, repository links and theme colour are defined in `src/lib/config.ts`.
