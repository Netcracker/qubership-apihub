# Filters, search, and the view

## Quick filters

- **FILTER-1** Tiles in the header: Open PRs, CI failing, Without approval, Merge conflicts, Need attention. Each shows
  how many PRs of the current view (repository groups, authors, draft status, area, priority, and search) match it.
- **FILTER-18** With a known viewer, a Review requested tile counts the PRs waiting for the viewer's review
  (**RULE-12**) and adds how many of them are re-requested, such as "5 Review requested · 2 again". The `review:`
  qualifier also takes `requested` and `again`. Until the viewer is known, a link with this filter (`quick=mine`)
  shows every PR and keeps the filter in the address for when the data is live.
- **FILTER-2** Clicking a tile turns its filter on or off; active tiles combine with AND. Open PRs turns them all
  off. A tile with no matching PRs is dimmed.

## Toolbar

- **FILTER-3** Authors lists individuals with avatars and counts, plus the presets Me, People (the default), Bots,
  Everyone, and Clear. The combinable Humans, NetcrackerCLPLCI, Dependabot, and Other bots categories travel as
  `authorgroups` and include future authors after refresh. Me selects PRs opened by the current token owner and is
  disabled until live data identifies that viewer. It travels as `authors=me`, so a recipient sees their own PRs.
  A Me link selects no authors while identity is unknown or when the viewer has no PRs. The button names the choice:
  Me, People, Bots, Everyone, Nobody, the selected categories, one login, or "N selected".
- **FILTER-4** The author list follows the data: a Refresh adds new authors and drops gone ones. A chosen author
  without open PRs leaves the count but stays in the URL, so the choice returns when they open a PR. Choosing every
  person or every bot by hand switches to the matching preset.
- **FILTER-5** Draft status: All, Ready for review (the default), Drafts.
- **FILTER-6** Area: All, BE, UI, Other (**RULE-11**). A PR in both areas shows under BE and under UI.
- **FILTER-16** Priority, shown when a linked issue has one: a menu of the priorities of the linked issues
  (**DATA-25**), each with its number of PRs, and No priority. Checked values show the PRs with an issue of one of
  them, or without any for No priority; nothing checked shows all. The choice lives in the address
  (`priority=High,Medium`).
- **FILTER-17** Repositories, shown when Settings has repository groups (**SET-19**): a menu with a checkbox per group,
  each with its number of open PRs, and **Ungrouped** for the repositories of the data that are in no group. It shows
  only the rows of the repositories in a checked group, or in no group while Ungrouped is checked; a repository in two
  groups shows when either is checked. Without `repos`, only the checked groups load (**DATA-18**), and a group none of
  whose repositories is loaded shows no count. The other menus and the tiles count only the rows the groups let through.
  **All** checks every entry, and **None** checks none, which shows no rows. Without a choice the groups marked as
  default are checked, or every entry when none is marked. A different choice lives in the address
  (`groups=Backend,Ungrouped`; an empty `groups=` checks none); names match without regard to case, unknown ones are
  dropped, and a link that names only unknown groups gets the default. The button reads All, None, up to two names, or
  "N selected".
- **FILTER-7** **Reset view** shows when the view differs from the default and restores it. **Copy link to this view**
  copies the page address, says "Link copied", and asks to copy the address bar when the clipboard is blocked; a screen
  reader hears the outcome, and the button goes back to its label after a moment.

## Search

- **FILTER-8** Plain words match the number, repository, title, people, labels, target branch, the CI, review, conflict,
  and draft states and the areas as words (`failing`, `changes requested`, `conflicts`, `draft`, `be`), linked issues
  (title, number such as `885` or `#885`, type, labels, priority, and sprint), projects, failed check names and
  workflows, both comments, and the attention reasons, without regard to case. Every word must match; a leading minus
  excludes; quotes keep spaces.
- **FILTER-9** Qualifiers narrow the list and also take a leading minus:

  | Qualifier | Example |
  | --- | --- |
  | `author:` | `author:anna-dev` |
  | `assignee:` | `assignee:boris-k`, `assignee:none` |
  | `reviewer:` | `reviewer:chen-li` (reviewed or requested) |
  | `label:` | `label:bug`, `label:"good first issue"`, `label:none` |
  | `base:` | `base:develop` |
  | `area:` | `area:be`, `area:fe`, `area:other` |
  | `ci:` | `ci:failing`, `ci:running`, `ci:passing`, `ci:none` |
  | `review:` | `review:approved`, `review:changes`, `review:none`, `review:requested`, `review:again` (**FILTER-18**) |
  | `is:` | `is:draft`, `is:ready`, `is:bot`, `is:conflict`, `is:stale`, `is:attention` |
  | `no:` | `no:issue`, `no:label`, `no:assignee`, `no:review` |
  | `note:` | `note:tests`: your notes (**NOTE-7**) |
  | `priority:` | `priority:high`, `priority:none` (**TABLE-28**) |
  | `sprint:` | `sprint:current`, `sprint:42`, `sprint:none` (**TABLE-28**) |

- **FILTER-19** `label:`, `repo:`, and `priority:` match a whole name, without regard to case, as GitHub does, so
  `label:bug` does not match `debug`. `sprint:` matches a whole word of the sprint title or the whole title, so
  `sprint:42` finds "Sprint 42" but not "Sprint 142". People qualifiers match part of a login.
- **FILTER-10** A qualifier still being typed, such as `label:`, filters nothing yet. An unknown qualifier is a
  plain word.
- **FILTER-11** Clicking a label chip adds `label:<name>` to the search, quoted when the name has spaces. Clicking it
  again removes every positive filter for that label, whatever its case or quoting, and leaves other words alone.
  Chips of labels in the search are highlighted.
- **FILTER-12** The **?** button next to the search lists the syntax and offers examples that fill the search when
  clicked.

## View in the URL

- **FILTER-13** Search, authors, draft status, area, priority, repository groups, quick filters, and sort live in the
  URL query (`q`, `authors`, `draft`, `area`, `priority`, `groups`, `quick`, `sort`, `dir`). Defaults are left out, so
  the default view has a clean address. Opening a link restores the view; unknown values fall back to the defaults, and
  a value given twice counts once. Logins match without regard to case. A choice of one login spelled like a preset,
  such as a person called `bots`, keeps a trailing comma (`authors=bots,`), so it reads back as that person.
- **FILTER-14** The address carries `repos`, `bots`, custom `repogroups`, and customized area `criteria`.
  Active build defaults are omitted for groups and bots; explicit empty overrides are preserved. `criteria` is
  URL-encoded JSON of per-area overrides; it is reconstructed
  against official defaults, independent of the recipient's stored criteria. Empty lists disable signals.
  A shared configuration does not replace saved criteria or groups unless the viewer edits them.
  An empty `repogroups=` explicitly clears groups. Legacy `hide` and `cols` links still apply and save their
  settings, but new URLs omit appearance settings. Malformed values are validated before use.
  Repositories must use `owner/name` (up to 40), bots must be valid GitHub logins (up to 50), and criteria have
  at most 100 values per field, with each value at most 200 characters. Reset view keeps filter configuration.

## Several repositories

- **FILTER-15** The `repo:` qualifier matches the whole repository name or `owner/name`, such as `repo:gadgets` or
  `-repo:acme/widgets`, so `repo:widgets` does not match `widgets-legacy`. Plain words match the repository name too.
