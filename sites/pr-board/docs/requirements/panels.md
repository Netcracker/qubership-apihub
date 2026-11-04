# Popovers and panels

## Popovers

- **PANEL-1** A popover opens on click and closes on a second click, a click outside it, Escape, scrolling the page
  outside it, or resizing the window. It stays inside the window: near the bottom edge it opens upward, near the right
  edge it opens leftward, it is never wider than the window, and when it is taller than the room on its side it scrolls.
  Only the comments panel works differently (**PANEL-9**).
- **PANEL-2** Attention: the list of reasons (**RULE-5**).
- **PANEL-3** Failed checks (CI **F**): each failed check with its name linked to its log, its workflow, the failure
  kind when it is not a plain failure (timed out, did not start, action required, error), and the description of an
  external status such as a quality gate. The same check reported several times shows once with **×N**.
- **PANEL-4** Aggregate jobs that fail whenever another job fails (`ci-ok`) are marked "summary job" and listed
  last, so the real cause comes first.
- **PANEL-5** The checks popover says when check details were not collected, when CI fails but no failed check is
  among the checks read, and when only the first 100 of more checks were read. It links to all checks on GitHub.
- **PANEL-6** Review: sections Approved by, Changes requested by, Dismissed reviews, and Waiting for review from,
  each person with an avatar and the time of the review; teams show as `@team` with a `team` chip. Without reviews
  or requests it says so. It links to the PR.
- **PANEL-7** Rules (in the legend): the attention rules in use (**RULE-6** to **RULE-8**) and how the states are
  read (**RULE-1** to **RULE-3**). With custom rules it also gives the team defaults.
- **PANEL-8** Data source (in the header): whether the data is a snapshot or live, how old it is, the exact time,
  and the workflow run link when there is one. For live data it says how often the board loads again, or that automatic
  loads are off (**DATA-24**, **SET-22**).

## Comments panel

- **PANEL-9** Clicking the Last comment cell opens a panel along the right edge of the window, full height and 800
  px wide (the window width less its margins when the window is narrower), with its own scroll, the PR number in its
  title, and a close button. It closes like a popover except that scrolling inside
  it does not close it.
- **PANEL-10** The panel shows the two comments from the data at once, then loads every issue comment and review
  summary of the PR from the GitHub REST API and shows them all, newest first and not cut. Its title then gives the
  number of comments.
- **PANEL-11** The panel loads with the viewer's token when there is one. When the load fails, it keeps the two
  comments, says why, and for a used-up anonymous limit says to add a token in Settings.
- **PANEL-12** Each PR's list loads once per page load, and again after the PR changes; the list on screen stays while
  the new one loads, so the viewer keeps their place.
- **PANEL-13** Each comment shows its author, its time, and a link to it on GitHub. A comment cut in the data says
  so and points to GitHub.
- **PANEL-14** Comments render as GitHub Markdown: GFM tables, task lists, code, quotes, images, kept single line
  breaks, and inline HTML such as `<details>`, sanitized (**SEC-4**). Links open in a new tab.
- **PANEL-15** A link at the bottom opens the PR conversation on GitHub. When a list is longer than the board loads
  (500 entries), the panel says so.
