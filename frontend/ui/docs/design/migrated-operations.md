# Migrated Operations

| | |
| --- | --- |
| **Design Item ID** | TBD |
| **Design Item Name** | Migrated Operations |
| **Related Design Items** | TBD |
| **Related API** | TBD. The first iteration uses client-side stubs and does not call backend endpoints. |
| **Revision History** | 18.11.2026: Initial version for the first UI iteration. |

---

## Summary

Add a `Migration (%amount%)` button to the package version toolbar. The button opens a `Migrated Operations` dialog
with `Migrated From` and `Migrated To` views, search, optional filters, sorting, and a migration table. The first
iteration delivers the complete UI layout with stubbed query hooks. Add, edit, and cancel migration actions remain
inactive, while the dialog close flow already supports a future unsaved-changes guard.

## Assumptions

- The entry point is `VersionPageToolbar`, immediately before `Copy`. Visibility for dashboards, package kinds,
  permissions, and zero migrations requires confirmation in OQ-1 and OQ-2.
- `Migrated From` is the default tab. `Newest first` is the default sort direction.
- The filter sidebar is hidden when the dialog opens. All three filter accordions start expanded.
- One search value, filter form, and sort selection apply to the active tab and remain unchanged when the user switches
  tabs. OQ-5 asks whether each tab needs independent view state instead.
- Search, filters, and sorting are view state. They do not mark the migration form as dirty and do not trigger the
  unsaved-changes confirmation.
- Only future add or edit migration form changes mark the dialog as dirty. The first iteration provides no control that
  creates such changes, so normal first-iteration close actions do not open the confirmation.
- All dialog dismissal paths use the same close handler: title close button, backdrop click, and `Escape`. A clean
  dialog closes immediately; a dirty dialog opens the confirmation. Browser navigation is outside the first iteration.
- The reference `Create Manual Group` dialog does not declare explicit dimensions. It inherits the MUI `Dialog` default
  `sm` maximum width of 600px and content-driven height. The migration dialog starts with the same sizing; OQ-3 asks
  whether the seven-column table requires a wider dialog.
- The existing Portal calendar pattern uses `react-multi-date-picker` with a MUI `TextField`, not MUI X Date Pickers.
  The first iteration reuses that Portal pattern in range mode; OQ-4 records the library discrepancy.
- The UI applies query changes after the shared `DEFAULT_DEBOUNCE` interval of 500ms. Controls update immediately, while
  table recalculation waits for the debounce interval.
- Stub data represents both tabs and exercises search, filters, dependency resets, and sorting locally. Replacing a stub
  query function with a real request must not change the component contracts.
- No backend endpoint, persistence change, permission rule, or navigation target is invented in this iteration.
- Figma mockups were not supplied. The component references in this document define the initial visual layout.

## Domain Concepts

| Concept / Value | Description |
| --- | --- |
| Current package version | The package and version identified by the `VersionPageToolbar` route parameters. It is the context for the migration count, table requests, and current-version filter options. |
| Migration record | A relationship between source operations and target operations, with source and target package versions, an optional comment, and last-modified metadata. Endpoint cardinality requires confirmation in OQ-7. |
| `Migrated From` | The view described by the requested tooltip: operations removed or deprecated in this package and registered as migrated to another package. |
| `Migrated To` | The reverse-direction view for operations registered as migrated into the current package. Exact backend semantics require confirmation in OQ-6. |
| `All` deprecated filter | Includes migrated operations regardless of deprecated status. This is the default. |
| `Yes` deprecated filter | Includes only operations matching the deprecated criterion. The operation set to which the criterion applies is defined in OQ-8. |
| `No` deprecated filter | Includes only operations that do not match the deprecated criterion. |
| `Newest first` | Sorts migration records by last-modified timestamp in descending order. |
| `Oldest first` | Sorts migration records by last-modified timestamp in ascending order. |
| Dirty migration form | A future add or edit form whose current values differ from its initial values. Search, filters, tab selection, sorting, and accordion state are excluded. |
| Migration count | The number rendered in `Migration (%amount%)`. Its relation to records, operations, tabs, and filters is defined in OQ-2. |

## Use Cases

### Use Case 1: Open Migrated Operations from the version toolbar

| Description | UI (Mockup) | API / Logic |
| --- | --- | --- |
| Render an outlined button before `Copy`, using the same `Button` and `startIcon` pattern as the neighboring `CopyPackageVersionButton`. | TBD | Update the action group in `VersionPageToolbar.tsx` without changing the order of the existing buttons. |
| Render the supplied 14x14 migration SVG at the start of the button. Keep the icon as a reusable icon component and preserve its supplied path and default color. | TBD | Use a new migration icon because no matching shared icon exists. |
| Set the button label to `Migration (%amount%)`, replacing `%amount%` with the count returned by the count query hook. The first iteration displays a fixed stub count. | TBD | `useMigratedOperationsCount(packageKey, versionKey)` returns stub data. The count is independent of dialog search and filters unless OQ-2 decides otherwise. |
| Open `Migrated Operations` when the user clicks the button. | TBD | Follow `OperationGroupsCard.onCreateButton`: add a `showMigratedOperationsDialog` event with `packageKey` and `versionKey`, dispatch it through `EventBusProvider`, and receive it with `PopupDelegate`. |
| Mount the dialog only while it is open, matching `PopupDelegate`. A later open starts with default view state and no unsaved changes. | TBD | `PopupDelegate` owns `open` and event detail. The dialog content owns tabs, search, filters, table state, and dirty state. |

### Use Case 2: Dialog frame and close confirmation

| Description | UI (Mockup) | API / Logic |
| --- | --- | --- |
| Display a modal dialog titled `Migrated Operations`. The body contains the tab/search toolbar and the active tab content. | TBD | Reuse `DialogForm`, `DialogTitle`, `DialogContent`, `DialogActions`, and `CloseIcon` composition. This is a modal dialog, not an anchored MUI `Popover`. |
| Place a close icon button in the top-right corner of the dialog title. | TBD | The button invokes the guarded close handler rather than directly changing `open`. |
| Match the reference dialog sizing mechanism: no explicit width or height, MUI default `sm` maximum width, and content-driven height. Internal regions must prevent the toolbar and title from scrolling away with table content. | TBD | Reuse `DialogForm`. Final dimensions, table scrolling, and sidebar resizing remain subject to OQ-3. |
| Close immediately when the user requests close and the migration form is clean. | TBD | Reset dialog-local state through unmounting. |
| Open a second, custom confirmation dialog when the user requests close and the migration form is dirty. Keep the main dialog mounted behind it so its state is preserved. | TBD | The close handler checks dirty state and sets `leaveConfirmationOpen`. It does not discard migration form values yet. |
| Use `Leave without saving` as the initial confirmation title and `Are you sure you want to leave without saving? Your changes will be lost.` as the initial question. These strings are provisional. | TBD | Compose the confirmation from the same MUI and `DialogForm` components as the regular dialog. Use `ConfirmationDialog.tsx` as the layout reference, not as a required wrapper. |
| Place a close icon button in the confirmation title, a red contained `Exit without saving` button, and a default outlined `Cancel` button. | TBD | The confirmation close icon and `Cancel` have identical behavior. The exit button uses the error color. |
| Close only the confirmation and return to the unchanged dirty form when the user clicks `Cancel`, the confirmation close icon, its backdrop, or presses `Escape`. | TBD | Set `leaveConfirmationOpen` to false. Keep the main dialog and all migration form values intact. |
| Close both dialogs and discard unsaved migration changes when the user clicks `Exit without saving`. | TBD | Clear dirty state, close the confirmation, and close the main dialog. A subsequent open uses initial state. |

### Use Case 3: Tabs and migration toolbar

| Description | UI (Mockup) | API / Logic |
| --- | --- | --- |
| Split the migration toolbar into left and right regions. The left region contains `Migrated From` and `Migrated To`; the right region contains search, the filter toggle, and `Add Migration`. | TBD | Use a flex row with left and right groups. Allow the right group to remain aligned right within the available dialog width. |
| Implement tabs with MUI `TabContext`, `TabList`, `Tab`, and `TabPanel`, following `GlobalSearchPanel/SearchResults.tsx`. | TBD | Store the active direction locally. Tab selection does not change the route. |
| Display the `Migrated From` tab first and select it initially. Display `Migrated To` second. | TBD | Each tab selects its own migration dataset and table instance. Both tables use the same column definitions. |
| Add an info icon button immediately after the `Migrated From` title. On hover, show exactly: `Operations that were removed or deprecated in this package and registered as migrated to another package.` | TBD | Reuse `InfoContextIcon`, MUI `Tooltip`, and `IconButton`. The icon is part of the `Migrated From` tab label; OQ-14 confirms its visibility when the other tab is active. |
| Show a `SearchBar` with placeholder `Search by Endpoints or Comment`. | TBD | Reuse the shared `SearchBar`. Debounce the effective search value by 500ms and include it in the active table query key. |
| Recalculate the active table after the effective search value changes, including when the user clears search. Preserve the current tab and other filters. | TBD | Reset pagination to the first page, cancel obsolete pending requests in the real-request iteration, and rerun the stub query in the first iteration. |
| Render a filter icon button with the shared `FilterIcon`. The button toggles the filter sidebar for the active tab. | TBD | Reuse the shared `FilterButton` pattern and its `Show/hide filter panel` tooltip. Show the selected state while the sidebar is visible. |
| Render `Add Migration` after the filter button. It has no action in the first iteration. | TBD | Keep the click handler empty or omit it; do not open another dialog and do not change dirty state. Permission behavior is covered by OQ-1. |

### Use Case 4: Migration tables

The active tab contains a table with seven columns. The technical controls column has an empty header. Column widths
follow the existing resizable-table approach where practical, subject to the dialog-width decision in OQ-3.

| Description | UI (Mockup) | API / Logic |
| --- | --- | --- |
| `Endpoints`: render the source operation title on the first line and its type chip with path, method, or channel metadata on the second line. Show the deprecated badge when applicable. | TBD | Reuse `OperationTitleWithMeta`, as `OperationListItem.tsx` does. Supply a normalized `Operation` object and an operation link. Link destination and multi-endpoint behavior require OQ-7. |
| `Migrated From`: render the source package version as a link. | TBD | Use the source package and version identifiers from the migration record. Display text and destination require OQ-6 and OQ-7. |
| `Migrated To`: render the target package version as a link. | TBD | Use the target package and version identifiers from the migration record. Display text and destination require OQ-6 and OQ-7. |
| `Target Endpoints`: render target operations with the same title, metadata, tooltip, link, and deprecated-badge treatment as `Endpoints`. | TBD | Reuse `OperationTitleWithMeta`. Supply normalized target operations and links. |
| `Comment`: render comment text with ellipsis when the cell overflows and expose the full text through a tooltip. An absent comment renders an empty cell. | TBD | Reuse `TextWithOverflowTooltip` with the comment as both content and tooltip text. |
| `Last Modified`: render two lines. The first line uses primary text and `MMM DD, YYYY` format; the second uses secondary text and the modifying user's display name, for example `User Userovich`. | TBD | Format `lastModifiedAt` for display and render `lastModifiedBy.name`. Date timezone, day padding, and missing-user behavior require OQ-9. |
| Technical controls: render `Edit Migration` and `Cancel Migration` icon buttons with those tooltip labels. | TBD | Reuse the shared pen-shaped `EditIcon`, sized to match the row controls. Add the supplied cancel-migration SVG as a new icon because no matching shared icon exists. |
| Do nothing when the user clicks either row action in the first iteration. | TBD | Do not open a form, remove a row, send a request, or change dirty state. |
| Show skeleton rows during initial loading, a placeholder when no records match, and an error state if a query fails. | TBD | Follow `OperationGroupTable` skeleton and `Placeholder` conventions. Exact empty/error copy and retry behavior require OQ-11. |
| Recalculate only the active tab when its query inputs change. Switching tabs selects the other dataset and displays its own loading, empty, error, and loaded state. | TBD | Keep `direction` in the query key. Avoid sharing filtered rows between the two query results. |
| Build the table with the established MUI and TanStack Table pattern used by `OperationGroupTable`. | TBD | Reuse `CustomTableHeadCell`, `ColumnDelimiter`, and `useColumnsSizing` if the final dialog dimensions support resizable columns. |

### Use Case 5: Filter sidebar and sorting

The filter sidebar appears between the left edge of the active tab content and the table only after the user clicks the
toolbar filter button. The table occupies the remaining width. Reuse the visual sidebar patterns from
`OperationsNavigation`, `VersionContractsSubPage`, `SidebarPanel`, and `LayoutWithSidebar`; do not embed the complete
`VersionContractsPanel`, because it would duplicate the toolbar and unrelated view controls.

| Description | UI (Mockup) | API / Logic |
| --- | --- | --- |
| Show the `Migrated From` accordion with an `Autocomplete` labeled `Filter by This Package Version`. | TBD | Load versions of the current package through a stub hook. Selection is optional and clearable. The revision and status scope requires OQ-10. |
| Show the `Migrated to` accordion with `Filter by Target Package` and `Filter by Target Version` Autocompletes. Use the exact lowercase `to` in this accordion title as requested. | TBD | Load target packages and target versions through separate stub hooks. |
| Disable `Filter by Target Version` until a target package is selected. When the target package changes or clears, clear the selected target version and reload or clear its options. | TBD | Enable the target-version query only when `targetPackageKey` exists. Include that key in its query key. |
| Show the `General Filters` accordion with an input calendar labeled `Filter by Last Modified`. | TBD | Reuse the Portal `DatePicker` range pattern with MUI `TextField` and `CalendarIcon`. A single selected date becomes an equal start and end boundary; a range becomes two boundaries. |
| Allow the user to select either one date or a date range and to clear the calendar value. | TBD | Convert selected dates to the future request's date-range fields. Inclusive boundaries and timezone require OQ-12. |
| Add a MUI `Select` labeled `Filter by Deprecated` under the calendar, with exactly `All`, `Yes`, and `No`. | TBD | Default to `All`. Map the selection to the future deprecated query parameter; its operation scope requires OQ-8. |
| Show a final `Sort By` section without an accordion. Place `Newest first` and `Oldest first` in one radio group. | TBD | Follow the `RadioGroup` and `FormControlLabel` pattern from `ExportSettingsForm.tsx`. Default to `Newest first`. |
| Apply a field change without an Apply button. The selected value is visible immediately; the table query updates after 500ms without another relevant change. | TBD | Use `react-hook-form` watchers with `useDebounce`, following `GlobalSearchPanel/SearchFilters.tsx`. Include every effective filter and sort value in the migration query key. |
| Reset pagination whenever search, a filter, or sort changes. A target-package change produces one effective query state after it also clears the dependent target version. | TBD | Combine dependent form updates before running the debounced query update to avoid an intermediate request with a stale target version. |
| Changing sidebar visibility, expanding an accordion, or switching tabs does not mark the migration form dirty. | TBD | Keep view state separate from future add/edit form state. |
| Hide the sidebar when the user clicks the filter button again. Preserve its field values and continue applying them to the table while hidden. | TBD | Visibility is not a filter reset. OQ-5 confirms whether visibility and values are shared across tabs. |

### Use Case 6: Stub query hooks and client data model

Use TanStack Query hooks with stable query keys, following `useOperations` and the package/version hooks used by
`SearchFilters`. The first iteration returns stubs from `queryFn` and does not call `portalRequestJson`.

| Hook | Inputs | First-iteration behavior | Future replacement |
| --- | --- | --- | --- |
| `useMigratedOperationsCount` | Current package and version | Returns a fixed numeric stub and standard loading/error state. | Replace only the query function with the count endpoint defined by OQ-2. |
| `useMigratedOperations` | Current package and version, direction, debounced search, filters, sort, and pagination | Returns direction-specific stub rows. Applies search, filters, and sorting locally so every toolbar and sidebar control recalculates the table. | Replace local selection with the list endpoint and retain the complete query key. |
| `useMigrationSourceVersions` | Current package | Returns stub versions of the current package. | Call the existing or new package-versions endpoint confirmed by OQ-10. |
| `useMigrationTargetPackages` | Current package and version, optional autocomplete text | Returns stub target packages. | Call the target-package options endpoint with the same inputs. |
| `useMigrationTargetVersions` | Selected target package, optional autocomplete text | Returns no options until a package is selected, then returns its stub versions. | Call the target-version options endpoint for the selected package. |

The client-side migration record needs the following logical data. These names describe UI needs and are not an agreed
backend contract.

| Field | Contents |
| --- | --- |
| `id` | Stable migration record identifier used as the table row key. |
| `sourcePackage` | Source package key, display name, and version key or display label. |
| `targetPackage` | Target package key, display name, and version key or display label. |
| `sourceOperations` | Normalized source `Operation` data, including identifiers required for links. |
| `targetOperations` | Normalized target `Operation` data, including identifiers required for links. |
| `comment` | Optional comment text. |
| `lastModifiedAt` | Timestamp used for display, date filtering, and sorting. |
| `lastModifiedBy` | User identifier and display name. |

### First-iteration acceptance criteria

- The new button appears immediately before `Copy` and displays the supplied icon and a numeric stub count.
- Clicking the button opens a modal titled `Migrated Operations` with a top-right close button.
- `Migrated From` is selected initially and shows the requested info tooltip.
- Both tabs render distinct stub datasets with all seven columns in the requested order.
- Endpoint cells use `OperationTitleWithMeta`; comments use `TextWithOverflowTooltip`; last-modified cells have two
  lines.
- Edit and cancel row controls show their tooltips and have no other effect. `Add Migration` also has no effect.
- Search recalculates the active stub table after 500ms, including when cleared.
- The filter button shows and hides the sidebar without clearing filter values.
- All specified accordions, labels, options, radio buttons, and dependent target-version behavior are present.
- Search, filter, and sort changes reset the active table's pagination and recalculate its stub data after debouncing.
- A clean close dismisses the dialog. The guarded dirty-close path opens the custom confirmation and preserves state on
  cancel; exit discards state and closes both dialogs.
- No first-iteration control sends a backend request or mutates a migration.

## Backend

### API Contract Changes

The first iteration has no backend contract changes. The following capabilities must be defined before replacing stubs;
exact methods, paths, request parameter names, and response schemas remain TBD.

| Capability | Required behavior |
| --- | --- |
| Migration count | Return the count for the current package version with the semantics decided in OQ-2. |
| Migration list | Support direction, endpoint/comment search, all sidebar filters, last-modified sorting, and the pagination model decided in OQ-13. Return enough operation and package data to render links without per-row requests. |
| Source version options | Return versions of the current package with the scope decided in OQ-10. |
| Target package options | Return packages available as migration targets for the current context and autocomplete search text. |
| Target version options | Return versions for the selected target package with the scope decided in OQ-10. |

### Component: portal-backend

No `portal-backend` change belongs to the first UI iteration. The future implementation must define direction semantics,
deprecated filtering, inclusive date boundaries, stable last-modified sorting, pagination totals, and permission checks.
It must also define whether migration count and list results come from one endpoint or separate endpoints.

## Mockups

Figma mockups: TBD. The first layout uses these repository references:

| Reference | Reused behavior |
| --- | --- |
| [Version toolbar](../../packages/portal/src/routes/root/PortalPage/VersionPage/VersionPageToolbar.tsx) | Action placement and neighboring buttons. |
| [Copy version button](../../packages/portal/src/routes/root/PortalPage/VersionPage/CopyPackageVersionButton.tsx) | Outlined button and `startIcon` pattern. |
| [Operation groups card](../../packages/portal/src/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/OperationGroupsCard/OperationGroupsCard.tsx) | Event-bus entry point. |
| [Operation group parameters popup](../../packages/portal/src/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/OperationGroupsCard/OperationGroupParametersPopup.tsx) | `PopupDelegate` consumer and default dialog dimensions. |
| [Dialog form](../../packages/shared/src/components/DialogForm.tsx) | Modal composition and sizing behavior. |
| [Confirmation dialog](../../packages/shared/src/components/ConfirmationDialog/ConfirmationDialog.tsx) | Title close button, content, error action, and cancel action layout. |
| [Global search results](../../packages/portal/src/routes/root/BasePage/GlobalSearchPanel/SearchResults.tsx) | MUI tabs. |
| [Global search filters](../../packages/portal/src/routes/root/BasePage/GlobalSearchPanel/SearchFilters.tsx) | Autocompletes, dependent options, date range, and debounced form application. |
| [Rich filters layout](../../packages/shared/src/components/PageLayouts/RichFiltersLayout.tsx) and [layout with sidebar](../../packages/shared/src/components/PageLayouts/LayoutWithSidebar.tsx) | Filter toggle and sidebar positioning. |
| [Operation list item](../../packages/portal/src/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/EditOperationGroupContentDialog/internal/components/OperationListItem.tsx) | `OperationTitleWithMeta` usage. |
| [Operation group table](../../packages/portal/src/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/OperationGroupsCard/OperationGroupTable.tsx) | TanStack Table, skeletons, overflow text, and resizable columns. |

## Open Questions

1. **OQ-1: Entry-point visibility and permissions.** Is `Migration` available for packages only or also for dashboards?
   Which package versions, revisions, API types, and user roles can see it? Should read-only users see `Add Migration`,
   `Edit Migration`, and `Cancel Migration`, and should those controls be hidden or disabled when mutation is forbidden?
2. **OQ-2: Count semantics and zero state.** Does `%amount%` count migration records or individual operations? Is it the
   combined count for both directions, the active direction only, or another total? Is it affected by filters? Should
   the button appear for zero, and what should it display while loading or after a count error?
3. **OQ-3: Dialog dimensions.** Should the first iteration retain the reference dialog's default 600px maximum width,
   or does the seven-column table require an explicit wider width and height? Should the table scroll horizontally,
   should the sidebar be resizable, and should columns be user-resizable inside the dialog?
4. **OQ-4: Calendar library.** The Portal reference uses `react-multi-date-picker` with MUI `TextField`, while the
   requirement asks for an MUI calendar. Is the existing Portal component acceptable, or is MUI X Date Pickers required?
5. **OQ-5: Tab view state.** Should search, filters, sort, sidebar visibility, and accordion expansion be shared across
   tabs, as assumed here, or preserved independently for each tab? Should switching tabs trigger a fresh request even
   when the other tab's query is cached?
6. **OQ-6: Direction and link semantics.** What exact records belong to `Migrated From` and `Migrated To`? What display
   text should the `Migrated From` and `Migrated To` links show: package name, version, both, or a full package/version
   path? Should links navigate in the current tab and close the dialog, or open a new browser tab?
7. **OQ-7: Endpoint cardinality and navigation.** Can one row contain multiple source or target endpoints? If so, how
   should they be stacked and what is the row height? Should operation titles link to API Contracts, and which package,
   version, API type, and operation key identify each target?
8. **OQ-8: Deprecated filter scope.** Does `Filter by Deprecated` apply to source endpoints, target endpoints, either
   endpoint set, or a direction-dependent endpoint set? How does it interact with removed operations that have no
   current deprecated flag?
9. **OQ-9: Last-modified formatting.** Does `MMM DD, YYYY` require a two-digit day, such as `Nov 08, 2026`, or is
   `Nov 8, 2026` acceptable? Which timezone applies, and what should render when the timestamp or user name is absent?
10. **OQ-10: Version and package option scope.** Should source and target version options include drafts, releases,
    archived versions, and all revisions? Can the current package also be a target? Are target packages limited by
    workspace, user access, or existing migration relationships?
11. **OQ-11: Table states.** What empty messages distinguish no migrations from no search/filter results? Should query
    errors appear inside the table, in a global notification, or both, and is a retry control required?
12. **OQ-12: Date filtering.** Are start and end dates inclusive? Which timezone converts calendar selections into
    backend boundaries? Does selecting one date filter the entire corresponding day?
13. **OQ-13: Pagination.** Should each table use numbered pagination, infinite scrolling, or a fixed page size? What
    page size is required, and does the backend return a total record count for each direction?
14. **OQ-14: Info icon visibility.** Should the info icon remain visible in the `Migrated From` tab label while
    `Migrated To` is active, as assumed here, or appear only beside the selected `Migrated From` view header?
15. **OQ-15: Unsaved-changes scope.** Beyond the dialog close paths listed in Assumptions, must the guard also intercept
    route navigation, browser refresh, tab switching, and switching from add/edit mode back to the table? Which future
    actions count as saved and reset dirty state?
16. **OQ-16: Search semantics.** Does search match operation titles, paths, methods, channels, comments, or a subset?
    Does it search both source and target endpoints in each direction, and is matching case-insensitive and
    substring-based?
17. **OQ-17: Stub presentation.** Should the stub dataset be static and deterministic for development and tests, and is
    a simulated loading delay required to review skeleton and pending states?
