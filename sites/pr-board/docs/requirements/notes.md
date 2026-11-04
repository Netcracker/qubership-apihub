# Notes

A team lead keeps a note for each PR: what was asked at the standup and what was promised. A developer can keep the
same notes for their own PRs. The next day the note shows what was promised.

- **NOTE-1** Each PR has one note: a Markdown document. A PR is identified by repository and number (**DATA-20**).
- **NOTE-2** Notes are kept in this browser (`localStorage`, under their own key) and are never sent anywhere. They
  survive reloads and Refresh, and stay after the PR is closed. A stored entry that is invalid is dropped, and the
  rest still loads. Notes written by the earlier per-day version move into the document once, one paragraph per day,
  newest first, such as "**2026-10-28** ✓ Fixed the tests". A change is written over what another tab stored
  meanwhile, and that tab picks it up. When storage refuses a change, the note says "Not saved", and the change,
  a deleted note included, stays on this page over what is stored until a save succeeds.
- **NOTE-3** A note icon sits after the PR title. It shows when the pointer is over the row, when it has focus, and
  always once the PR has a note, in the accent color. On touch screens it always shows.
- **NOTE-4** Clicking the icon opens a panel along the right edge of the window with Preview and Edit. It opens in
  Edit when the note is empty and in Preview otherwise. The text is saved when the field loses focus, on Ctrl+Enter,
  on switching to Preview, and when the panel closes. Clearing the text removes the note.
- **NOTE-5** *Removed:* checkboxes per day, reset at midnight. The note is one document now.
- **NOTE-6** *Removed:* the Not asked today quick filter.
- **NOTE-7** The `note:` qualifier matches the text of a PR's note, such as `note:tests`; `-note:` excludes.
- **NOTE-8** *Removed:* editing earlier days. The whole document is editable.
- **NOTE-9** Preview renders the note as GitHub Markdown through the same sanitizer as comments (**SEC-4**): headings,
  lists, task lists, code, and links that open in a new tab.
