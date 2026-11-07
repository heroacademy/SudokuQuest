# Hero Academy Sudoku Quest

A static, installable, offline-capable game that teaches children Sudoku in small, reassuring steps. Uses the Hero Academy colour palette, Pip, local child profiles, optional British English speech, touch and keyboard controls.

Repository: https://github.com/heroacademy/SudokuQuest

Intended public URL: https://sudoku.heroacademy.app

## Learning path

| World | Grid | Levels | Teaching focus |
| --- | --- | ---: | --- |
| First Spark | 1×1 | 1 | Put one number in one square |
| Little Brook | 2×2 | 4 | Unique numbers across rows and down columns (Latin square precursor) |
| Meadow Maze | 4×4 | 8 | First true Sudoku: rows, columns and 2×2 boxes |
| Whispering Woods | 4×4 | 6 | Harder logic and pencil notes |
| Cloudtop Ridge | 6×6 | 8 | Rows, columns and 2×3 boxes |
| Starfall Castle | 9×9 | 9 | Classic Sudoku with 3×3 boxes |

All 36 puzzles have one solution, checked by the backtracking solver at generation time. Puzzle choices and saved progress persist in local storage. Multiple in-progress levels can be resumed. There are no third-party APIs, ads, leaderboards, paid credits or child emails.

## Test and run

```bash
node --test tests/sudoku.test.mjs
```

Serve `dist/` with any static web host (GitHub Pages or Cloudflare Pages work). Avoid opening `index.html` from `file://` because ES modules and service workers require HTTP(S).

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` checks the Sudoku puzzle rules with Node.js and publishes `dist/` on every push to `main`. It can also be run manually from Actions.

1. In **Settings → Pages**, choose **GitHub Actions** as the build/deployment source.
2. Ensure the `sudoku.heroacademy.app` hostname is configured as the custom domain in GitHub Pages. `dist/CNAME` is provided in source control.
3. Point Cloudflare DNS at GitHub Pages according to GitHub's current custom-domain instructions and wait for GitHub to issue the HTTPS certificate. Do not enable a Cloudflare proxy before the GitHub certificate and custom domain are functioning correctly.
4. Check the **Deploy Sudoku Quest** action and visit `https://sudoku.heroacademy.app` over HTTPS.

The published files do not need a runtime build step, external API key, or framework server.

## Parent-controlled ChoreQuest integration

See [CHOREQUEST_INTEGRATION.md](./CHOREQUEST_INTEGRATION.md). Game events are queued locally but not sent or represented as synced until an authenticated API, approved origin and child-to-hero connection are configured. The current private preview cannot complete the cross-origin family sign-in.

## Accessibility and privacy

- Large touch targets, keyboard arrows, numbers, Backspace, `N` for notes and `H` for hints.
- Optional speech using the browser's local en-GB voices; accent and voice gender depend on installed system voices.
- Respect reduced motion preference; larger text option.
- Gentle, non-punitive feedback and optional hints that never deduct XP.
- Per-device local progress, backup export/import, no analytics, no behavioural ads.
