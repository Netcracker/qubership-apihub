# PR board requirements

The board lists the open pull requests of one or more GitHub repositories and shows what blocks each one: CI,
review, merge conflicts, and the team's own rules. It is a static page on GitHub Pages with official Netcracker
repository groups. Each viewer loads data with a personal token, which stays in their browser.

These files are the spec. A change in behavior updates the matching requirement in the same change.

## Users and goals

- **Team lead at a daily or planning meeting:** sees every open PR, finds the stuck and problematic ones, and
  checks that PRs follow the team rules. At the standup, keeps a note for each PR of what was asked and what was
  promised, and reads it the next day (**NOTE-1**).
- **Developer:** finds their own PRs and sees what blocks them, and can keep the same notes for them.

## Scope

- One or more repositories, up to 40 at a time, chosen by a link (**FILTER-14**), in Settings (**SET-16**), or
  through repository groups (**SET-19**, **FILTER-17**). Open pull requests only, drafts included.
- Read-only: the board never changes anything on GitHub.
- Out of scope: closed or merged PRs, history and charts, GitHub OAuth login (it would need a server).

## Files

| File | Id prefix | Covers |
| --- | --- | --- |
| [data.md](data.md) | `DATA` | Configuration, the snapshot, Refresh, collected fields, and data errors |
| [rules.md](rules.md) | `RULE` | CI, review, and conflict states; attention rules; bots; areas |
| [table.md](table.md) | `TABLE` | Header, columns, cells, sorting, empty and error states, layout, legend |
| [panels.md](panels.md) | `PANEL` | Popovers and the comments panel |
| [filters.md](filters.md) | `FILTER` | Quick filters, toolbar, search, and the view in the URL |
| [settings.md](settings.md) | `SET` | The settings panel and where settings are stored |
| [notes.md](notes.md) | `NOTE` | A Markdown note per PR, kept in this browser |
| [security.md](security.md) | `SEC` | Token handling, untrusted content, CI permissions, and dependencies |
| [quality.md](quality.md) | `QUAL` | Accessibility, browsers, size, themes, and responsiveness |
| [engineering.md](engineering.md) | — | Stack, commands, structure, style, testing, boundaries, success criteria |

## Conventions

- Each requirement starts with a bold id, such as **TABLE-4**. Ids never change and are never reused; a removed
  requirement keeps its id with the word *Removed*.
- *Planned* marks a requirement that is agreed but not built yet. Everything else describes the board as it works now.
- Tests name the ids they cover at the start of their title, such as `test('PANEL-11 SEC-1: ...')`.
  `pnpm run test:requirements` fails when a requirement has no test or a test names an unknown id.
- *Manual check* marks a requirement that no automated test can check, with what to check by hand.
- Examples use the fictional repositories `acme/widgets` and `acme/gadgets` and fictional people such as
  `anna-dev` and `boris-k`.

## Known limitations

- Team review requests need read access to the organization. With a token that lacks it they may come back empty,
  and the board then shows no pending team.
- Images in comments load from wherever their authors host them, so opening the comments panel lets those hosts
  see the viewer's address. GitHub itself proxies such images; the board does not.
- Without a token the comments panel shares GitHub's limit of 60 REST requests an hour per address.
- Repository groups travel in the address (**FILTER-14**), so many large groups make a long link: 20 groups of 40
  repositories come to about 25 KB.
- Project sites of one owner share the `<owner>.github.io` origin, so another Pages site of the same owner can read
  the token this board keeps in `localStorage`. The token only has public read access; a custom domain removes the
  shared origin.

## Maintenance notes

- The title rule copies the defaults of `amannn/action-semantic-pull-request`. If the repository configures its own
  `types` or `subjectPattern`, the allowed types in the code must follow (**RULE-6**).
- The default BE and FE lists follow the monorepo directories and need updating when modules are added
  (**RULE-11**). Viewers can extend them in Settings meanwhile.
- Aggregate CI jobs that fail whenever another job fails are listed last in the checks popover. Only `ci-ok` is
  known today (**PANEL-4**); add others when they appear.
