# Performance

How fast the board is with many pull requests (QUAL-8), how to measure it, and what was tried. Read the ledger before
trying an optimization, so an idea that did not pay off is not tried again.

## How to measure

1. Build the page: `pnpm exec vite build`.
2. Start the mock dev server with a pinned clock (`PR_BOARD_MOCK_NOW=2026-10-28T12:00:00Z pnpm exec vite --port 5175`),
   choose the 300-PR scenario (`curl -X POST -d '{"report":"many"}' http://localhost:5175/__dev/state`), and save its
   snapshot next to the build: `curl http://localhost:5175/prs.json -o dist/prs.json`.
3. Serve the build: `pnpm exec vite preview --port 4175`.
4. Run `node scripts/measure.ts 8`. It prints medians of 8 runs: the load until the rows show, and the longest event
   of a keystroke in the search, a sort click, and a Drafts click, which is what Interaction to Next Paint reports.

Do not install Playwright's fake clock while measuring: it holds React's scheduled work back and makes deferred
renders look free.

## Baseline, October 30, 2026

300 open PRs, production build, Chromium, 1920 × 1080, median of 8 runs:

| Measure | Median | Notes |
| --- | --- | --- |
| Load until 300 rows show | about 900 ms | about 450 ms of it in long tasks |
| Keystroke in the search | about 100 ms | good (INP ≤ 200 ms) |
| Sort click | about 240 ms | needs improvement (INP > 200 ms) |
| Drafts click | about 70 ms | good |
| Minute tick | no long task | |
| JavaScript | 131 KB gzip | React is most of it |
| CSS | 8 KB gzip | |

A CPU profile shows that scripts take little of this. The browser's own layout of a table with about 13,000
elements does: a sort click spends about 140 ms in Layout, 50 ms in pre-paint, and 45 ms in style.

## Ledger

| Idea | Baseline → result | Verdict | Why |
| --- | --- | --- | --- |
| `position: static` on body cells | sort 240 → 240 ms | reverted | Inside the noise. |
| `contain: strict` on the table's scroll box | sort 240 → 240 ms | reverted | Inside the noise. |
| `content-visibility: auto` on cell contents | sort 240 → 248 ms | reverted | Table cells cannot skip layout; no gain. |
| `table-layout: auto` | layout 140 → 123 ms in one 3-run trace | not kept | Inside the noise, and it changes column widths. |
| `useDeferredValue` for sort, filters, and tiles | sort 240 → 248 ms, Drafts 72 → 56 ms | reverted | No gain on sort; Drafts inside the noise. An earlier run with the fake clock showed 32 ms, which was the clock, not the change. |
| `useDeferredValue` for the search too | keystroke 96 → 64 ms, rows filtered 34 → 108 ms | reverted | The input felt faster, but the rows came three times later. |
| Lazy chunks for the wizard, Settings, and the token dialog | JS 131 → 127 KB gzip; load 808 → 815 ms | reverted | 4 KB and no change in load. |

## What would help

The cost is the size of the table, not the code. Two changes would move the sort click under 200 ms at 300 PRs; both
are large, so they wait for a board that big:

- Render only the rows in view (virtualization). The browser lays out about 30 rows instead of 300. Find in page and
  the browser tests that count rows need a different approach.
- Lay the table out with CSS grid instead of `<table>`, so each row can use `content-visibility: auto` and rows out of
  view skip layout. Every table style and many tests change.
