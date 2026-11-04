# APIHub PR board

The contributor board for Netcracker APIHUB repositories, served at
[the official PR board](https://netcracker.github.io/qubership-apihub/pr-board/). It shows CI, reviews, conflicts,
and attention rules. Each viewer loads live data with a personal GitHub token.

Imported from [apihub-pr-board](https://github.com/makeev-pavel/apihub-pr-board) at commit
`ebe8936c9eadbbababb6f7cb9aa5f5c3574502c4`. This private workspace package is the Nx project `pr-board`;
it belongs to no product release group.

## Official defaults

Open the short URL without parameters. The board selects humans, non-draft PRs, and Monorepo & Co.
The repository groups live in `src/defaults.ts`:

- Monorepo & Co: `qubership-apihub`, `qubership-apihub-ci`, `qubership-apihub-vscode`, and
  `qubership-apihub-aux-tools`, all under Netcracker.
- Old polyrepos: the former backend, UI, Postman, linter, agents-backend, and library repositories.
- Archived: sniffer-agent and traffic-analyzer.

The Authors menu combines Humans, NetcrackerCLPLCI, Dependabot, and Other bots. Individual logins remain selectable.
Choose **Me** after loading live data to show PRs you opened. Shared `authors=me` links resolve to each viewer's own
account; the shortcut is disabled until a personal token identifies the viewer.

Settings → Filter settings configures UI and BE independently: labels, title scopes, bracketed tags, directory
mentions in PR or linked issue titles, and exact repository names. Separate values with commas; empty lists disable
a criterion. Any matching criterion selects the area; a PR can match both. This does not read changed files.

Customized criteria travel in `criteria` as URL-encoded JSON containing deviations from official defaults. A shared
configuration is reconstructed against official defaults, overriding saved criteria without replacing them.
`repogroups`, `bots`, and author/view selections remain shareable. Appearance and attention preferences stay in
this browser. Reset filters restores detection defaults; Reset to defaults also restores the official groups.
Neither action removes the personal token or notes.

The requirements are in [docs/requirements/](docs/requirements/README.md).

## Build configuration

Official defaults work without environment variables. For another team or a local build, set:

| Variable | Format | When absent |
| --- | --- | --- |
| `PR_BOARD_GROUPS` | One `Name: owner/repo` group per line; prefix default groups with `*` | Official Netcracker groups |
| `PR_BOARD_BOTS` | Extra service-account logins separated by commas or spaces, up to 50 | No extra bots |
| `PR_BOARD_REPO` | Repository list used when no group or URL selection supplies repositories | No fallback repositories |

Empty group and bot variables deliberately clear their defaults. Invalid values fail before Vite builds the page.
Nx includes the variables in the build cache key. Mock development ignores group and bot variables and stays fictional.

For Bash, run from the repository root:

```bash
PR_BOARD_GROUPS='*Core: acme/widgets' PR_BOARD_BOTS='ci-bot' pnpm exec nx run pr-board:build
```

For PowerShell:

```powershell
$env:PR_BOARD_GROUPS = '*Core: acme/widgets'
$env:PR_BOARD_BOTS = 'ci-bot'
pnpm exec nx run pr-board:build
Remove-Item Env:PR_BOARD_GROUPS, Env:PR_BOARD_BOTS
```

Use `pr-board:dev:live` with the same variables to try a team configuration locally. These variables hold public
configuration, not credentials. Viewers enter personal tokens in the browser.

Saved groups take precedence over build defaults, including a saved empty list. Shared links take precedence over
saved groups and criteria without replacing them. Reset to defaults saves the active build's groups and restores
its extra bots, even when a shared link already displays those defaults. The URL preserves explicit empty overrides
such as `bots=` and `repogroups=`; it omits values matching the active defaults.

## A tour of the board

Nine steps, from the first look to a board set up your way. The pictures are the screenshot test baselines, taken on
fictional data, so they always match the interface.

### 1. Every open PR on one screen

Each row is a pull request with its CI, review, and conflict state as short codes, its linked issue, its age, and its
last comment. A stripe on the left repeats CI at a glance: red for failing, yellow for running, green for passing. The
board sorts the PRs that need attention to the top.

![The board: tiles, filters, and one row per pull request](e2e/__screenshots__/board-light-comfortable-win32.png)

### 2. Start with what needs attention

The tiles at the top count the PRs with failing CI, without approval, with merge conflicts, or that break a team rule;
click one to see only those. The ! icon on a row lists why that PR needs attention: an unconventional title, no
linked issue, or an age past the limit.

![Why a PR needs attention](e2e/__screenshots__/popover-attention-win32.png)

### 3. See why CI fails

Click **F** in the CI column for the checks that failed, each linked to its log, with the workflow and the kind of
failure. A summary job that fails because others did goes last, so the real cause comes first.

![The failed checks of a PR](e2e/__screenshots__/popover-checks-win32.png)

### 4. Know who still has to review

The Review code says approved, changes requested, or no approval, and ◷ counts the reviewers who have not answered.
Click it for who approved, who asked for changes, and who is still waiting. Prefer names to codes? The Review column
can list every reviewer with GitHub's icons, in the order you choose, with your own pending review highlighted.

| The reviewers of a PR | The Review column as a list |
| --- | --- |
| ![The reviewers popover](e2e/__screenshots__/popover-reviewers-win32.png) | ![The Review column as a list of reviewers](e2e/__screenshots__/board-reviewers-list-win32.png) |

### 5. Search the way GitHub does

Type plain words, or GitHub-style qualifiers such as `label:bug`, `author:anna-dev`, `ci:failing`, `review:requested`,
or `-is:draft`. The **?** button lists them all with examples you can click. The whole view, search included, lives in
the link, so you can send someone exactly what you see.

![The search syntax](e2e/__screenshots__/popover-search-win32.png)

### 6. Read the whole conversation

Click the last comment to open every comment and review of the PR in a panel on the right, rendered as GitHub
Markdown, with tables, task lists, and code.

![Every comment of a PR](e2e/__screenshots__/panel-comments-win32.png)

### 7. Keep notes for the standup

The ✎ after a title opens a Markdown note for that PR: what was asked at the standup and what was promised. Notes stay
in your browser, and `note:` searches them.

![A note for a PR](e2e/__screenshots__/panel-notes-win32.png)

### 8. Several repositories, grouped

One board can follow up to 40 repositories. Put them in groups in Settings, such as Backend and Frontend, check the
groups you want in the Repositories menu, and each repository name takes its group's tint. Only the checked groups
load, and the link carries the groups to whoever opens it.

![Two repositories with their names tinted by group, and the Repositories menu](e2e/__screenshots__/board-groups-light-win32.png)

### 9. Make it yours

On the first visit the board shows at once, with a small card that offers a short tour. The tour shows every choice
as a picture: light, dark, or system theme, row density, the Review column, the reviewers order, and labels. Settings
has the rest: attention rules, BE and FE areas, columns and their order, and how often live data loads again.

| The first visit | The tour |
| --- | --- |
| ![The board with the card that offers the tour](e2e/__screenshots__/state-first-visit-win32.png) | ![The tour's Reviewers order step](e2e/__screenshots__/wizard-reviewers-order-win32.png) |
| **The dark theme** | **Settings** |
| ![The board in the dark theme](e2e/__screenshots__/board-dark-comfortable-win32.png) | ![The settings panel](e2e/__screenshots__/panel-settings-win32.png) |

## How it works

- The monorepo Pages workflow builds and publishes the static page without PR data or a shared API credential.
- The page is React and TypeScript, bundled by Vite. It queries GitHub from the browser with the viewer's own
  fine-grained token, which stays in that browser and never goes into the link.
- With repositories in the link and a saved token, the board loads by itself when it opens. **Refresh** loads it
  again. Without a token, a dialog explains how to create one on GitHub and takes it.
- A live load shows what it reads, repository by repository, with a spinner and a clock, then how many pull requests
  it loaded and how long that took. Over a full table the status sits in a corner, so the rows stay in place.
- `src/github/` holds the query, normalization, and GitHub clients. Mock development serves fictional snapshots.

## Using the board

- **Search** takes plain words and GitHub-style qualifiers: `label:bug`, `label:"good first issue"`, `author:`,
  `assignee:`, `reviewer:` (reviewed or requested), `area:be|fe|other`, `ci:failing`, `review:approved`,
  `review:requested`, `is:draft|bot|conflict|stale|attention`, `no:issue|label|assignee|review`, `repo:`,
  `priority:`, `sprint:current`, `note:`. `label:`, `repo:`, and `priority:` match a whole name. A minus excludes:
  `-is:draft`.
  A linked issue number such as `885` finds its PR.
  The **?** button next to the field lists them. Click a label on a row to filter by it.
- **Area** (BE, FE, Other) comes from the labels and Conventional Commits scopes listed in Settings, `[BE]`/`[FE]`
  tags in the PR and issue titles, and `frontend` or `backend` directories in Dependabot titles.
- **Column widths** change by dragging the header edge, or with the arrow keys on a focused edge. They are saved
  in this browser; double-click an edge to reset that column. **Column order** changes with the arrows in Settings
  and travels in the link.
- **Setup wizard:** the first visit opens the board at once, with a small card that offers a short tour. The tour shows
  the theme, the row density, the Review column, the reviewers order, and labels as cards with a picture of the board in
  each look; every choice applies at once. **Setup wizard** in Settings opens it again.
- **Settings** (the gear next to Refresh): repositories and repository groups, attention rules, BE/FE lists, extra bots,
  theme, density, labels, the Review column as a code or as GitHub's list of reviewers, the order of the reviewer groups
  in that list, the columns and their order, how often live data loads again, and the GitHub token. The page address
  carries the repositories, extra bots, hidden columns, column order, and groups, so a copied link or a bookmark carries
  them; the rest is saved in this browser.
- **Repository groups:** define groups in Settings, one per line (`Backend: owner/a, owner/b`), with a leading `*`
  for a group checked when the board opens. The Repositories menu then shows the rows of the checked groups, and
  Ungrouped those of the repositories in no group. Without repositories in the link, only the checked groups load.
  Each group has its own tint on the repository names. The link carries the groups, without replacing the ones saved
  in a viewer's browser.
- **Several repositories:** with more than one, a Repository column comes first. A link such as
  `?repos=owner/a,owner/b` shows just those.
- **Notes:** the ✎ icon after a PR title opens a Markdown note for that PR, with Preview and Edit, such as what was
  asked at the standup and what was promised. It shows on hover, and always once the PR has a note. Notes stay in this
  browser; `note:` searches them.
- Click the last comment to open every comment of the PR in a panel on the right, rendered as GitHub Markdown.
  Without a token, GitHub allows 60 such loads an hour.
- The dot next to the tiles shows where the data comes from (gray for a `prs.json` snapshot, green for live data)
  and how old it is. Click it for the exact time and the workflow run.
- Click **F** in the CI column to see which checks failed, with links to their logs.
- Click the Review code to see who approved or requested changes and whose review is still pending.
  A small number on the code counts the reviewers behind that decision, for example ✓2 for two approvals.
  A gray ◷ counter next to it shows how many requested reviewers have not answered yet.
- **Your reviews:** with live data, click the Review requested tile to see every PR that waits for your review. As on
  GitHub, the Review column marks them with an orange dot, or with circular arrows when you are asked again after an
  earlier review. `review:requested` and `review:again` search them.
- The table always fills the window: spare width goes to the Pull request and Last comment columns.

## Local development

Use the monorepo Node.js and pnpm versions. Run these commands from the repository root:

```sh
pnpm install
pnpm exec nx run pr-board:dev:live  # real GitHub data at http://localhost:5173; enter a personal token
pnpm exec nx run pr-board:dev       # fictional data and the DEV scenario panel
pnpm exec nx run pr-board:build     # static page in sites/pr-board/dist; no token needed
pnpm exec nx run pr-board:test      # types, unit coverage, and requirement checks
pnpm exec nx run pr-board:test:e2e   # Chromium browser tests
```

For Windows screenshots, run `pnpm --filter @netcracker/qubership-apihub-pr-board run test:screenshots`.
For Linux browser and screenshot tests, run
`pnpm --filter @netcracker/qubership-apihub-pr-board run test:linux`.
This uses Podman on Windows or Docker on Linux; set `PR_BOARD_CONTAINER_ENGINE` to choose the other engine.
The runner uses the pinned Playwright Ubuntu image and the workspace lockfile, with dependencies in a temporary copy.
It keeps the host's dependencies intact and saves failure reports in `.logs/linux/`.
CI runs browser tests on Linux and compares screenshots in this same container when the board is affected.

After an intended visual change, run `test:screenshots:update` on Windows and
`test:linux --project=screenshots --update-snapshots` for Linux. Inspect both sets of changed images.

Mock mode injects a **DEV** panel in the bottom-right corner. Live mode shows the board without this overlay.
Use the panel to switch scenarios:

- **prs.json on page load:** typical board plus corner cases, two repositories, empty board, 300 PRs, project data
  unavailable, stale snapshot, slow load, missing file, invalid JSON, JSON without a PR list.
- **Live loads:** success, pagination, partial GraphQL errors, project fields refused on a later page, fewer PRs than
  `totalCount`, slow response, pages one by one, 401, 502, repository not found, network failure. Any token works in
  mock mode.

All mock data is fictional. `dev/fixtures/typical.ts` generates an ordinary board with a fixed seed, and
`dev/fixtures/cases/` holds the corner cases, one file per topic. `dev/fixtures/gadgets.ts` is a second repository,
`acme/gadgets`, whose PR numbers repeat those of `acme/widgets`. All are raw GraphQL nodes, so they go through the
same normalization as real data.

To work against real data, use `pr-board:dev:live`. The official groups are preconfigured. Enter your personal
token in Settings; it identifies you for review highlighting. Tokens stay in this browser and are sent to GitHub.

## Deployment

The existing [Pages workflow](../../.github/workflows/pages.yml) publishes `dist/` under
`/qubership-apihub/pr-board/`, using the common `develop`/`SITE_REF` policy. It shares one assembled artifact with
the landing, docs, Storybooks, and ERDs. CI runs type, coverage, requirement, and Chromium checks when affected.
There is no data-collection workflow or scheduled snapshot. The personal token is never part of a build or a URL.
