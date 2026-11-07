# Approved Hero Academy integration

## Shared family connection (7 November 2026)

Sign in at https://heroacademy.app/play/ with the existing ChoreQuest account. A parent grants each child access, then Play exchanges a single-use launch fragment for an origin/game/child-scoped capability. The vendored Academy SDK handles cloud revisions, explicit local/cloud conflict choices, disconnection, offline retries and minimal foreground usage summaries. Siblings and local backups remain local; only the selected learner is synced. Existing completed milestones are not back-credited. New stable zero-based milestones earn server-configured non-financial Hero XP once. Local game stars and the chore/money ledger remain separate. No parent cookies or credentials enter the game.

Canonical origin: https://sudoku.heroacademy.app. Game id: sudokuquest. Stable levels follow the existing 36-level order and map to milestones 0–35. First puzzle completion earns 20 shared XP; repeat local stars never earn duplicate shared XP. Legacy pendingActivity remains in device backups only and is never uploaded/back-credited.
