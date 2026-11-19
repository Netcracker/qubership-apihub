---
name: api-doc-viewer-baseline-comparison
description: Compare the screenshot baselines of the current api-doc-viewer branch with develop (or another base branch) in a reg-cli report with Diff, Slide, 2up, Blend, and Toggle views, even when the branch moved, renamed, or added baselines. Use when the user asks to compare screenshots or snapshots with develop, to review which baselines changed visually, or runs /api-doc-viewer-baseline-comparison.
---

# Comparing screenshot baselines with develop

**CI linters:** load the `api-doc-viewer-ci-linters` skill before you write or change a file of this module.

One command builds the comparison. Run it from `frontend/api-doc-viewer/packages/api-doc-viewer`:

```bash
pnpm run compare-screenshot-baselines
pnpm run compare-screenshot-baselines -- --base main --no-fetch --no-serve --port 9124
```

| Option | Effect |
| --- | --- |
| `--base <branch>` | Base branch, `develop` by default. The script uses `origin/<branch>` when it exists, else the local branch. |
| `--no-fetch` | Skips `git fetch origin <branch>`. The fetch never moves the local branch. |
| `--no-serve` | Writes the report and exits. |
| `--port <number>` | Port of the local report server, `9123` by default. |

The script is `bin/compare-screenshot-baselines.mjs`. It needs no build, no Storybook, and no container: it compares
committed and working-tree PNG files only. reg-cli runs through `pnpm dlx` at a pinned version, so the first run needs
network access.

## What it does

1. **Lists the baselines.** Branch side: every `src/it/**/__image_snapshots__/*.png` of the working tree, so baselines
   regenerated and not yet committed are included. Base side: the same files in the base branch commit.
   `__diff_output__/` and `__received_output__/` are skipped.
2. **Maps base baselines to branch baselines.** Rules apply in this order, and a rule links two files only when each is
   the only match of the other:

   | Rule | Matches | Typical cause |
   | --- | --- | --- |
   | `same-path` | the same path under `src/it/` | nothing moved |
   | `same-filename` | the same filename in another folder | the test run folder changed |
   | `prefixed-filename` | a base filename `<prefix>-<branch filename>` | the IT moved from `src/it/` into a test-run folder, and its snapshot identifier lost the folder prefix |
   | `same-content` | byte-identical images | a rename with nothing else in common |

   A base baseline that no rule maps is reported as deleted; the console lists each one. A branch baseline that
   nothing maps to is reported as new.
3. **Writes flat folders.** Both sides get the branch filename, prefixed by the test-run path
   (`openapi-suite__<name>.png`, `compatibility-suite__<run>__<name>.png`), so reg-cli pairs them. A deleted baseline
   is written as `<base>-only__<name>.png`.
4. **Runs reg-cli** (`-I`, matching threshold `0`, so every changed pixel counts) and names the branches next to the
   report's "Before" and "After" labels, in the page title, and in a legend.
5. **Serves the report** on `127.0.0.1` and opens it in the browser. The server serves all of `.baseline-comparison/`
   and keeps running until Ctrl+C. When an earlier run's server still answers on the port, the script only opens the
   new report.

## Output

Each run writes a new folder; earlier runs are kept:

```text
packages/api-doc-viewer/.baseline-comparison/      (gitignored)
  <branch><n>/                                      for example feature-openapi-rework3
    <branch>/        flat branch baselines ("After", actual)
    <base>/          flat base baselines ("Before", expected)
    diff/            reg-cli diff images
    report.html      the report: http://127.0.0.1:9123/<branch><n>/report.html
    reg.json         reg-cli result: failedItems (changed), newItems, deletedItems, passedItems
    mapping.tsv      rule, report filename, branch path, base path, and whether the images are identical
```

The branch name in folder names has `/` and other unsafe characters replaced with `-`. Delete old run folders by hand
when they are no longer needed.

## Reading the report

- **Changed:** a mapped pair whose pixels differ. **New:** branch only. **Deleted:** base only. **Passed:** identical.
- "Before" is the base branch (left in 2up); "After" is the working tree of the current branch (right in 2up).
- Views: Diff (changed pixels highlighted), Slide, 2up, Blend (onion skin), Toggle.
- reg-cli counts any changed pixel, unlike the screenshot ITs (`threshold: 0.1`, `failureThreshold: 20`). A pale diff
  background change that the ITs miss shows up here (`api-doc-viewer-testing` → Pixel-diff blind spot).

## When a result looks wrong

- **A pair compares two different stories.** A rule linked the wrong files, most likely `same-filename` or
  `same-content`. Find the pair in `mapping.tsv` and compare the story ids in the two paths before reading the image
  difference as a regression. A fixture change that came with a moved story also shows up as a changed image.
- **A base baseline is reported as deleted although the case still exists.** Its new snapshot name has nothing in
  common with the old one (a story renamed or folded into another suite). Find the counterpart by the case name and
  compare the two images by hand; the script does not guess.
- **Images load forever when the report is opened from disk.** On Windows, Chrome cannot open a `file://` path longer
  than 260 characters, and the flat filenames are long. Open the report through the server.
- **`reg-cli exited with …`.** The `pnpm dlx` download failed (network) or reg-cli crashed; the script prints its
  output.
- **The report server did not start.** Another process holds the port; pass `--port`.

## Reporting to the user

After a run, give the user the report URL and the summary line: changed, new, deleted, and passed counts, the mapping
counts per rule, and every deleted baseline. When asked to analyze changes, read `reg.json` (`failedItems`) and
`mapping.tsv`, group the changed files by test run, and look at the images before naming a cause.
