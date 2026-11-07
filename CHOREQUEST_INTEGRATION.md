# ChoreQuest connection contract

Sudoku Quest uses the same integration direction as the other Hero Academy games: ChoreQuest is the parent-controlled identity and family dashboard; games remain playable without sign-in.

## Implemented foundation

- Each learner has a local-only `heroLocalId` and saved progress.
- Each completed puzzle appends a unique `eventId` activity summary to `pendingActivity` in local storage. The queue is capped at 200 records.
- Summary includes game, puzzle ID, grid size, first/repeat completion, play duration, hint count, attempt count and non-redeemable Hero XP.
- The queue excludes names, exact answers and individual moves.
- Backups preserve the pending queue.

## Required before enabling live connection

1. Agree a **stable production origin** for Sudoku Quest, such as `sudoku.heroacademy.app`, and register it against ChoreQuest's allowed return origins.
2. Use ChoreQuest's documented parent-approved child connection flow. Do not send a session token through a URL fragment or query string, and do not collect child email addresses. Use short-lived one-use authorization codes, `state`, PKCE where applicable, and an authenticated server-side exchange.
3. Add a same-origin server adapter (or a supported backend-for-frontend) that binds the ChoreQuest child identity to a local profile and keeps credentials out of browser local storage. The static app must not embed a client secret or privileged API token.
4. Reconcile activity using server-enforced child permissions, dedupe by `(game, eventId)`, and accept only permitted summary types. Once acknowledged, remove just those events from `pendingActivity`.
5. Map the queued `heroXpEarned` to **Hero XP only**, never ChoreQuest chore points, money, or reward balances.
6. Provide parent-visible revoke/disconnect controls, cloud save conflict resolution, offline retry, rate limiting and data retention consistent with the existing ChoreQuest service.
7. Add tests for expired codes, unauthorized origins, revoked family access, replayed events, retries, duplicate submissions and offline conflict resolution.

No ChoreQuest synchronization is active in this private Site preview; the UI explains this plainly. Do not label activity as synchronized until backend verification succeeds.
