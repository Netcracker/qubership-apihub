# Table

## Header

- **TABLE-1** The header shows the repository name, or the names (**TABLE-27**), and the title "Open pull requests". On
  the right, in this order: the quick filter tiles (**FILTER-1**), the data source, **Refresh**, the settings gear, and,
  with live data, the viewer (**DATA-26**).
- **TABLE-2** The data source is a dot with a short age next to it, such as "updated 12 min ago": gray for the
  snapshot, green and "live" for data loaded by Refresh. A click opens the details (**PANEL-8**).
- **TABLE-3** Banners under the header report a failed refresh, why a Refresh cannot start (**DATA-18**), shown after
  Refresh is asked for and gone with the reason, a failed load (**DATA-16**), requested repositories the data lacks
  (**DATA-22**, **DATA-23**), with an **Add token** button when there is no token, and data warnings (**DATA-14**,
  **DATA-15**, **DATA-18**).

## Columns

- **TABLE-4** The table has one row per PR. Every row keeps its bottom border, including the last row in a short list.
  Columns appear in this order unless the viewer moves them (**SET-24**):

  | Column | Content |
  | --- | --- |
  | Repository | Only with several repositories (**TABLE-26**). |
  | # | PR number, linked to the PR. |
  | Pull request | Title linked to the PR and the note icon (**NOTE-3**); chips; labels. |
  | Issue | The linked issues, or the project (**TABLE-8**). |
  | Author | Avatar and login; a `bot` chip for bots (**RULE-10**). |
  | CI | Status code (**TABLE-12**). **F** opens the failed checks. |
  | Review | Status code, a reviewer count, and pending reviewers (**TABLE-13**), which open the reviewers; or the list of reviewers (**TABLE-30**). |
  | Conflicts | Status code. |
  | Age · activity | Age in days since the PR was opened, and the time since its last update. |
  | Assignee | Avatars and logins, or "Unassigned". |
  | Last comment | Author, time, a counter, and a two-line preview. Opens the comments panel. |
  | Attention | An icon with the number of reasons. Opens the reasons. |

- **TABLE-5** Columns can be hidden in Settings (**SET-8**); # and Pull request are always shown.

## Cells

- **TABLE-6** The Pull request cell shows, under the title: an `example` chip for dev corner cases, a Draft chip, a
  target branch chip when the branch is not `main`, and the labels. A dev corner case also shows its note.
- **TABLE-7** Labels use their GitHub colors, with dark or light text picked by the brightness of the color. Chips
  are 11 px text and at most 150 px wide. The first four show; the rest fold into **+N**, which expands the list,
  and **less** folds it back. Clicking a label toggles the `label:<name>` filter in the search (**FILTER-11**).
- **TABLE-8** The Issue column shows each linked issue as its type (a colored dot and the name, when the organization
  uses issue types), `#<number>`, and its title on up to two lines, linked to the issue, with up to three of the
  issue's labels below and `+N` for the rest. A type color the board does not know shows a neutral dot. Without an
  issue but in a project, it reads `No issue · in <project>`; with neither, `No issue`.
- **TABLE-28** Under a linked issue, the Issue column shows its project fields (**DATA-25**): the Priority option in
  its color, the Estimate as "Est 3", and the Sprint title, marked "current" while the viewer's local day is inside
  it, with its dates in the tooltip. A field that is not set does not show.
- **TABLE-9** A person shows an avatar and a login. Without an avatar, or when the image fails, the cell shows the
  initials. A deleted account shows as "ghost". A login that does not fit beside the avatar moves below it.
- **TABLE-10** The age reads "today" or "N days" and turns red past the stale limit (**RULE-7**). The activity line
  reads "updated 5 min ago", "updated 3 hours ago", "updated yesterday", and so on.
- **TABLE-11** The Last comment cell shows the newest comment's author and time, a **+1** when there is a second
  comment, and the comment as plain text without Markdown or HTML, cut to two lines. Without comments it reads
  "No comments".

## Status codes

- **TABLE-12** Cells show short codes; the full name is in the tooltip, the accessible name, and the legend. The Review
  tooltip starts with the decision and then names the approvers, so changes requested stays visible when someone also
  approved.

  | Column | Codes |
  | --- | --- |
  | CI | **P** passing, **F** failing, **R** running, **—** no checks |
  | Review | **✓** approved, **CR** changes requested, **—** no approval |
  | Conflicts | **OK** no conflicts, **C** conflicts, **?** GitHub is still checking |

- **TABLE-13** The Review code shows a small number when more than one reviewer stands behind the decision, such as
  **✓2** for two approvals. A gray **◷N** next to it counts requested reviewers who have not answered.
- **TABLE-14** The CI code **F** shows a small number when more than one distinct check failed.
- **TABLE-29** After the Review code, a PR waiting for the viewer's review (**RULE-12**) shows GitHub's icons: the
  dot of a pending review, or the sync arrows of a re-requested one, with a tooltip that says which.
- **TABLE-30** As a list of reviewers (**SET-20**), the Review cell shows each reviewer once, as GitHub's Reviewers
  sidebar does: a small avatar, the login, and GitHub's icon for where the review stands (awaiting review, asked again,
  requested changes, approved, left review comments, review dismissed). The reviewers come in groups, in the order set
  in Settings (**SET-25**): by default requested changes, then those still to review, then comments, dismissed reviews,
  and approvals. In every order the viewer's own request leads those still to review. The viewer's line is bold, and
  when their review is due it has a highlighted background. More than four lines show the first three and a "+N more"
  button that opens the whole list. A PR without reviewers says so. A dismissed review has its own icon, so the list
  does not rely on color alone.
- **TABLE-15** A 3 px stripe on the left edge of a row mirrors CI: red when checks failed, yellow while they run,
  green when they passed, and none without checks.

## Sorting

- **TABLE-16** Clicking a column header sorts by it; a second click reverses the order. Issue, Assignee, and Last
  comment are not sortable. Repository, Title, and Author sort A to Z first; the other columns sort descending first.
- **TABLE-17** CI sorts failing, running, no checks, passing; Review sorts changes requested, no approval, approved;
  Conflicts sorts conflicts, checking, no conflicts; Age sorts by the opening time; Attention by the number of
  reasons. Ties fall back to the PR number, newest first.
- **TABLE-18** The default sort is Attention, most reasons first.

## States

- **TABLE-19** While data loads and the table has no rows, the table shows a spinner: with "Loading pull requests…"
  for `prs.json`, and with the live load's status (**DATA-27**) for **Refresh** and for a load without a snapshot
  (**DATA-23**). The spinner stops when the system asks for reduced motion (**QUAL-5**).
- **TABLE-20** When no PR matches the view, the table shows "No pull requests match this view", a hint to clear the
  search or select more authors, and a **Reset view** button. Without data it says instead what is missing: the
  repositories to choose or a repository group to check (**DATA-23**), or "No pull requests loaded yet" when the
  requested repositories wait for a token or the load failed.

## Layout

- **TABLE-21** One screen with a single scroll: the header and the toolbar stay in place, only the table scrolls,
  and the column headers stick to the top. Below 700 px wide or 520 px high, the whole page scrolls instead.
- **TABLE-22** The table always fills the window width, whichever columns are shown. Spare width goes to Pull
  request and Last comment, or to the last column when both are hidden. Wider columns make the table scroll
  sideways.
- **TABLE-23** The table frame has a 1 px solid border on all four sides. Thin vertical lines separate the columns
  in the header and in every row; the last column uses the frame's right border. Header cells have a stronger bottom
  separator. These borders use theme colors and remain present in both densities, with hidden columns or an empty view.
- **TABLE-24** A column resizes by dragging its header edge, or with the left and right arrow keys on the focused edge.
  The handle sits on the column line and highlights on hover and focus. A double-click resets that column, and a click
  without a drag changes nothing. Widths are kept in this browser (**SET-11**). No column gets narrower than 56 px.

## Legend

- **TABLE-25** A thin bar at the bottom explains the CI, Review, and Conflicts codes, the pending reviewer counter,
  and the row stripe. It ends with **Custom rules** when the viewer's rules differ from the defaults (**SET-10**) and
  a **Rules** link (**PANEL-7**).

## Several repositories

- **TABLE-26** When the rows the repository groups let through (**FILTER-17**) come from more than one repository, a
  Repository column comes first; a search does not count, so the column stays while typing. It shows the repository name
  without its owner, such as `widgets` for `acme/widgets`, linked to the repository, with `owner/name` in the tooltip; a
  name too long for the column is cut at its start, such as `…gadgets-ui`; the owner shows only when two repositories on
  the board have the same name. It sorts A to Z first, with ties by PR number, newest first. It can be hidden in
  Settings (**SET-8**). With one repository the column and its Settings entry are absent.
- **TABLE-31** With repository groups (**SET-19**), each group takes one of six soft tints in turn, by its place in
  Settings, in both themes. The repository name in the Repository column (**TABLE-26**) sits on the tint of its group,
  or of the first group that lists it; a repository in no group has none. The group's entry in the Repositories menu
  (**FILTER-17**) has the same tint, so the colors read without a legend.
- **TABLE-27** With several repositories the header names them in place of one repository name. More than two
  show as the first one and "+N more", with the full list in the tooltip.
