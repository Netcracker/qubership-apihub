# Design items

A design item describes how one feature of APIHUB behaves: its purpose, the actors, the flow, the rules, and the API
it uses. Design items are the specification that the Portal, the backend, and the agent implement and that tests check.
Each item is one Markdown file in the folder of its area. Files change together with the behavior they describe.

## Areas

Each area has a folder. The links below open the folder; the lists after the ID scheme name every item.

- [General features](./general/): Navigation, workspaces, groups, packages, favorites, shared packages, activity
  history, search.
- [Package version](./package-version/): What a user sees and does in a published package version: operations,
  documents, exports, history, quality.
- [Package settings](./package-settings/): Settings of a package: general, versions list, access tokens, release version
  rules, preserved OAS extensions.
- [Global settings](./global-settings/): System-wide administration: roles, system tokens, business metrics, rulesets,
  version validation.
- [Operation view](./operation-view/): Rendering and trying out a single operation: schema rendering, playground,
  examples panel.
- [Comparison](./comparison/): Severity of changes and the API changes view.
- [Dashboard version](./dashboard-version/): Configuring and editing dashboard versions.
- [User settings](./user-settings/): Settings of the current user, such as personal access tokens.
- [Custom OpenAPI extensions](./custom-openapi-extensions/): APIHUB-specific OpenAPI extensions, such as
  `x-api-audience`.
- [VS Code extension](./vscode-extension/): Publishing to the Portal from VS Code.
- [Agent](./agent/): Behavior of the APIHUB agent: version validation and cloud services.
- [Contract types](./contract-types/): Design pages for contract types. Today: AsyncAPI.

## ID scheme

An ID has the form `DI-<Product>-<AREA>-<NNN>`:

- `<Product>` is `Portal` or `Agent`.
- `<AREA>` is the area code from the table below. Agent items have no area code: `DI-Agent-<NNN>`.
- `<NNN>` is a three-digit number, counted per area, starting at `001`. A number is never reused, even after the item
  is deleted.

The next free number is computed from every ID that appears in a title or in a body in this folder.

| Area | Code | Folder | Items | Next free number |
|------|------|--------|-------|------------------|
| General features | GF | `general/` | 12 | `DI-Portal-GF-011` |
| Package version | PKGVER | `package-version/` | 24 | `DI-Portal-PKGVER-025` |
| Package settings | PS | `package-settings/` | 7 | `DI-Portal-PS-008` |
| Global settings | GS | `global-settings/` | 7 | `DI-Portal-GS-009` |
| Operation view | OPVIEW | `operation-view/` | 3 | `DI-Portal-OPVIEW-004` |
| Comparison | COMP | `comparison/` | 3 | `DI-Portal-COMP-004` |
| Dashboard version | DSHVER | `dashboard-version/` | 2 | `DI-Portal-DSHVER-003` |
| User settings | US | `user-settings/` | 1 | `DI-Portal-US-002` |
| Custom OpenAPI extensions | COE | `custom-openapi-extensions/` | 1 | `DI-Portal-COE-002` |
| VS Code extension | VCE | `vscode-extension/` | 1 | `DI-Portal-VCE-002` |
| Agent | - | `agent/` | 2 | `DI-Agent-003` |
| Contract types | - | `contract-types/` | 3 | no IDs |

`PKGVER-021` is reserved: the "AI Recommendations Tab" item has an ID but its page is not in the repository yet.
`GS-008` is reserved for the planned "Search Scope for GraphQL Operations" item, which has no page yet. Items can be
referenced by ID before their page exists; the numbers still count as used.

## File naming

Name a file `<id>-<slug>.md`, in lowercase ASCII with hyphens, for example
`package-version/di-portal-pkgver-011-list-of-operations.md`. The slug is the item name. A page that is not a numbered
design item keeps a plain slug, such as `global-settings/ruleset-severity-downgrade.md`.

## Template for a new design item

Copy this header block and fill it in. The file starts with one H1 that repeats the ID and the name. Put the sections
below the block at the second level (`##`).

```markdown
# DI-Portal-<AREA>-<NNN> <Item name>

**Design Item ID**: DI-Portal-<AREA>-<NNN>  
**Design Item Name**: <Item name>  
**Related Design Items**:  
  - [DI-Portal-<AREA>-<NNN>: <Name>](<file name>.md)  

**Related API**:  
  - <What the call does> (<METHOD> /api/v<N>/<path>)

**Revision History:**  

| Date | Description |
| ---- | ----------- |
| <YYYY-MM-DD> | <What changed> |

***

## Description

<What the feature does and for whom.>

## Start point

<How the user reaches the feature.>

## Flow

<Steps, rules, and error cases.>
```

Use `-` after `Related Design Items:` and `Related API:` when there is nothing to list.

## Items by area

### General features

- Navigation to APIHUB (log in - log out) ([GF-001](./general/di-portal-gf-001-navigation-to-apihub-log-in-log-out.md))
- Create Workspace ([GF-002](./general/di-portal-gf-002-create-workspace.md))
- Create Group ([GF-003](./general/di-portal-gf-003-create-group.md))
- Create Package ([GF-004](./general/di-portal-gf-004-create-package.md))
- Favorite packages, dashboards, groups, workspaces
  ([GF-005](./general/di-portal-gf-005-favorite-packages-dashboards-groups-workspaces.md))
- Shared Packages ([GF-006](./general/di-portal-gf-006-shared-packages.md))
- Activity History in Main Page ([GF-007](./general/di-portal-gf-007-activity-history-in-main-page.md))
- Personal Private Workspace ([GF-008](./general/di-portal-gf-008-personal-private-workspace.md))
- Relevance of API-Processor Versions ([GF-009](./general/di-portal-gf-009-relevance-of-api-processor-versions.md))
- Global Search v4 (newer revision of GF-010) ([GF-010](./general/di-portal-gf-010-global-search-v4.md))
- Global Search ([GF-010](./general/di-portal-gf-010-global-search.md))
- Search Scope for REST API ([GS-007](./general/di-portal-gs-007-search-scope-for-rest-api.md))

### Package version

- Version Summary ([PKGVER-001](./package-version/di-portal-pkgver-001-version-summary.md))
- Revision History ([PKGVER-002](./package-version/di-portal-pkgver-002-revision-history.md))
- Package Activity History ([PKGVER-003](./package-version/di-portal-pkgver-003-package-activity-history.md))
- Manage Manual Operations Group
  ([PKGVER-004](./package-version/di-portal-pkgver-004-manage-manual-operations-group.md))
- Export Operations Group (reduced source specifications)
  ([PKGVER-005](./package-version/di-portal-pkgver-005-export-operations-group-reduced-source-specifications.md))
- Export Operations Group (combined specification)
  ([PKGVER-006](./package-version/di-portal-pkgver-006-export-operations-group-combined-specification.md))
- Search and Filter Operations ([PKGVER-007](./package-version/di-portal-pkgver-007-search-and-filter-operations.md))
- Export List of Operations in Excel
  ([PKGVER-008](./package-version/di-portal-pkgver-008-export-list-of-operations-in-excel.md))
- List of Operations Groups ([PKGVER-009](./package-version/di-portal-pkgver-009-list-of-operations-groups.md))
- Manage REST Path Prefix Group ([PKGVER-010](./package-version/di-portal-pkgver-010-manage-rest-path-prefix-group.md))
- List of Operations ([PKGVER-011](./package-version/di-portal-pkgver-011-list-of-operations.md))
- Activity History ([PKGVER-012](./package-version/di-portal-pkgver-012-activity-history.md))
- Export List of Changes in Excel
  ([PKGVER-013](./package-version/di-portal-pkgver-013-export-list-of-changes-in-excel.md))
- List of Deprecated Operations ([PKGVER-014](./package-version/di-portal-pkgver-014-list-of-deprecated-operations.md))
- Human-readable description for deprecated items for OpenAPI 3.0
  ([PKGVER-015](./package-version/di-portal-pkgver-015-human-readable-description-for-deprecated-items-for-openapi-3-0.md))
- List of Documents ([PKGVER-016](./package-version/di-portal-pkgver-016-list-of-documents.md))
- Copy Package Version ([PKGVER-017](./package-version/di-portal-pkgver-017-copy-package-version.md))
- Export Package Version ([PKGVER-018](./package-version/di-portal-pkgver-018-export-package-version.md))
- API Quality Validation Result ([PKGVER-019](./package-version/di-portal-pkgver-019-api-quality-validation-result.md))
- Export of discrepancy analysis results for arbitrary package versions in Excel
  ([PKGVER-020](./package-version/di-portal-pkgver-020-export-of-discrepancy-analysis-results-for-arbitrary-package-versions-in-excel.md))
- OpenAPI Document Overview ([PKGVER-022](./package-version/di-portal-pkgver-022-openapi-document-overview.md))
- Export Document from Package Version
  ([PKGVER-023](./package-version/di-portal-pkgver-023-export-document-from-package-version.md))
- Export List of Deprecated Operations in Excel
  ([PKGVER-024](./package-version/di-portal-pkgver-024-export-list-of-deprecated-operations-in-excel.md))
- [Document Shareability](./package-version/document-shareability.md)

### Package settings

- General Settings ([PS-001](./package-settings/di-portal-ps-001-general-settings.md))
- Package versions list ([PS-002](./package-settings/di-portal-ps-002-package-versions-list.md))
- Access Tokens Management ([PS-003](./package-settings/di-portal-ps-003-access-tokens-management.md))
- Delete Package ([PS-004](./package-settings/di-portal-ps-004-delete-package.md))
- Default Release Version ([PS-005](./package-settings/di-portal-ps-005-default-release-version.md))
- Define Release Version Pattern ([PS-006](./package-settings/di-portal-ps-006-define-release-version-pattern.md))
- Configure List of OAS Extensions Preserved on Export
  ([PS-007](./package-settings/di-portal-ps-007-configure-list-of-oas-extensions-preserved-on-export.md))

### Global settings

- Manage Roles ([GS-001](./global-settings/di-portal-gs-001-manage-roles.md))
- Manage System Tokens ([GS-002](./global-settings/di-portal-gs-002-manage-system-tokens.md))
- Roles Hierarchy ([GS-003](./global-settings/di-portal-gs-003-roles-hierarchy.md))
- Business Metrics ([GS-004](./global-settings/di-portal-gs-004-business-metrics.md))
- Ruleset Management for API Quality Check
  ([GS-005](./global-settings/di-portal-gs-005-ruleset-management-for-api-quality-check.md))
- Version Validation ([GS-006](./global-settings/di-portal-gs-006-version-validation.md))
- [Ruleset Severity Downgrade](./global-settings/ruleset-severity-downgrade.md)

### Operation view

- REST Operation Schema Rendering in Doc View
  ([OPVIEW-001](./operation-view/di-portal-opview-001-rest-operation-schema-rendering-in-doc-view.md))
- Playground ([OPVIEW-002](./operation-view/di-portal-opview-002-playground.md))
- Examples panel ([OPVIEW-003](./operation-view/di-portal-opview-003-examples-panel.md))

### Comparison

- Semi-breaking severity of changes ([COMP-001](./comparison/di-portal-comp-001-semi-breaking-severity-of-changes.md))
- Severity of Changes ([COMP-002](./comparison/di-portal-comp-002-severity-of-changes.md))
- API Changes ([COMP-003](./comparison/di-portal-comp-003-api-changes.md))

### Dashboard version

- Configure dashboard version from scratch
  ([DSHVER-001](./dashboard-version/di-portal-dshver-001-configure-dashboard-version-from-scratch.md))
- Edit dashboard version ([DSHVER-002](./dashboard-version/di-portal-dshver-002-edit-dashboard-version.md))

### User settings

- Manage Personal Access Tokens ([US-001](./user-settings/di-portal-us-001-manage-personal-access-tokens.md))

### Custom OpenAPI extensions

- API Audience (x-api-audience)
  ([COE-001](./custom-openapi-extensions/di-portal-coe-001-api-audience-x-api-audience.md))

### VS Code extension

- Publish to Portal from VS Code ([VCE-001](./vscode-extension/di-portal-vce-001-publish-to-portal-from-vs-code.md))

### Agent

- Version Validation ([Agent-001](./agent/di-agent-001-version-validation.md))
- Cloud Services ([Agent-002](./agent/di-agent-002-cloud-services.md))

### Contract types

- [AsyncAPI 3.0 - DocView](./contract-types/asyncapi-doc-view.md)
- [AsyncAPI Publishing](./contract-types/asyncapi-publishing.md)
- [AsyncAPI](./contract-types/asyncapi.md)
