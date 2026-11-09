#!/usr/bin/env bash
# Manage the scheduled itch.io jam sync (the "Sync itch.io jams" GitHub Actions workflow).
#
# The workflow stays DISABLED until the app is deployed: without a deployed app to push to,
# every run would fail and GitHub would email you about it every 6 hours.
#
# Usage (from the project folder; needs the GitHub CLI, `gh auth login`):
#   npm run sync:status    # is it on? is everything it needs configured? recent runs
#   npm run sync:check     # verify the repo + deployed app are ready (changes nothing)
#   npm run sync:enable    # run the checks, then turn the schedule on
#   npm run sync:disable   # turn the schedule off
#   npm run sync:run       # trigger one sync right now (schedule must be on)
#
# What "ready" means (see README → "Scheduled jam sync"):
#   - repository variable SYNC_URL = your deployed app, e.g. https://jamigos.<you>.workers.dev
#   - repository secret   SYNC_SECRET = the same value as the Worker secret SYNC_SECRET
#   - the app at SYNC_URL is up and its sync endpoint exists
set -euo pipefail

WORKFLOW="sync-jams.yml"
WORKFLOW_NAME="Sync itch.io jams"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }

if ! command -v gh >/dev/null; then
	red "The GitHub CLI (gh) is required: https://cli.github.com"
	exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
	red "Not logged in to GitHub. Run: gh auth login"
	exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

workflow_state() {
	# active | disabled_manually | ...
	gh api "repos/$REPO/actions/workflows/$WORKFLOW" --jq .state
}

sync_url() {
	gh variable get SYNC_URL 2>/dev/null || true
}

has_secret() {
	gh secret list --json name --jq '.[].name' | grep -x SYNC_SECRET >/dev/null
}

# Prints problems; returns non-zero if anything is missing.
check() {
	local ok=0 url code
	bold "Checking $REPO is ready for the scheduled jam sync…"

	url=$(sync_url)
	if [[ -z "$url" ]]; then
		red "  ✗ Repository variable SYNC_URL is not set."
		echo "      Set it to your deployed app:  gh variable set SYNC_URL --body https://jamigos.<you>.workers.dev"
		ok=1
	else
		green "  ✓ SYNC_URL = $url"
	fi

	if has_secret; then
		green "  ✓ Repository secret SYNC_SECRET is set"
	else
		red "  ✗ Repository secret SYNC_SECRET is not set."
		echo "      Use the same value as the Worker secret:  gh secret set SYNC_SECRET"
		ok=1
	fi

	if [[ -n "$url" ]]; then
		code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url/" || echo 000)
		if [[ "$code" =~ ^(2|3) ]]; then
			green "  ✓ The app responds at $url ($code)"
		else
			red "  ✗ The app at $url isn't responding (HTTP $code). Deploy it first: npm run deploy"
			ok=1
		fi
		# Without a token the sync endpoint must refuse (401/403); a 404 means an old or wrong deploy.
		code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST "$url/api/internal/jams/sync" || echo 000)
		if [[ "$code" == "401" || "$code" == "403" ]]; then
			green "  ✓ The sync endpoint exists and requires the secret ($code)"
		else
			red "  ✗ Unexpected response from $url/api/internal/jams/sync (HTTP $code, expected 401)."
			ok=1
		fi
	fi
	return $ok
}

cmd="${1:-status}"
case "$cmd" in
status)
	state=$(workflow_state)
	bold "$WORKFLOW_NAME ($REPO)"
	if [[ "$state" == "active" ]]; then
		green "  Schedule: ON (every 6 hours)"
	else
		echo "  Schedule: OFF ($state)"
	fi
	url=$(sync_url)
	echo "  SYNC_URL variable: ${url:-(not set)}"
	if has_secret; then echo "  SYNC_SECRET secret: set"; else echo "  SYNC_SECRET secret: (not set)"; fi
	echo
	bold "Recent runs"
	gh run list --workflow "$WORKFLOW" --limit 5 || true
	if [[ "$state" != "active" ]]; then
		echo
		echo "To turn it on after deploying, follow README → \"Scheduled jam sync\", then: npm run sync:enable"
	fi
	;;
check)
	check
	;;
enable)
	if ! check; then
		echo
		red "Not enabling: fix the items above first (README → \"Scheduled jam sync\")."
		exit 1
	fi
	gh workflow enable "$WORKFLOW"
	green "Scheduled jam sync is ON. Trigger a first run now with: npm run sync:run"
	;;
disable)
	gh workflow disable "$WORKFLOW"
	green "Scheduled jam sync is OFF. Turn it back on with: npm run sync:enable"
	;;
run)
	if [[ "$(workflow_state)" != "active" ]]; then
		red "The workflow is disabled. Run npm run sync:enable first."
		exit 1
	fi
	gh workflow run "$WORKFLOW"
	green "Started. Follow it with: gh run watch"
	;;
*)
	echo "Usage: scripts/jam-sync.sh [status|check|enable|disable|run]"
	exit 1
	;;
esac
