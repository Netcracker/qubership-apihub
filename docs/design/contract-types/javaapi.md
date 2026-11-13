# JavaAPI

|                          |                         |
| :----------------------- | :---------------------- |
| **Design Item ID**       | 13547 - JavaAPI         |
| **Design Item Name**     | JavaAPI Library Support |
| **Related Design Items** |                         |
| **Related API**          |                         |
| **Revision History**     | 09.11.2026 — Initial version (task 13547, Figma JavaAPI). |

## Summary

This design describes how APIHUB Portal supports **JavaAPI**: users register a Java **Library** against Maven coordinates,
publish artefact versions from Artifactory, and review the extracted public API and changes between versions. Analysis and
storage are handled outside the REST publishing path; the UI presents the results. JavaAPI is delivered as an optional
plugin, like API Linter.

## Assumptions

* The JavaAPI Library plugin is installed and enabled. Without it, **Create → Library**, Library rows, and all JavaAPI
screens are hidden.
* Publication is **manual in the Portal only** (no agent publish).
* **Revisions are not supported.** The same Maven version cannot be published twice for one Library.
* The analysed JAR is transient input for analysis; it is not shown as a user document. **Documents tab does not exist**
for Library versions; users do not upload files at publish.
* **Deprecated**, **API Quality**, **Groups**, **Revision history**, and **Documents** are out of scope for Library  
versions.
* **Status** rules match Package: for example, a **Release** Library version cannot use a **Draft** version as
**Previous version** (validation per existing Package rules).
* **Library version** combobox loads Maven versions from Artifactory with substring search (chevron when idle; search  
icon + chevron when focused and filtering). **Previous version** combobox lists only APIHUB-published versions for this  
Library, with the same search behaviour.

## Domain Concepts

| Concept | Definition |
| :---- | :---- |
| Library | Workspace entity of type `library`. One Maven artefact (coordinates without version). Holds zero or more Library versions. |
| Maven coordinates | Repository name + `groupId` + `artifactId`. Immutable after create. |
| GAV | `groupId:artifactId:version` including repository context in UI. |
| Library version | A Maven version published in APIHUB with status Draft or Release, optional labels, API report, and API diff vs the selected **Previous version**. |
| Previous version | Another Library version already in APIHUB, or **No previous version**. User-selected at publish; drives `oldVersion` in `api-diff`. |
| JavaAPI | Product label for the Java library API type in UI (always one word: **JavaAPI**). |
| Java type | Class, interface, enum, or annotation row in API Reference, keyed by `className`. |
| Member | Constructor, method, or field; signature in JSON `member`. |
| API report / API diff | `jdiff` JSON (`api-report.json`, `api-diff.json`). |
| Java task processor | Microservice that owns JAR download, `jdiff`, persistence. Not `api-processor` / `build-task-consumer`. |

### Mapping: Package (REST) vs Library (JavaAPI)

| Package (REST) | Library (JavaAPI) |
| :---- | :---- |
| Package | Library |
| Service name | Maven coordinates without version |
| Package version | Library version |
| Revision | None |
| Operation | Method or constructor (not labelled Operation in UI) |
| Doc View | API Reference (Doc view / Raw view) |
| Global search scope | Package / Package version → Library / Library version when API contract = JavaAPI |

## Scope

| Page / functionality | In scope | Out of scope |
| :---- | :---- | :---- |
| **Workspace / group** | Library in lists; Create → Library; Library icon; empty Service name column | Package-type switcher on Library |
| **Create Library** | Name, Workspace/Parent Group, Alias; Maven coordinates; Artifactory verify; duplicate GA errors | Version, Artifactory URL at create |
| **Publish version** | Library version (Artifactory), Previous version (APIHUB), Status, Labels; Package-like status rules | Document upload; agent publish |
| **Library version tabs** | Overview (Summary, Activity history), API Reference, API Changes | Documents; Settings on version; Deprecated; API Quality; Groups; Revision history |
| **Overview → Summary** | Version metadata, GAV with copy, JavaAPI counts, diff teaser | REST operation counts |
| **Overview → Activity history** | Library version events (TBD with backend) | — |
| **API Reference** | Type list and detail; header **Compare** only; **Doc view** and **Raw view** | Full ADV; parameter names; JavaDoc |
| **API Changes** | Diff list and compare layouts | — |
| **Library Settings** | General, Library versions (no GA column), Roles, Access tokens, UAC | Changing coordinates |
| **Global search** | JavaAPI contract; Library / Library version filters; empty **No API Reference to display** | — |
| **About / plugin** | Java task processor version | Mockup TBD |

## Use Cases

Mockups:
[Figma — 13547 JavaAPI](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6064-186525).

Unless noted, **API / Logic** is **TBD** — see [Backend](#backend) (low-level design pending).

## Plugin visibility and navigation

### Use Case 1: Library appears when the JavaAPI plugin is installed

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| User opens a workspace. Lists can contain Package, Dashboard, and Library. | [1.0 Workspaces](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6064-187898) | TBD |
| If the plugin is not installed, Library creation and Library rows are absent. | — | TBD |
| Libraries use a dedicated icon. **Service name** column is empty. | [2.0 Inside the workspace](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6066-188263) | — |

## Create Library

### Use Case 2: Create Library popup fields

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| User chooses **Create → Library**. Popup **Create Library** opens. | [2.1 Create Library](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6075-314956) | TBD |
| Required above **Maven Coordinates**: **Name**, **Workspace/Parent Group**, **Alias**. | — | — |
| **Maven Coordinates** section (immutable after create): **Maven Repository Name** (required), **Maven GroupId** (required), **Maven ArtifactId** (required), **Description** (optional), **Private** checkbox (default unchecked). | — | — |
| **Create** disabled until required fields valid. **Cancel** closes without saving. | — | — |

### Use Case 3: Create — Artifactory verification failed

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| User submits coordinates not found in Artifactory. Notification in popup: *These coordinates could not be verified in Artifactory. Check repository name and Maven GA*. **Create** does not succeed until resolved. | [2.3 Create — Artifactory error](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7671-114891) | TBD — verify on create |

### Use Case 4: Create — duplicate Maven coordinates

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Another Library already uses the same repository name and Maven GA. Notification: *Duplicate Maven coordinates. A library with this repository name and Maven GA is already registered. Use the existing library to publish versions, or change the coordinates.* | [2.4 Create — duplicate GA](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7671-134350) | TBD |

### Use Case 5: Create succeeds — empty Library

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| On success, system creates Library with no versions and navigates to the Library page. | [2.1 Create Library](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6075-314956) | TBD |
| Empty state prompts first publication. Version tabs unavailable until a version exists. | [2.2 Empty State](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6077-114019) | TBD |

## Publish Library version

### Use Case 6: Publish popup fields

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Owner clicks **+** / **Publish** on the Library. **Publish** popup opens. | [Publish popup](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7309-99741) | TBD |
| Required: **Library version** (required), **Previous version** (required), **Status** (required). Optional: **Labels**. No document upload. | — | — |
| **Publish** runs job; **Cancel** closes. | — | — |

### Use Case 7: Library version combobox (Artifactory)

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Options loaded from Artifactory for the Library coordinates. Idle control shows chevron only. | [Publish popup](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7309-99741) | TBD |
| On focus/type, search icon appears; dropdown filters by **substring** match. User picks exact Maven version string. | — | — |
| Versions already published in APIHUB for this Library are hidden or disabled **TBD**. | — | TBD |

### Use Case 8: Previous version combobox (APIHUB)

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Options are **only** versions already published for this Library in APIHUB, plus **No previous version**. | [Publish popup](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7309-99741) | TBD |
| Same chevron / search / substring filter behaviour as Library version. | — | — |
| Selected Previous version becomes `oldVersion` for diff (unless **No previous version**). | — | TBD |

### Use Case 9: Status and Previous version validation

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Status rules match Package (e.g. cannot pick **Draft** as Previous version when publishing **Release**). Invalid combinations block **Publish** with validation messaging consistent with Package. | — | TBD — reuse Package rules |

### Use Case 10: Publish processing and completion

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Backend downloads JAR, runs `jdiff`, stores report/diff/statistics. Progress UI **TBD**. | — | TBD |
| On success, user lands on Library version **Overview → Summary**. | [3.0 After publication](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6077-111507) | TBD |
| User cannot publish the same Maven version twice. | — | TBD |

## Library version — tab shell

### Use Case 11: Three top-level tabs

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Published version shows **Overview**, **API Reference**, **API Changes** only. | [3.0 After publication](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6077-111507) | — |
| **Settings** for the Library entity remain on the Library (not on the version tab bar). | [6.0 Viewing a library](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6077-113405) | — |

## Overview

### Use Case 12: Overview sub-tabs

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| **Overview** contains **Summary** and **Activity history** only (no Revisions sub-tab). | [3.0 After publication](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7671-139339) | — |

### Use Case 13: Summary — metadata and GAV copy

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Summary shows version, status, publisher, timestamps, coordinates, JavaAPI summary counts, diff teaser vs Previous version (when not **No previous version**). | [3.0 After publication](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6077-111507) | TBD |
| **GAV** field shows copy icon on hover; click copies GAV to clipboard. | — | Client clipboard |

### Use Case 14: Activity history sub-tab

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| User opens **Overview → Activity history**. Events for this Library version (types **TBD** with backend). | — | TBD |

## API Reference tab

### Use Case 15: Version header — Compare only

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| On **API Reference**, the top version header toolbar shows **Compare** only (no other header actions from REST Doc View set). | [4.0 API Reference — list](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7350-61731) | — |

### Use Case 16: Doc view and Raw view

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| User toggles **Doc view** (structured type/member layout) and **Raw view** (raw report payload). No other view modes. | [4.0 API Reference — list](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7350-61731) | TBD |

### Use Case 17: Type list

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Lists Java types per grouping rules; search, filter by kind, expand/collapse. | [4.0 API Reference — list](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7350-61731) | TBD |

### Use Case 18: Type detail — class, interface, enum

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Class detail. | [4.1 Detailed view — class](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7345-376690) | — |
| Interface detail. | [4.2 Detailed view — interface](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7329-231022) | — |
| Enum detail. | [4.3 Detailed view — enum](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7364-75885) | — |

## API Changes tab

### Use Case 19: Summary and changed list

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Header: Previous version → Library version, SemVer verdict, aggregates. List of changed elements only. | [5.0 API Changes](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7365-76926) | TBD |
| Extended layout. | [5.1 API Changes](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7365-105227) | TBD |

### Use Case 20: Compare layouts

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Mixed change. | [5.2 Compare JavaAPI_mix](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7365-242578) | — |
| Deleted. | [5.3 Compare JavaAPI_deleted](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7486-257196) | — |
| Added. | [5.4 Compare JavaAPI_added](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7486-190397) | — |
| Added variant. | [5.5 Compare JavaAPI_added](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7671-139780) | — |

## Library Settings

### Use Case 21: Settings — General

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| **Settings → General**: Maven fields read-only; name, alias, description, private per mockup. | [6.1 Library Settings](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=6077-110908) | TBD |
| Edit mode. | [6.2 Library Settings — Editing](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7480-189910) | TBD |

### Use Case 22: Settings — Library versions

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| **Library versions** tab lists versions. **GA column is not shown.** | [6.3 Versions](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7329-219635) | TBD |
| Edit version popup. | [6.4 Edit version popup](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7486-259866) | TBD |

### Use Case 23: Settings — Roles, Access tokens, UAC

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Same patterns as Package where mocked. | [6.5 Access Tokens](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7329-220579) | TBD |
| User access control. | [6.6 User Access Control](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7329-222003) | TBD |

## Global search

### Use Case 24: REST default filters

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| Global Search opens with default API contract **REST API**; filters use **Package** and **Package version** (and other existing REST fields). | [7.0 Global Search — REST](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7812-526827) | TBD |

### Use Case 25: JavaAPI contract filters

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| User sets API contract to **JavaAPI**. **Package** / **Package version** filters become **Library** / **Library version**. Other shared filters (workspace, group, status, dates) remain. | [7.1 Global Search — JavaAPI](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7671-140682) | TBD |
| Results show Java types (classes, interfaces, etc.) with breadcrumbs through Library and Library version. | [7.2 Global Search — results](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7678-144452) | TBD |

### Use Case 26: Global search empty states

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| REST contract: empty results show **No operations to display** (existing behaviour). | [7.0 Global Search — REST](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7812-526827) | — |
| JavaAPI contract: empty results show **No API Reference to display**. | [7.1 Global Search — JavaAPI](https://www.figma.com/design/Yh7cjYj1FpHeDWt1hYMAkT/-APIHUB--Tasks?node-id=7671-140682) | — |

## About — Java task processor version

### Use Case 27: Show installed Java processor version

| Description | UI (Mockup) | API / Logic |
| :---- | :---- | :---- |
| When installed, About (or equivalent) shows Java task processor version. | Mockup TBD | TBD |

## Backend

Backend contracts and REST APIs: TBD (low-level design pending).
