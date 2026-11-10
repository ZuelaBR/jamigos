# Jamigos UI and UX review

Reviewed locally on November 9, 2026, using an isolated database and synthetic accounts.

The existing itch.io-inspired visual style is retained. The changes focus on making the
same controls behave consistently, keeping actions reachable on small screens, and
making failures understandable.

## Issues fixed

| Finding                                                                                             | Change                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Long bios, URLs and team names expanded grids beyond the viewport; the page shell hid the overflow. | Constrained grid columns and wrapped long content. Checked actual element bounds, not just page scroll width.                                                                                                      |
| Header controls were crowded on narrow screens.                                                     | Shortened the visible mobile navigation label, used an inbox icon, and gave badges their own space. Accessible names are retained.                                                                                 |
| Small buttons and chips were difficult to tap.                                                      | Increased touch targets to at least 44px for shared buttons and choices on touch devices. Long action labels can wrap; Discord copy buttons truncate their visible text.                                           |
| Account and theme menus lacked keyboard navigation and reliable focus handling.                     | Added arrow keys, Home/End, Escape, Tab, focus restoration and outside-pointer dismissal. Added a skip-to-content link.                                                                                            |
| Contact popups could extend beyond the screen.                                                      | Reused the native modal dialog, with viewport bounds, scrolling and focus restoration.                                                                                                                             |
| Clipboard denial produced an unhandled failure. Feedback could also be hidden behind a dialog.      | Added a shared copy helper with recovery feedback. Feedback now renders inside the active dialog.                                                                                                                  |
| Invalid profile fields were not identified programmatically or focused.                             | Associated errors with inputs, set `aria-invalid`, and focus the invalid field after submission.                                                                                                                   |
| UTC and saved timezone aliases could be missing from the picker.                                    | Included UTC and the current saved/detected timezone. Kept the offset on one line.                                                                                                                                 |
| Theme changes briefly mixed old and new colors while hover transitions ran.                         | Suppressed transitions during theme switches. Verified selected and unselected choices in dark mode. Respected reduced-motion preferences.                                                                         |
| Anonymous users could attempt to add a jam, then get an authentication error.                       | Showed the sign-in path before presenting the add form. Browse search also submits without JavaScript.                                                                                                             |
| An owner's own post or team could trigger a misleading “no matches” message.                        | Distinguished “only yours so far” from filtered results, added clear-filter links, and aligned recruitment labels.                                                                                                 |
| Multi-user mobile tests created desktop contexts.                                                   | Preserved project viewport and device settings in every helper-created context. Added an assertion for the actual viewport.                                                                                        |
| Reopening the team editor after a status-only save showed blank details.                            | Disabled the editor’s automatic reset, waited for refreshed data before closing, and rebuilt the form from saved values on opening. Added tests for status toggles, cancelled drafts, role-only saves and reloads. |

## Coverage

- Home, FAQ links, jam browsing and search, jam boards, onboarding, profile editing,
  public profiles, teams, inbox, contact dialogs, and the 404 page.
- Team creation and editing, joining by request, invitations, solo team-ups,
  acceptance notifications, ownership transfer, leaving, removal confirmation,
  and disband confirmation.
- Desktop and mobile Chromium, including 320px and 390px visual checks and desktop
  at 1280px; light and dark themes; keyboard use and search without JavaScript.
- Stress cases with a 500-character unbroken bio, long portfolio URL, 60-character
  unbroken team name, long Discord username, invalid form input, and denied clipboard access.
- Final visual walkthrough: no off-screen content or uncaught page errors in the checked screens.

## Validation

- 42 end-to-end tests, including 24 new UX, navigation and editing regression cases across desktop and mobile.
- 65 unit tests.
- Svelte and TypeScript checks, lint, and the Cloudflare production build.

## Follow-up additions

- My teams is linked from the signed-in homepage and account menu, with owned and joined teams grouped into current teams and past jams.
- The homepage shows ongoing jams, upcoming jams, recruiting teams and distinct people looking for teams directly below the header. Ended activity is excluded.
- The timezone-overlap filter explains its estimate on hover, keyboard focus and tap, without changing the checkbox.
- Jam boards default to All, with People and Teams filters, explicit card labels and icons, and one mixed grid using the same card widths in every view. Card actions align within each row. Only recruiting teams appear in discovery. Shared role filters survive category changes, while category-specific filters are cleared.

- Listing cards share grid spacing, padding, content spacing and bottom-aligned actions. My teams uses the same responsive columns as discovery; subgrid aligns jam labels, cards and timing within each row. Homepage examples also align across their row. Profile, team and form panels share responsive padding.
- Inbox team-up updates describe a past event rather than claiming current membership, so they remain accurate after a team is disbanded.

## Remaining verification

Sign-in tests use the local development shortcut. Real itch.io OAuth, live jam imports
and adding a previously unknown jam were not exercised against itch.io. Production
infrastructure, Safari/Firefox, physical devices and screen readers still need separate
verification. This is not a complete accessibility conformance audit or user research study.
