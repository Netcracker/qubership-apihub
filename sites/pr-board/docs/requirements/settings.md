# Settings

- **SET-1** The gear next to **Refresh** opens one settings panel. Changes apply at once. The panel scrolls when the
  window is short, and its footer says where settings live (**SET-11**, **SET-17**).

| Id | Section | Setting | Default |
| --- | --- | --- | --- |
| **SET-2** | Attention rules | Stale after N days, a whole number from 1 to 365 (**RULE-7**). | 10 |
| **SET-3** | Attention rules | Check the title against Conventional Commits (**RULE-6**). | On |
| **SET-4** | Attention rules | Require a linked issue or a GitHub Project (**RULE-8**). | On |
| **SET-5** | Attention rules | Extra bot logins, separated by commas or spaces (**RULE-10**). | Build defaults, empty unless configured (**DATA-28**) |
| **SET-6** | Filter settings | UI and BE labels, scopes, tags, directory mentions, and repositories (**RULE-11**). Empty lists disable a signal. Reset filters restores defaults. | Official criteria |
| **SET-7** | View | Theme: System, Light, or Dark. Density: Comfortable or Compact rows. | System, Comfortable |
| **SET-8** | Columns | Show or hide each column except # and Pull request, kept in this browser; legacy links still apply (**FILTER-14**); **Reset column widths**. | All shown |
| **SET-24** | Columns | Move each column up or down with arrow buttons; the first and the last cannot move further. A move skips the Repository column while one repository hides it. The order is kept in this browser; legacy `cols` links still apply (**FILTER-14**). | The order of **TABLE-4** |
| **SET-9** | GitHub token | Save, replace, or forget the token for Refresh and the comments panel. | None |
| **SET-23** | View | Labels: Show or Hide the label chips of PRs and of their linked issues (**TABLE-7**, **TABLE-8**). Search still finds labels. | Show |
| **SET-22** | GitHub token | Load live data again: Off, 2, 5, 10, or 30 minutes (**DATA-24**). Anything else stored falls back to the default. | 5 min |

- **SET-10** When an attention rule differs from its default, the gear shows a dot, the legend shows **Custom
  rules**, and the Rules popover lists the values in use (**PANEL-7**). Other viewers may then see a different
  Attention count. Extra bots matching the build defaults do not mark the rules as customized.
- **SET-11** Settings are stored in this browser (`localStorage`) and survive reloads: the settings of this panel under
  one key, and the token, the column widths, the notes (**NOTE-2**), and whether the setup wizard was closed
  (**SET-21**) each under its own. The repositories and the extra bots live only in the address (**SET-17**); the hidden
  columns and column order stay in this browser. Groups and detection criteria are stored and shared when customized
  (**FILTER-14**). A stored value that is missing or invalid falls back to its default, field by field, so an old entry never
  breaks the page.
- **SET-12** **Reset to defaults** restores the rules, areas, view (theme, density, the Review column, the reviewers
  order, and labels), the live load interval, and columns with their order. It restores the active build's groups
  and extra bots (**DATA-28**) and removes custom overrides from the address. It also saves those groups when a
  shared link already displays them over older preferences. It keeps the token, the column widths, and the notes.
- **SET-13** **Refresh** without a token opens the token dialog (**SET-18**). Opening the settings panel from the
  gear does not jump to the token.
- **SET-14** A number field keeps the last valid value: an invalid entry does not apply and is replaced when the field
  loses focus. Lists apply when their field loses focus, on Enter, and when the panel closes, by Escape or a click
  outside, before the field loses focus; a list that did not change applies nothing.
- **SET-15** Compact density makes rows tighter and avatars smaller. Theme Light or Dark overrides the system
  setting; System follows it.
- **SET-20** A Review column setting shows reviews as the Review code (**TABLE-12**, **TABLE-13**), the default, or as a
  list of reviewers (**TABLE-30**). It is kept in this browser; anything else stored falls back to the code. Switching
  it drops a Review width dragged for the other layout, so each starts at its own default.
- **SET-25** A Reviewers order list in the View section orders the groups of the Reviewers list (**TABLE-30**):
  requested changes, not reviewed yet (pending and asked again), left comments, review dismissed, and approved, each
  moved up or down with arrow buttons; the first and the last cannot move further. The default is that order. It is kept
  in this browser; a stored order is completed with the missing groups in the default order.
- **SET-21** A setup wizard walks through the look of the board in five steps: theme (System, Light, Dark), row density,
  the Review column (**SET-20**), the reviewers order (**SET-25**), and labels (**SET-23**). The reviewers order step
  offers three ready orders, Changes first, Waiting first, and Approvals first, each with a picture of one PR's list.
  Each choice is a card with a small picture of the board drawn in that look, so both variants show side by side; System
  shows the light and the dark picture together. The Review column step shows only Review cells, large enough to read,
  in both layouts, and the Labels step the rows with and without labels. A choice applies at once. The wizard never
  opens by itself: on the first visit in a browser the board shows at once, with a small card in the corner that offers
  a tour of how the board can look, with **Take the tour** and **Not now**. Either button answers the card for good in
  this browser. The card gives way to the token dialog (**SET-18**) while it is open. The wizard also opens from **Setup
  wizard** in Settings. **Skip**, Escape, and **Done** close it, and a click outside does not. Focus starts on the card
  picked, stays in the wizard, and returns where it was, or to the Settings button, when it closes.

## Settings in the address

- **SET-16** A Repositories section at the top of the panel takes up to 40 entries as `owner/name`, separated by
  commas, spaces, or new lines, and applies like a list (**SET-14**). Applying writes `repos` to the address
  (**FILTER-14**); an empty field removes it. A malformed entry is not applied, and the field names the entry and
  what is wrong with it.
- **SET-17** The repositories and the extra bot logins (**SET-5**) live in the address, not in this browser, so a link
  or a bookmark carries them. The panel footer says what the address carries. **Reset to defaults** removes both from
  the address. Extra bots that an earlier version saved in this browser move into the address on the first visit,
  checked like the bots of a link. When that visit comes through a link with its own bots, the link's bots apply and the
  saved ones are dropped.
- **SET-18** When the page needs a token and has none, a dialog explains how to create one: a link to GitHub's page for
  a new fine-grained token and short steps (any name and expiry; Repository access: Public repositories, read only; no
  extra permissions; copy the `github_pat_…` value). It has a token field with **Save and load** and **Not now**. Saving
  stores the token (**SET-9**) and loads the data. The dialog opens by itself on a page without a snapshot whose link
  names repositories (**DATA-23**), and from **Refresh** without a token. A click outside does not close it. After **Not
  now**, or after **Forget token**, it does not open by itself again until the page reloads; the banner's **Add token**
  button opens it. Focus starts in the token field, stays in the dialog, and returns to what opened it when it closes,
  or to the Settings button when that is gone. A dialog that opens right after another one closes keeps the focus.
- **SET-19** A Repository groups section, under Repositories, defines named groups in a text field, one per line:
  `<name>: owner/name, owner/name`. A leading `*` marks a group checked by default in the Repositories menu
  (**FILTER-17**). It applies like a list (**SET-14**); a line without a name, with a comma, a semicolon, or a colon in
  the name, with a name that starts with `*`, named Ungrouped, or with an entry that is not `owner/name`, is not
  applied, and the field says which line and why. Up to 20 groups. The groups are kept in this browser and travel in the
  address (`repogroups`, **FILTER-14**), which does not save them; the board has none until the viewer adds them. Enter
  adds a line; the field applies on blur or Ctrl+Enter. **Reset to defaults** clears the groups.
