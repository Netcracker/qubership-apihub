# DI-Portal-PKGVER-026 Browser Page Title and History

**Design Item ID**: DI-Portal-PKGVER-026  
**Design Item Name**: Browser Page Title and History  
**Related Design Items**: -  
**Related API**: -

**Revision History:**

| Date | Description |
| ---- | ----------- |
| | |

***

## Description

APIHUB Portal and APIHUB Agent are single-page applications. The browser tab title comes from `document.title` and
stays **APIHUB** or **APIHUB Agent** for almost every screen. The URL changes on navigation, but the title does not,
so **Back** and **Forward** in the browser history list identical labels and do not show where the user was.

This design sets **`document.title` on each meaningful route** in Portal and Agents using a fixed pattern: page context,
then optional package or version details, then a product suffix. **Redirect-only** navigations (`replace`) do not set a
dedicated title.

## Start Point

1. User opens APIHUB Portal or APIHUB Agent in the browser (any supported route after login or on the login page).

## Execution

1. **Title format**
   - Separate **context segments** with a middle dot: ` · ` (space-dot-space).
   - Append the **product name** once at the end: suffix `| APIHUB` on Portal and `| APIHUB Agent` on Agents (one space
     before `|` in the rendered title).
   - Order segments from **specific to general** before the suffix (for example operation → API type → package →
     version).
   - Use **package or dashboard display name only** in titles, not parent group or workspace path (long names are
     truncated by the browser).
2. **`{version}` segment** (everywhere a version appears in the title)
   - **Latest revision** of the version name: show the version name only (for example `2025.3`).
   - **Older revision** open in the UI: append `@{revision}` (same as the toolbar `VersionTitle`, `@` is
     `REVISION_DELIMITER`).
3. **API type label** on routes whose path includes `:apiType` (Contracts, API Changes, Deprecated, API Quality,
   operation detail, and similar)
   - Include the human-readable type from `API_TYPE_TITLE_MAP` / contract maps (for example `REST API`, `MCP`, `DDL`).
   - Do **not** add an API type segment on overview, documents, or package settings routes (no `:apiType` in the path).
4. **While data is loading** (package name, operation title, document title, and similar)
   - Set a **short title** without unresolved placeholders (for example `Summary | APIHUB`, `Contracts · REST API | APIHUB`).
   - When data is available, update to the **full template** for that route (see appendix).
5. **Configure version** (`…/:versionId/edit`)
   - Package: `Configure Version · {Package name} · {version} | APIHUB`.
   - Dashboard: `Configure Dashboard · {Dashboard name} · {version} | APIHUB`.
6. **Compare flows** (`…/:versionId/compare…`, group compare, operation compare)
   - Use `Compare {prev} → {version}` (or the group-compare variant) with the same **`@revision` rules** as in step 2
     when a side is not the latest revision.
7. **Documents on a dashboard** when the user selects a referenced package (`ref` query parameter)
   - `{Package name}` in the title is the **dashboard** from the URL, not the referenced package name.
8. **Agents welcome**
   - `/agents` without `:agentId`: `Select Namespace | APIHUB Agent` (no agent segment).
   - With `:agentId`: include `{agent}` as in the appendix.
9. User navigates with browser **Back** or **Forward**
   - The tab title matches the **restored route** (each history entry keeps the title set when the user visited that
     URL).
10. User lands on an unknown route
    - Title: `Page Not Found | APIHUB` or `Page Not Found | APIHUB Agent` (unchanged error page behavior aside from
      title).

Implementation should use one shared mechanism in `ui-shared` (for example a hook) so Portal and Agents stay
consistent; restore the previous title on unmount when switching routes.

## Mockup

No separate UI mockup; behavior is the browser tab title and history labels only.

## Appendix: title by route

### Portal (`APIHUB`)

| Route | Title template |
| ----- | -------------- |
| `/login` | `Log In \| APIHUB` |
| `/portal/favorite` | `Favorite \| APIHUB` |
| `/portal/shared` | `Shared \| APIHUB` |
| `/portal/private` | `Private \| APIHUB` |
| `/portal/workspaces` | `Workspaces \| APIHUB` |
| `/portal/workspaces/:workspaceKey` | `{Workspace name} · Workspace \| APIHUB` |
| `/portal/groups/:groupId` | `{Group name} · Group \| APIHUB` |
| `/portal/settings/roles` | `User Roles · Portal Settings \| APIHUB` |
| `/portal/settings/hierarchy` | `Roles Hierarchy · Portal Settings \| APIHUB` |
| `/portal/settings/sysadms` | `System Administrators · Portal Settings \| APIHUB` |
| `/portal/settings/tokens` | `System Tokens · Portal Settings \| APIHUB` |
| `/portal/settings/rulesets` | `API Quality Rulesets · Portal Settings \| APIHUB` |
| `/portal/profile/personal-access-tokens` | `Personal Access Tokens · Profile \| APIHUB` |
| `/portal/packages/:packageId` | `{Package name} \| APIHUB` |
| `…/@/settings/general` | `General · {Package name} Settings \| APIHUB` |
| `…/@/settings/configuration` | `API Specific Configuration · {Package name} Settings \| APIHUB` |
| `…/@/settings/export` | `Export Settings · {Package name} Settings \| APIHUB` |
| `…/@/settings/versions` | `Versions · {Package name} Settings \| APIHUB` |
| `…/@/settings/tokens` | `Access Tokens · {Package name} Settings \| APIHUB` |
| `…/@/settings/members` | `User Access Control · {Package name} Settings \| APIHUB` |
| `…/:versionId/overview/summary` | `Summary · {Package name} · {version} \| APIHUB` |
| `…/:versionId/overview/activity-history` | `Activity History · {Package name} · {version} \| APIHUB` |
| `…/:versionId/overview/revision-history` | `Revision History · {Package name} · {version} \| APIHUB` |
| `…/:versionId/overview/groups` | `Operation Groups · {Package name} · {version} \| APIHUB` |
| `…/:versionId/overview/packages` (dashboard) | `Packages · {Dashboard name} · {version} \| APIHUB` |
| `…/:versionId/operations/:apiType` | `Contracts · {REST API} · {Package name} · {version} \| APIHUB` |
| `…/:versionId/operations/:apiType/:operationId` | `{Operation title} · {REST API} · {Package name} · {version} \| APIHUB` |
| `…/:versionId/operations/mcp/:operationId` | `{Entity title} · MCP · {Package name} · {version} \| APIHUB` |
| `…/:versionId/operations/ddl/:operationId` | `{Table name} · DDL · {Package name} · {version} \| APIHUB` |
| `…/:versionId/changes/:apiType` | `API Changes · {REST API} · {Package name} · {version} \| APIHUB` |
| `…/:versionId/deprecated/:apiType` | `Deprecated · {REST API} · {Package name} · {version} \| APIHUB` |
| `…/:versionId/api-quality/:apiType` | `API Quality · {REST API} · {Package name} · {version} \| APIHUB` |
| `…/:versionId/documents` | `Documents · {Package name} · {version} \| APIHUB` |
| `…/:versionId/documents/:documentId` | `{Document title} · Documents · {Package name} · {version} \| APIHUB` |
| `…/:versionId/documents/:documentId/preview` | `{Document title} · Preview · {Package name} · {version} \| APIHUB` |
| `…/:versionId/compare?…` | `Compare {prev version} → {version} · {Package name} \| APIHUB` |
| `…/:versionId/compare/:apiType/:operationId` | `{Operation title} · Compare {prev} → {version} · {Package name} \| APIHUB` |
| `…/:versionId/groups/:group/compare` | `Compare Groups {group A} → {group B} · {Package name} · {version} \| APIHUB` |
| `…/:versionId/groups/:group/compare/:apiType/:operationId` | `{Operation title} · Compare Groups · {Package name} · {version} \| APIHUB` |
| `…/:versionId/edit` (package) | `Configure Version · {Package name} · {version} \| APIHUB` |
| `…/:versionId/edit` (dashboard) | `Configure Dashboard · {Dashboard name} · {version} \| APIHUB` |
| unknown | `Page Not Found \| APIHUB` |

Paths under `/portal/packages/:packageId` use the `@` settings prefix and `:versionId` as in the Portal router.
`{REST API}` stands for the mapped label for the route `apiType`. Operation title falls back to operation key when
title is missing.

Redirects (`/`, `/portal`, `…/:versionId` without a tab) use `replace` and are excluded from this table.

### Agents (`APIHUB Agent`)

| Route | Title template |
| ----- | -------------- |
| `/login` | `Log In \| APIHUB Agent` |
| `/agents` | `Select Namespace \| APIHUB Agent` |
| `/agents/:agentId` | `Select Namespace · {agent} \| APIHUB Agent` |
| `…/:namespaceKey/services` | `Services · {namespace} · {agent} \| APIHUB Agent` |
| `…/:namespaceKey/snapshots` | `Snapshots · {namespace} · {agent} \| APIHUB Agent` |
| `…/:namespaceKey/automation` | `Automation · {namespace} · {agent} \| APIHUB Agent` |
| `…/:namespaceKey/authentication-report` | `Authentication Report · {namespace} · {agent} \| APIHUB Agent` |
| `…/:namespaceKey/routing-report` | `Routing Report · {namespace} · {agent} \| APIHUB Agent` |
| unknown | `Page Not Found \| APIHUB Agent` |
