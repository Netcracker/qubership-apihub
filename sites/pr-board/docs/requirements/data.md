# Data

## Configuration

- **DATA-1** The published page opens with official Netcracker repository groups. Viewers can override repositories
  in the link (**FILTER-14**), Settings (**SET-16**), or groups (**SET-19**). `PR_BOARD_REPO` optionally overrides the
  build's repository list; malformed values stop the build with a message naming the variable.
- **DATA-2** Mock development uses fictional `acme/widgets` data. Live mode uses official groups and the personal
  token entered in the browser; environment credentials do not generate a server-side snapshot. Only mock mode
  injects the DEV panel and mock API configuration.
- **DATA-28** `PR_BOARD_GROUPS` overrides the build's default groups using the Repository groups field format;
  `PR_BOARD_BOTS` supplies default extra bot logins. Missing variables retain official groups and no extra bots;
  empty values clear the corresponding lists. Invalid groups, invalid logins, or more than 50 unique bot logins
  stop the build with the variable name. Mock development ignores these variables. Saved groups, including an empty
  list, take precedence over build groups. Explicit URL values take precedence over saved preferences and defaults;
  `bots=` explicitly disables extra bots. Reset restores the active build defaults. Nx hashes all three build
  variables, including `PR_BOARD_REPO`, so a cached build uses the requested configuration.

## Snapshot

- **DATA-3** The existing monorepo Pages workflow assembles the board with the other sites, following the common
  site-ref policy. The build produces a static page without PR data. Monorepo CI runs type, unit coverage,
  requirement, and Chromium checks when affected. No shared credential or data-collection workflow is used.
- **DATA-4** When `prs.json` is published next to the page, the page opens with it, so it works without a token. The
  dev server's mocks always serve one; the published page has none and loads live data (**DATA-23**).
- **DATA-5** `prs.json` holds the repositories it covers (**DATA-19**), the generation time, the workflow run link,
  warnings, and the normalized PRs. The page checks its shape: a file without a PR list counts as broken, and an entry
  without a positive whole PR number is skipped. Every other field a row reads is checked: a missing or wrong value gets
  its default (no CI, no approval, unknown mergeability, the file's time for a bad date), and a list keeps only its
  well-formed entries, so one broken entry cannot blank the page.

## Refresh

- **DATA-6** **Refresh** queries GitHub from the browser with the viewer's fine-grained token (public repository
  read access) and replaces the data on the page. The page then marks the data as live. While a load runs, the rows
  already on the page stay, and the new data updates them in one pass without moving the table's scroll position.
- **DATA-7** A second Refresh cannot start while one is running. A load that starts another way, such as after a token
  is saved, replaces the running one, which stops reading. A load without a snapshot that already ran for the same
  repositories and token does not run again by itself.
- **DATA-8** Refresh skips the parts of the query that only hidden columns show: failed check details when CI is
  hidden, and comment and review bodies when Last comment is hidden. Search cannot match comment text until a
  refresh with the column shown. The snapshot is shared and always complete.

## Collected fields

- **DATA-9** One GraphQL query, 20 PRs a page, newest first, collects for each open PR. GitHub stops a query after
  about ten seconds, so a page that times out (HTTP 502 to 504, or a failed fetch, which is how a timeout without CORS
  headers looks in the browser) is asked again with half as many PRs, down to five, and later pages keep that size.
  For each PR the query collects:
  - number, title, URL, draft flag, target branch, created and updated time, and mergeability;
  - the author and up to 10 assignees, with avatars, and whether the author is a GitHub bot;
  - up to 30 labels with color and description;
  - up to 10 linked issues from the Development field (number, title, URL, issue type, and up to 10 labels) and up to
    10 GitHub Projects;
  - the latest decision of up to 20 reviewers and up to 20 pending review requests, users and teams;
  - the overall CI state of the last commit and its first 100 checks, of which only failing PRs keep the failed ones;
  - the last 5 issue comments and the last 10 review summaries;
  - GitHub's spelling of the repository name, which the PRs take when it differs from the requested one only in case;
  - the viewer (**DATA-26**), on the first page of each repository only.

  A requested reviewer without a login, such as a placeholder account of an imported repository, is skipped.
- **DATA-10** Only the two newest comments are kept, issue comments and review summaries together. Comments that are
  empty or hold only HTML comment markers are skipped. Each kept body is cut at 4,000 characters and marked as cut. The
  cut never splits a character, and never leaves an HTML comment open, which would hide the rest of the body.
- **DATA-11** A label color that is not six hex digits is dropped, and the label shows in neutral colors.
- **DATA-12** Entries that GitHub returns as `null` inside lists are skipped.
- **DATA-25** For each linked issue, the query reads its items in up to 3 GitHub Projects and, in each, the fields named
  Priority (single select: the option and its color), Estimate (number), and Sprint (iteration: its title, start date,
  and length in days). The first project that sets a field gives its value. A forbidden project read is a partial error,
  as in **DATA-14**: the repository is read again from its first page without these fields, so no PR keeps fields that
  others lack, and the page shows a warning.

## Errors

- **DATA-13** An HTTP error, a GraphQL error, a response that is not JSON, or a network failure stops the build or
  the refresh with a readable message. A rejected token says to create a new one.
- **DATA-14** A forbidden Projects field is a partial error: the data loads, the page shows a warning, and project
  membership counts as unknown instead of empty.
- **DATA-15** When GitHub returns fewer PRs than its `totalCount`, the page shows a warning.
- **DATA-16** A missing `prs.json` (HTTP 404) means there is no snapshot, which is not an error (**DATA-23**). When
  it is broken or another HTTP error comes back, the page says so and suggests Refresh with a token.

## Live data

- **DATA-23** Without a snapshot, the page loads live data by itself when it has a saved token and requested
  repositories: as soon as it opens, and again when the requested repositories or the token change, unless the data
  already holds every requested repository for the same token. Each set of repositories and token loads once, so a
  repository that cannot be read does not load again and again. Without a token, a banner names the repositories and
  says to add a token in Settings. Without requested repositories, the table says to choose them in Settings or to open
  a link with `?repos=owner/name`; with repository groups and none checked, it says to check one in the Repositories
  menu.
- **DATA-24** While the page shows live data and its tab is visible, it loads again at the interval set in Settings
  (**SET-22**), 5 minutes by default, counted from the end of the last load or attempt, so a failure is retried after
  the same interval and a slow load is never followed at once by the next. It waits while Refresh cannot start
  (**DATA-18**). A hidden tab pauses the countdown, and a tab that comes back after the interval loads at once. With the
  setting Off, live data loads again only on **Refresh**. A snapshot is replaced only on **Refresh** or by loading
  without one.
- **DATA-26** A live load also reads the login and avatar of the token's owner, the viewer (**RULE-12**), and shows
  them at the top right with a link to their GitHub profile. A `prs.json` snapshot leaves the viewer out, because the
  token that wrote it is not the viewer's. Identity applies only to the token that loaded that report; replacing or
  forgetting the token clears personal filters until a successful load identifies the new viewer.
- **DATA-27** A live load says what it is doing: with one repository, how many of its pull requests are read out of
  the total; with several, how many repositories are done, how many pull requests are read so far, and a line for
  each repository being read. A slowdown says why, such as a timed-out page asked again with fewer pull requests. A
  spinner and a clock in tenths of a second run beside it. In an empty table the status takes the table's place
  (**TABLE-19**); over a table with rows it sits in a corner, so the rows stay where they are. When the load ends,
  the corner shows how many pull requests came from how many repositories and how long it took, for 5 seconds.
  A screen reader hears when a load starts and how it ended, not each step. When a new load starts before the last
  one ends, only the new one's results and status count.

## Several repositories

- **DATA-17** `PR_BOARD_REPO` takes up to 40 repositories separated by commas, such as
  `acme/widgets, acme/gadgets`. Spaces are ignored and a repeated repository counts once, without regard to case.
  An entry that is not `owner/name` stops the build with a message naming the variable and the entry.
- **DATA-18** The snapshot reads every repository of `PR_BOARD_REPO`. Refresh reads the repositories of `repos`; without
  them, only the repositories of the checked repository groups (**FILTER-17**), and with Ungrouped checked those of the
  data that are in no group, which then are the requested repositories of **DATA-22** and **DATA-23**, so checking
  another group loads it; without groups, every repository on the page. More than 40 repositories in the checked groups
  stop Refresh with a message that says to uncheck a group, and when the checked entries have nothing to load Refresh
  says to check a group. Reads go four at a time with the query of **DATA-9**. The PRs of all repositories come newest
  first. A repository that does not exist or that the token cannot read, such as one behind SAML enforcement, is named
  in a warning with the reason GitHub gives, and the others load; with one repository, or when none can be read, it
  fails as in **DATA-13**. With several repositories, the **DATA-15** warning names the repository. Once one read fails,
  the load fails: the reads not yet started never start, and a read under way stops before its next page.
- **DATA-19** `prs.json` lists the repositories it covers, and each PR names its repository. A file written before
  this change, with one repository and PRs without one, still loads: its PRs belong to that repository. A PR
  whose repository is missing, not `owner/name`, or not in the file's list gets the file's only repository, or none
  when there are several.
- **DATA-20** A PR is identified by its repository, as GitHub spells it (**DATA-9**), and number. Two PRs with the same
  number in different repositories are two rows with their own comments, and the comments panel reads each PR from its
  own repository.
- **DATA-21** With mock data the dev server shows `acme/widgets` alone by default. A DEV panel scenario adds the
  fictional `acme/gadgets`, with PR numbers that repeat those of `acme/widgets`.
- **DATA-22** When the address asks for repositories (**FILTER-14**) that the data on the page does not cover, the
  page shows the PRs of the requested repositories it has and a banner naming the missing ones and whether the data
  is a snapshot or live. **Refresh** with a token then loads every requested repository. Without a token,
  the banner suggests adding one.
