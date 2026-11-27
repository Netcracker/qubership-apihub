# Discrepancies Between Technical Design and Business Design

Comparison between the initial technical design (`frontend/ui/docs/design/migrated-operations.md`) and the business
design (`frontend/ui/.temp/Operations Migrations Tracking.md`, ticket `APIHUB-13621`). Each entry records what the
earlier technical design assumed, what the business design specifies, and how the merged technical design handles the
difference.

## 1. Direct Discrepancies (Technical Design vs. Business Design)

### D-01: Feature title and Design Item ID

- **Technical design:** Named `# Migrated Operations` with `Design Item ID: TBD`.
- **Business design:** Named `# Operations Migrations Tracking` with Design Item ID `APIHUB-13621`.
  `Migrated Operations` is the title of the registry dialog, while the feature also adds inline migration marks to
  `API Contracts` and `API Changes`.
- **Merge resolution:** Adopted `Operations Migrations Tracking` and `APIHUB-13621` in the document title and metadata,
  keeping `Migrated Operations` for the registry dialog itself.

### D-02: Feature scope and active mutation flows

- **Technical design:** Covered only the `VersionPageToolbar` button and a read-only `Migrated Operations` dialog backed
  by delayed stubs. `Add Migration`, `Edit Migration`, and `Cancel Migration` were inactive no-op controls, and inline
  marks in `API Contracts` and `API Changes` were absent.
- **Business design:** Defines 12 active use cases across three steps: viewing the registry and inline marks in
  `API Contracts` (UC 5) and `API Changes` (UC 6), bulk adding migrations (UC 7–10), editing an outgoing migration (UC
  11), and canceling a migration from either tab (UC 12). Backend sections remain `TBD`.
- **Merge resolution:** Expanded the UI technical design to cover all 12 use cases with active UI flows, validation,
  confirmations, and notifications, while keeping backend contracts `TBD` behind `/api` query and mutation hooks.

### D-03: Separate `Add Migration` and `Edit Migration` views instead of one combined form

- **Technical design:** Modeled a single future `AddEditMigrationDialog` (`Add/Edit Migration`) for both creation and
  editing.
- **Business design:** Defines two distinct views:
  1. `Add Migration` (UC 7–10): a bulk multi-select table of removed and deprecated source endpoints with automatic
     matching (`Matched Automatically`, `Mapped Manually`, `No Matching Operation`), hoverable `Target Endpoints` and
     `Comment` cell controls, and an `Add` button that removes saved rows from the candidate list without leaving
     `Add Migration`.
  2. `Edit Migration` (UC 11): a single-record two-column form (`Endpoints`, `Target Endpoint`, `Target Package`,
     `Target Version`, `Comment`) with a `Save` button that returns the user to `Migrated Operations`.
- **Merge resolution:** Replaced `AddEditMigrationDialog` with separate `AddMigrationView` and `EditMigrationView` steps
  inside `MigratedOperationsDialog`, sharing header navigation (back arrow to registry, close cross to exit modal) and
  the unsaved-changes guard.

### D-04: Version toolbar button label, counter scope, and tooltip

- **Technical design:** Labeled the button `Migration (%amount%)` (singular), had no tooltip on the button, and left
  counter semantics in `OQ-2`.
- **Business design:** Names the control the `Migrations` button (plural) with a counter showing the sum of
  `Migrated From` and `Migrated To` records for the currently selected version, and adds the tooltip
  `"Migrated Operations"` (UC 1).
- **Merge resolution:** Renamed the button label to plural `Migrations` with the combined current-version count and
  added the `"Migrated Operations"` tooltip. Exact text formatting for zero/loading states stays in `OQ-2`.

### D-05: Registry version scope and default `Filter by This Package Version` value

- **Technical design:** Scoped the registry query strictly to the current `packageKey` and `versionKey`, and opened
  `Filter by This Package Version` empty/unset.
- **Business design:** Defines `Migrated Operations` as a package-wide registry covering all versions of the package.
  When opened from version `V`, `Filter by This Package Version` starts pre-selected to `V` and can be changed or set to
  `All` to inspect migrations across other versions of the package (UC 1, UC 4).
- **Merge resolution:** Scoped the registry to `packageKey`, initialized `Filter by This Package Version` to the route
  `versionId`, and supported `All` to query across the entire package.

### D-06: Target endpoint cardinality (mandatory 1-to-1 vs. optional)

- **Technical design:** Treated `OQ-7` as resolved with strictly one source endpoint and one target endpoint per row,
  and typed `targetOperation` as required.
- **Business design:** States that `Target Package` and `Target Version` are mandatory, whereas `Target Endpoint` is
  optional when a business-process change leaves no direct endpoint equivalent (Assumptions, UC 2, UC 3, UC 8, UC 9).
  Empty target endpoints render an empty cell in `Target Endpoints` (on `Migrated From`) and in `Endpoints` (on
  `Migrated To`).
- **Merge resolution:** Made `targetOperation` optional across the client model, registry cells, `Add Migration`, and
  `Edit Migration`, and updated `OQ-7`.

### D-07: Comment optionality (optional vs. mandatory)

- **Technical design:** Modeled `comment` as optional and rendered an empty cell when absent.
- **Business design:** Makes `Comment` mandatory on every migration record (Assumptions, Domain Concepts, UC 10, UC 11).
  Neither `Add` nor `Save` becomes active until `Comment` is filled.
- **Merge resolution:** Made `comment` required in the domain model, `AddMigrationView` per selected row, and
  `EditMigrationView`.

### D-08: `Status Migration` matching state

- **Technical design:** Had no concept of automatic or manual endpoint matching status.
- **Business design:** Introduces `Status Migration` with values `Matched Automatically`, `Mapped Manually`, and
  `No Matching Operation`, evaluated in `Add Migration` by comparing API type, path, and method against the selected
  target version (Domain Concepts, UC 8, UC 9).
- **Merge resolution:** Added `MigrationMatchStatus` to the domain concepts and `AddMigrationView` table columns.

### D-09: `Migrated To` tab info icon and tooltip

- **Technical design:** Placed an info icon and tooltip only on the `Migrated From` tab label.
- **Business design:** Places an info icon on both tabs: "Operations that were removed or deprecated in this package and
  registered as migrated to another package." on `Migrated From` (UC 2) and "Operations of other packages that were
  registered as migrated into this package." on `Migrated To` (UC 3).
- **Merge resolution:** Added the info icon and tooltip to both tab labels.

### D-10: Asymmetric table columns and `Manage` header between `Migrated From` and `Migrated To`

- **Technical design:** Used identical column definitions on both tabs (`Endpoints`, `Migrated From`, `Migrated To`,
  `Target Endpoints`, `Comment`, `Last Modified`, and an untitled controls column `''`).
- **Business design:** Uses tab-specific column orders that keep the current package on the left and titles the seventh
  column `Manage`:
  - `Migrated From` (UC 2): `Endpoints`, `Migrated From`, `Migrated To`, `Target Endpoints`, `Comment`, `Last Modified`,
    `Manage`.
  - `Migrated To` (UC 3): `Endpoints` (target endpoint in this package, optional), `Migrated To` (this package and
    version), `Migrated From` (source package and version), `Source Endpoints`, `Comment`, `Last Modified`, `Manage`.
- **Merge resolution:** Defined direction-specific column configurations in `MigrationTable` and titled the action
  column `Manage`.

### D-11: Row actions per tab and tooltip casing

- **Technical design:** Rendered both `Edit Migration` and `Cancel Migration` (Title Case tooltips) on both tabs.
- **Business design:** Renders `"Cancel migration"` and `"Edit migration"` (sentence-case tooltips) on `Migrated From`
  (UC 2), and renders `"Cancel migration"` **only** on `Migrated To` (`Edit migration` is unavailable for incoming
  records, UC 3 and UC 12).
- **Merge resolution:** Hid `Edit migration` on `Migrated To`, applied sentence-case tooltips, and noted icon order on
  `Migrated From` in `OQ-21`.

### D-12: Empty-state messages per tab and filtered/search empty state

- **Technical design:** Used a single two-line placeholder (`No migrations` + `Use Add Migration...`) on both tabs for
  empty results and left no-search-results open in `OQ-11`.
- **Business design:** Distinguishes three registry empty states plus two `Add Migration` empty states (UC 2, UC 3, UC
  4, UC 7, UC 8, Interface texts):
  - `Migrated From` with no records: `"No migrations"` and "Use Add Migration to register an endpoint that moved to
    another package."
  - `Migrated To` with no records: `"No migrations"` and "Records appear here when another package registers a migration
    into this one."
  - Either registry tab when search or filters match nothing: `"No migrations"` with no subtitle.
  - `Add Migration` before both target package and version are chosen: `"No endpoints"` and "Select a Target Package and
    Target Version to view available endpoints and start migration."
  - `Add Migration` when search matches nothing: `"No endpoints"` with no subtitle.
- **Merge resolution:** Adopted all five empty-state variants and kept only query-error and default-version-filter edge
  cases in `OQ-11`.

### D-13: Filter panel section order, labels, and `Sort by` casing

- **Technical design:** Kept a static section order (`Migrated From`, `Migrated To`, `General Filters`, `Sort By`) with
  `Target Package` and `Target Version` on both tabs.
- **Business design:** Mirrors the active tab in the filter panel (UC 4):
  - On `Migrated From`: 1) `Migrated From` (`Filter by This Package Version`), 2) `Migrated To`
    (`Filter by Target Package`, `Filter by Target Version`), 3) `General Filters`, 4) `Sort by` (lowercase `by`, inside
    the four-section panel).
  - On `Migrated To`: 1) `Migrated To` (`Filter by This Package Version`), 2) `Migrated From`
    (`Filter by Source Package`, `Filter by Source Version`), 3) `General Filters`, 4) `Sort by`.
- **Merge resolution:** Made the first two filter sections direction-aware (`Target` on `Migrated From`, `Source` on
  `Migrated To`) and aligned section headings to `Sort by`.

### D-14: Filter dropdown options (`All` + active-tab records vs. workspace catalog with disabled version)

- **Technical design:** Populated filter `Autocomplete` controls from general package/version catalog endpoints and
  disabled `Filter by Target Version` until a target package was selected.
- **Business design:** Specifies that every Package and Version field in the filter panel is a dropdown whose first
  value is `All` (selected initially for counterpart package and version), followed by the packages or versions present
  in the records of the active tab (UC 4). Disabling `Target Version` until `Target Package` is selected applies to
  `Add Migration` (UC 7), not to the filter panel.
- **Merge resolution:** Adopted `All`-prefixed dropdown options scoped to active-tab records in `MigrationFilters`,
  while keeping the disabled-until-package-selected rule in `AddMigrationView`.

### D-15: Search matching rules

- **Technical design:** Left search matching semantics entirely undefined on the frontend (`OQ-16`).
- **Business design:** Defines search in `Migrated Operations` as a case-insensitive substring match across both
  endpoint columns of the active tab (`name`, `method`, `path`) and `Comment`, excluding package, version, status, and
  date (UC 4). Defines `Search by Source Endpoints` in `Add Migration` over source endpoints (UC 8).
- **Merge resolution:** Documented these exact search rules for both the future backend contract and the client-side
  stub/MSW implementation.

### D-16: Filter button tooltip casing

- **Technical design:** Reused the shared `FilterButton` tooltip `'Show/hide filter panel'` (lowercase `h`, which also
  switches to `'Filters applied'` when `showBadge` is true in `FilterButton.tsx`).
- **Business design:** Lists the tooltip as `"Show/Hide filter panel"` (uppercase `H`) and does not mention a
  `'Filters applied'` badge tooltip (UC 4, Tooltips).
- **Merge resolution:** Noted the casing and badge behavior difference; `MigrationToolbar` can either pass a custom
  tooltip or reuse `FilterButton` once confirmed.

### D-17: Unsaved-changes confirmation copy, buttons, and navigation target

- **Technical design:** Used provisional title `Leave without saving`, body "Are you sure you want to leave without
  saving? Your changes will be lost.", buttons `Exit without saving` and `Cancel`, and always closed all migration
  dialogs on confirm.
- **Business design:** Specifies title `"Leave without saving?"`, body `"The changes you made will be lost."`, and
  buttons `Leave` and `Keep editing` (UC 7, UC 11, Interface texts). `Add Migration` and `Edit Migration` also
  distinguish between the back arrow (returns to `Migrated Operations`) and the top-right cross (closes
  `Migrated Operations` too).
- **Merge resolution:** Adopted the confirmed copy and buttons, and tracked the pending dismissal action (`back` vs.
  `close`) so `Leave` navigates to the intended destination.

### D-18: Dialog width assumption

- **Technical design:** Inherited the 600px (`sm`) max width of `Create Manual Group` as an initial baseline.
- **Business design:** Places seven columns plus a left filter panel in `Migrated Operations`, and five columns plus a
  five-control toolbar in `Add Migration`, which cannot fit in a 600px dialog.
- **Merge resolution:** Switched `MigratedOperationsDialog` to a wide full-width modal layout (following large Portal
  dialogs such as `EditOperationGroupContentDialog`), keeping exact Figma pixel bounds in `OQ-3`.

---

## 2. Internal Tensions and Gaps Found in the Business Design

These items are ambiguities or contradictions within `Operations Migrations Tracking.md` itself. They have been added or
refined under `## Open Questions` in `frontend/ui/docs/design/migrated-operations.md`.

### B-01: Entry-point precondition vs. shared `VersionPageToolbar` and registry nature (UC 1)

- UC 1 states *"It opens Migrated Operations tab"* in its intro sentence, then refers to `Migrated Operations` as *"the
  window"* whose top-right cross *"closes Migrated Operations as well and leaves the user on the APIHUB tab they came
  from"* (UC 1, UC 4, UC 7). It is a modal dialog with internal tabs, not a seventh route tab in
  `VersionNavigationMenu`.
- UC 1's precondition names only `API Contracts` and `API Changes`, whereas Portal's `VersionPageToolbar` is shared
  across all six `VersionPage` tabs (`Overview`, `API Contracts`, `API Changes`, `Deprecated`, `API Quality`,
  `Documents`). Tracked in `OQ-1`.

### B-02: Workspace-level permissions vs. concrete Portal `PackagePermission` flags (Assumptions, UC 12)

- Assumptions state *"Permissions are granted at workspace level, so no separate permission model is introduced."* In
  Portal (`package-permissions.ts`), workspace and package roles grant specific permissions (`read`,
  `create_and_update_package`, `manage_draft_version`, `manage_release_version`, `manage_deprecated_version`). A
  read-only workspace viewer only has `read`, and canceling an incoming record on `Migrated To` deletes a record stored
  on *another* package's version. Tracked in `OQ-1`.

### B-03: Preserving custom filters across tabs when the second filter section changes direction (UC 4)

- UC 4 states *"Any custom filters selected by the user should be preserved when switching between these tabs, but reset
  to the default settings when the tabs are closed."* However, the second section holds `Filter by Target Package` and
  `Filter by Target Version` on `Migrated From`, and `Filter by Source Package` and `Filter by Source Version` on
  `Migrated To`. Shared fields (`Search`, `This Package Version`, `Last Modified`, `Deprecated`, `Sort by`) transfer
  directly, whereas the counterpart package/version pair must be stored per tab (or mapped) during the dialog session.
  Tracked in `OQ-5`.

### B-04: Default version filter vs. two-line empty state on initial open (UC 1, UC 2, UC 3, UC 4)

- `Filter by This Package Version` opens pre-selected to the current version `V` (not `All`). Meanwhile, UC 2–4 state
  that the two-line empty state (`"Use Add Migration..."` or `"Records appear here..."`) appears when the tab holds no
  records, whereas `"No migrations"` alone appears *"when the filters or the search leave no records."* If version `V`
  has zero migrations while another version of the package has migrations, it is ambiguous whether the initial default
  view should show the two-line guidance or the single-line filtered empty state. Tracked in `OQ-11`.

### B-05: Inline migration marks for deprecated, removed, empty-target, and many-to-one cases (UC 5, UC 6)

- **Deprecated outgoing operations:** Assumptions state *"The migration mark is shown on the version the record is
  stored on"* (where the operation was removed *or deprecated*). However, UC 5 (`API Contracts`) only describes incoming
  marks (`"Migrated From: {package} - {version}"`), and UC 6 (`API Changes`) only describes *removed* (`Migrated To`)
  and *added* (`Migrated From`) operations, omitting operations *deprecated* in the source version.
- **Navigation to a removed source operation:** UC 5 and UC 6 state that clicking a `"Migrated From"` icon opens the
  source endpoint's doc view in `API Contracts` of `{sourcePackage} - {sourceVersion}`. If the source operation was
  *removed* (rather than deprecated) in `sourceVersion`, it has no `API Contracts` doc view in `sourceVersion`.
- **Navigation when `Target Endpoint` is empty:** On a removed operation in `API Changes` (UC 6), `Target Endpoint` is
  optional; clicking the `"Migrated To"` icon needs a fallback target (for example, `API Contracts` of
  `{targetPackage}/{targetVersion}`) when no target endpoint is set.
- **Multiple source endpoints per target endpoint:** Assumptions allow several source endpoints to point to the same
  target endpoint, but UC 5 and UC 6 define a single-record tooltip and a single click target.
- All four sub-cases are tracked in `OQ-7` and `OQ-19`.

### B-06: Source candidates baseline and non-REST matching in `Add Migration` (UC 7–9)

- UC 7 and UC 8 state that `Add Migration` loads *"the removed and deprecated endpoints of the source version"*. Because
  "removed" requires a comparison baseline, the backend must define whether candidates come from the version's published
  changelog (`previousVersion`) and what happens when `previousVersion` is absent.
- Auto-matching is specified in REST terms (*"API type, path and method"*), leaving GraphQL (`operationType` and
  `method`) and AsyncAPI (`action` and `channel`) matching keys, as well as MCP/DDL exclusion, to confirm. Tracked in
  `OQ-20`.

### B-07: `Add Migration` button on `Migrated To` tab and `Manage` icon order (UC 2, UC 4, UC 7)

- UC 4 places `Add Migration` in the shared window toolbar, while UC 7's precondition requires the `Migrated From` tab.
  Behavior of `Add Migration` while `Migrated To` is active (hidden, disabled, or active for the current package
  version) and left-to-right icon order in `Manage` (`Cancel` then `Edit` in UC 2 prose vs. `Edit` then `Delete` in
  existing Portal tables) are tracked in `OQ-21`.
