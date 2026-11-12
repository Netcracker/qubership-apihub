# DI-Portal-PKGVER-025 Version List Sorting in Version Selector

**Design Item ID**: DI-Portal-PKGVER-025  
**Design Item Name**: Version List Sorting in Version Selector  
**Related Design Items**: -  
**Related API**:

- Get package versions list (GET /api/v3/packages/{packageId}/versions)

**Revision History:**

| Date | Description |
| ---- | ----------- |
| | |

***

## Description

The version selector popup (Release and Draft tabs) lists package versions for the user to open a version from the
toolbar. Today the list order is fixed per tab and a sort indicator on a column header does not let the user change
sort mode.

This design adds a **sort dropdown** to the right of **Search**, removes sort arrows from table headers, remembers the  
user’s sort choice **per package** in **browser local storage**, and loads rows through  
`GET /api/v3/packages/{packageId}/versions` with matching `sortBy` and `sortOrder` query parameters.

## Start Point

1. User navigates to APIHUB Portal → workspace → group → package → version page (toolbar shows the current version).
2. User opens the **version selector** popup from the toolbar.

## Execution

1. User opens the version selector popup.
   - The popup shows **Release** and **Draft** tabs, **Search**, a **sort dropdown** (to the right of Search), and a
    table with columns **Version**, **Publication Date**, and **Labels**.
   - Table headers do **not** show sort arrow icons (remove the current Release/Draft header arrows).
2. **Default sort** when the user has no saved preference for this package in local storage:
   - The sort dropdown displays **Publication Date (Newest)**.
   - The Portal requests the version list with `sortBy=firstPublishedAt` and `sortOrder=desc`.
   - **Publication Date (Newest)** and **Publication Date (Oldest)** sort by the publication time of the **first
   revision** of each version name; publishing a new revision does **not** change list position for these options.
3. User opens the sort dropdown and selects an option.

   | Dropdown label (UI) | `sortBy` | `sortOrder` |
   | ------------------- | -------- | ----------- |
   | Publication Date (Newest) | `firstPublishedAt` | `desc` |
   | Publication Date (Oldest) | `firstPublishedAt` | `asc` |
   | Last revision date (Newest) | `createdAt` | `desc` |
   | Last revision date (Oldest) | `createdAt` | `asc` |
   | Version Name (A–Z) | `version` | `asc` |
   | Version Name (Z–A) | `version` | `desc` |

   - API to load versions — GET /api/v3/packages/{packageId}/versions:
     - `packageId` = current package
     - `status` = `release` or `draft` according to the active tab (comma-separated filter as today)
     - `textFilter` = Search value when the user typed in Search
     - `sortBy`, `sortOrder` = values from the selected row in the table above
     - `limit`, `page` = paging as today
   - The **Publication Date** column shows the **latest revision** publication time (`createdAt` on each list item);
   only row **order** follows the selected sort key.
4. User changes the sort selection.
   - The Portal reloads the list with the new query parameters.
   - The Portal stores `{ sortBy, sortOrder }` in **local storage** keyed by package id (for example
   `apihub.versionListSort.{packageId}`) when the selection changes.
   - The same stored sort applies to **Release** and **Draft** tabs for that package.
5. **Empty tab** (no versions for the active status).
   - When the list for the active tab is empty after load (not while loading), the popup shows **No versions to
    display** (unchanged).
   - The sort dropdown is **disabled** (greyed out; the user cannot open it).
   - When the tab has at least one version, the sort dropdown is **enabled**.
6. User switches tab or uses Search.
   - Tab change still filters by `status`; Search still uses `textFilter`; sort remains the stored value or the UI
    default from step 2.
7. User clicks a version row.
   - The Portal navigates to the version overview and closes the popup (unchanged).

User must have **read** access to the package to list versions (unchanged).

## Mockup

[Figma — Version list sorting in version selector](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7682-147296)
