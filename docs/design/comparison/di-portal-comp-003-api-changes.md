**Design Item ID**: DI-Portal-COMP-003  
**Design Item Name**: Compare API Changes  
**Related Design Items**:

- [DI-Portal-PKGVER-010 Manage REST Path Prefix Group](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90010-Manage-REST-Path-Prefix-Group)

**Related API**:

- Get list of changed operations (GET /api/v4/packages/{packageId}/versions/{version}/{apiType}/changes)

**Revision History:**

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Assumptions

- The API Changes tab is only available for package versions that have a previous release version. If no previous release version exists, the API Changes tab is disabled.
- Compare Revisions is only available if the package version has multiple revisions.
- Compare REST Groups is only available if REST Path Prefix for Grouping by Version has been configured for the package (see DI-Portal-PKGVER-010).

# Description

The functionality allows users to view and analyze changes in REST/GraphQL operations using different comparison modes:

- **API Changes (Previous vs Current)**: Compare currently selected version with its previous release version
- **Compare Versions**: Compare any two arbitrary package versions
- **Compare Revisions**: Compare any two revisions within a single package version
- **Compare REST Groups**: Compare operations between two REST Path Prefix groups

# Start Point

1. User navigates to APIHUB Portal → specific workspace → specific group → specific package version → API Changes tab.

# Execution

## View API Changes (Previous vs Current Version)

This is the default view when user opens the API Changes tab.

1. The system displays the API Changes comparison page with the following header information:

   - **First header** (package version header):
     - Breadcrumb navigation
     - Package name and current version
     - **Compare** button with dropdown menu containing three options:
       - Versions
       - Revisions
       - REST Groups
     - Copy, Export, and other package action buttons
   - **Second header** (comparison header):
     - Title: "API changes compared to {previous release version number}"
     - API Type selector dropdown (REST API / GraphQL) - allows switching between API types if both are available
     - Changes summary with color-coded counters showing the number of operations by change severity:
       - Breaking changes (red indicator)
       - Required Attention changes (orange indicator)
       - Deprecated changes (yellow indicator)
       - Non-breaking changes (green indicator)
       - Annotation changes (purple indicator)
       - Unclassified changes (blue indicator)
     - Search field in the top-right corner to search for specific operations by name or path
     - Filter toggle button to show/hide the filter sidebar
     - Export button to download a list of changes.

2. The system displays the left sidebar with filtering options:

   - **General Filters** section (collapsible):
     - **Filter by Group**: Dropdown to filter operations by API group
     - **Filter by API Audience**: Dropdown to filter by audience type (e.g., internal, external, unknown)
     - **Filter by API Kind**: Dropdown to filter by backward compatibility policy (e.g., bwc, no-bwc)
   - **Filter by Tag** section:
     - Search field to search for specific tags
     - List of available tags that can be selected for filtering

3. The system displays the main content area with a list of changed operations in table format:

   - **Name / Path** column: Shows operation title and HTTP method badge (e.g., POST, GET), followed by the operation path
     - Operations are expandable to show detailed changes
     - For each operation, change details are displayed:
       - [Updated] Path - indicates path was modified
       - [Added] Path - indicates new path was added
       - [Deleted] Path - indicates path was removed
   - **Tag** column: Shows tags associated with the operation
   - **Audience** column: Shows the API audience (e.g., internal, external, internal external, unknown)
   - **Kind** column: Shows API kind (bwc, no-bwc, bwc no-bwc)
   - **Changes summary** column: Shows color-coded counters of changes by severity for each operation

   **Note**: When displaying changed values in any column, the system shows the old value with strikethrough text and displays the new value next to it. This applies to all fields that have been modified (e.g., operation title, path, tag, audience, kind).

   **Note**: Version numbers displayed in the comparison header are hyperlinks. When clicked, they navigate to the Summary page of the corresponding package version.

## Compare Versions

This mode allows comparing any two arbitrary package versions.

### Select Versions to Compare

1. User clicks the **Compare** button in the first header.
2. The system displays a dropdown menu with three options:
   - Versions
   - Revisions
   - REST Groups
3. User selects **Versions**.
4. The system displays "Select Versions To Compare" popup with the following fields:

   - **Previous** dropdown: Select the first version to compare
   - Swap icon (⇄) between dropdowns: Allows swapping selected versions
   - **Current** dropdown: Select the second version to compare
     - Each version in the dropdown shows its status badge (e.g., release, draft)
   - **Compare** button: Confirms selection and opens comparison page
   - **Cancel** button: Closes popup without action

5. User selects two versions from the dropdowns.
6. User clicks **Compare** button.

### View Version Comparison

1. The system opens a new comparison page with a single header containing:

   - Back button to return to previous page
   - Title: "Compare Versions"
   - First selected version number (hyperlink)
   - Swap icon (⇄): Allows swapping the compared versions
   - Second selected version number (hyperlink)
   - Edit icon (pencil): Opens "Select Versions To Compare" popup to change selected versions
   - API Type selector dropdown (REST API / GraphQL)
   - Changes summary with color-coded counters (same as in Previous vs Current view)
   - Search field
   - Filter toggle button
   - Download button with sorting options
   - Export button

2. The system displays the same left sidebar with filtering options as in Previous vs Current view.

3. The system displays the main content area with the same table structure as in Previous vs Current view.

   **Note**: Version numbers in the header are hyperlinks. When clicked, they navigate to the Summary page of the corresponding package version.

## Compare Revisions

This mode allows comparing any two revisions within a single package version.

### Select Revisions to Compare

1. User clicks the **Compare** button in the first header.
2. The system displays a dropdown menu with three options.
3. User selects **Revisions**.
4. The system displays "Select Revisions To Compare" popup with the following fields:

   - **Previous** dropdown: Select the first revision to compare
   - Swap icon (⇄) between dropdowns: Allows swapping selected revisions
   - **Current** dropdown: Select the second revision to compare
     - If a revision is the latest one, it displays "(latest)" label next to the revision identifier
   - **Compare** button: Confirms selection and opens comparison page
   - **Cancel** button: Closes popup without action

5. User selects two revisions from the dropdowns.
6. User clicks **Compare** button.

### View Revision Comparison

1. The system opens a new comparison page with a single header containing:

   - Back button to return to previous page
   - Title: "Compare Revisions"
   - First selected revision identifier (hyperlink), with "(latest)" label if applicable
   - Swap icon (⇄): Allows swapping the compared revisions
   - Second selected revision identifier (hyperlink), with "(latest)" label if applicable
   - Edit icon (pencil): Opens "Select Revisions To Compare" popup to change selected revisions
   - API Type selector dropdown (REST API / GraphQL)
   - Changes summary with color-coded counters (same as in Previous vs Current view)
   - Search field
   - Filter toggle button
   - Download button with sorting options
   - Export button

2. The system displays the same left sidebar with filtering options as in Previous vs Current view.

3. The system displays the main content area with the same table structure as in Previous vs Current view.

   **Note**: Revision identifiers in the header are hyperlinks. When clicked, they navigate to the Summary page of the corresponding package revision.

## Compare REST Groups

This mode allows comparing operations between two REST Path Prefix groups. This option is only available if REST Path Prefix for Grouping by Version has been configured for the package.

### Select REST Groups to Compare

1. User clicks the **Compare** button in the first header.
2. The system displays a dropdown menu with three options.
3. User selects **REST Groups**.
4. The system displays "Select REST Groups To Compare" popup with the following fields:

   - **Previous** dropdown: Select the first REST group to compare
   - Swap icon (⇄) between dropdowns: Allows swapping selected groups
   - **Current** dropdown: Select the second REST group to compare
   - **Compare** button: Confirms selection and opens comparison page
   - **Cancel** button: Closes popup without action

5. User selects two REST groups from the dropdowns.
6. User clicks **Compare** button.

### View REST Groups Comparison

1. The system opens a new comparison page with a single header containing:

   - Back button to return to previous page
   - Title: "Compare REST Groups"
   - Subtitle: "path prefix: {configured path prefix pattern}" (e.g., "path prefix: /api/v2/")
   - First selected group name
   - Swap icon (⇄): Allows swapping the compared groups
   - Second selected group name
   - Edit icon (pencil): Opens "Select REST Groups To Compare" popup to change selected groups
   - API Type selector dropdown (REST API / GraphQL)
   - Changes summary with color-coded counters (same as in Previous vs Current view)
   - Search field
   - Filter toggle button
   - Download button with sorting options
   - **Note**: Export button is NOT available for REST Groups comparison

2. The system displays the same left sidebar with filtering options as in Previous vs Current view.

3. The system displays the main content area with the same table structure as in Previous vs Current view.

   **Note**: REST group names in the header are NOT hyperlinks, as they do not have separate package pages.

## Common Operations (Available in All Comparison Modes)

### Expand Operation Details

1. User clicks on an operation row to expand it.
2. The system expands the row and displays detailed changes for that operation:
   - Each change is shown with an indicator:
     - [Updated] - element was modified
     - [Added] - element was newly added
     - [Deleted] - element was removed
   - Change type is indicated (e.g., Path, Request Body, Response, Parameter)
3. User can collapse the operation by clicking on it again.

### Filter Operations

1. User applies filters using the left sidebar options:
   - Selects group from the "Filter by Group" dropdown
   - Selects audience from the "Filter by API Audience" dropdown
   - Selects kind from the "Filter by API Kind" dropdown
   - Searches and selects tags from the "Filter by Tag" section
2. The system applies selected filters and displays only operations that match the filter criteria.
3. The changes summary counters in the header update to reflect the filtered results.
4. User can clear individual filters by deselecting them or clear all filters at once.

### Search Operations

1. User enters a search term in the "Search operations" field.
2. The system filters the operations list in real-time to show only operations whose name or path contains the search term.
3. The changes summary counters update to reflect the search results.

### Switch API Type

1. User clicks on the API Type dropdown (REST API / GraphQL).
2. The system displays available API types.
3. User selects a different API type.
4. The system reloads the page with changes for the selected API type.
5. The table columns adjust based on the selected API type:
   - For REST API: Method, Path
   - For GraphQL: Method (operation name), Type (query/mutation/subscription)

### Swap Compared Items

1. User clicks the swap icon (⇄) in the header.
2. The system swaps the positions of the two compared items (versions/revisions/groups).
3. The comparison results are recalculated and displayed with reversed perspective.

### Edit Compared Items

1. User clicks the edit icon (pencil) in the header.
2. The system opens the corresponding selection popup (Versions/Revisions/REST Groups).
3. User selects different items to compare.
4. User clicks **Compare** button.
5. The system updates the comparison page with the newly selected items.

# Mockups
![Standardized UI layout for API comparison pages](https://github.com/user-attachments/assets/34f7d6f6-ccd7-4e28-a88a-6cc5effc9f83)
