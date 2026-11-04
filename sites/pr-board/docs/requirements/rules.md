# Rules

## States

- **RULE-1** CI comes from the overall check status of the last commit: success is Passing; failure or error is
  Failing; pending or expected is Running; no status is No checks.
- **RULE-2** Review comes from each reviewer's latest decision. Any request for changes makes the PR Changes
  requested; otherwise any approval makes it Approved; otherwise it has No approval. A comment-only review does not
  cancel an approval, and a dismissed review is not an approval.
- **RULE-3** Conflicts comes from GitHub's mergeability: mergeable is No conflicts, conflicting is Conflicts, and
  anything else is Checking.
- **RULE-4** A failed check is a check run that failed, timed out, did not start, or needs action, or a commit
  status in failure or error. Cancelled runs are not failures, because superseded runs are cancelled.

## Attention

- **RULE-5** A PR needs attention when at least one enabled rule fires. Each fired rule adds a reason in words.
- **RULE-6** Title rule: the title must follow Conventional Commits, `type(scope)!: subject`, with type one of
  `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Types are
  case-sensitive, the scope and `!` are optional, and a space after the colon is required. The reason says whether
  the format or the type is wrong. These are the defaults of `amannn/action-semantic-pull-request`.
- **RULE-7** Age rule: the PR has been open for more days than the stale limit (**SET-2**, 10 by default). The
  reason states the age and the limit. A PR open exactly the limit is still fine.
- **RULE-8** Issue rule: the PR has no linked issue and is not in a GitHub Project. When project membership is
  unknown (**DATA-14**), the reason says it could not be checked.
- **RULE-9** The title and issue rules can be turned off in Settings (**SET-3**, **SET-4**); the age rule always
  applies with the chosen limit.

## Bots

- **RULE-10** An author is a bot when GitHub marks the account as a bot, when the login ends in `[bot]`, or when the
  login is in the extra bot list from Settings (**SET-5**), compared without regard to case. The default list is
  empty. NetcrackerCLPLCI is a built-in service account and counts as a bot.

## Areas

- **RULE-11** A PR belongs to BE, UI, both, or neither (Other). Settings (**SET-6**) separately configure labels,
  Conventional Commit scopes, bracketed tags, directories mentioned in PR or linked issue titles, and exact
  repository names. Any matching signal selects an area, without regard to case. A label `module:<name>` also
  matches `<name>`. Empty lists disable a criterion. Directories match complete path prefixes, not substrings.
  No changed-file request is made. Existing `area:fe` and `area=fe` links remain valid; `ui` is an alias.

## Your reviews

- **RULE-12** With a known viewer (**DATA-26**), a PR the viewer did not open waits for the viewer's review when the
  viewer, as a person, is among its requested reviewers. It is re-requested when the viewer has also reviewed it before
  (approved, requested changes, or a dismissed review; GitHub's latest decisions leave comment-only reviews out): the
  author asks the viewer to look again. Requests to the viewer's teams do not count, because a public-read token often
  cannot see them.
