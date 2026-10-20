# DI-Portal-PKGVER-014 List of Deprecated Operations

**Design Item ID**: DI-Portal-PKGVER-014  
**Design Item Name**: List of Deprecated Operations  
**Related Design Items**:

- [Human-readable description for deprecated items for OpenAPI 3.0](di-portal-pkgver-015-human-readable-description-for-deprecated-items-for-openapi-3-0.md)

**Related API**:

- Get list of deprecated operations (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

The functionality provides a user with the ability to view the list of all deprecated operations or deprecated items
(item that is deprecated inside the operation. e.g. for REST operations - parameters, schema; for GraphQL operation -
enum value, field definition) in operations for the current package version.

## Start Point

1. User navigates to APIHUB Portal → workspace → group → package version

## Execution

1. User opens Deprecated tab.
2. The system opens the Deprecated Operations page and displays deprecated operations and operations that contain at
   least one deprecated item.
   - API to show list of operations - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated
     - apiType = \<currently API type\>
     - packageId = \<current package id\>
     - version = \<current package version\>
3. The system shows the following information in the table for REST operations:
   - Endpoint, Tag, Kind - the same columns as in List of Operations.
     - If operation itself is deprecated then the system shows "deprecated" badge in Endpoint column.
   - Details - shows total number of deprecated items in current operations including deprecation of operation itself.
   - Deprecated Since - shows the release version when the current element/operation was initially deprecated. The
     algorithm for calculating "deprecated since" for one item/operation see below:

4. If operation has at least one deprecated item, then system shows chevron in Endpoint column to expand/collapse
   human-readable description for deprecated item.
   - By default, all operations are collapsed.
   - If operation itself is deprecated, but does not have any deprecated item, then neither chevron nor human-readable
     description are shown.
   - Human-readable descriptions are generated based on the following rules:
     - for REST API:
       [Human-readable description for deprecated items for OpenAPI 3.0](di-portal-pkgver-015-human-readable-description-for-deprecated-items-for-openapi-3-0.md)
     - for GraphQL API: _not supported_

User can switch between list and detailed view in the same way as it described in
[List of Operations](di-portal-pkgver-011-list-of-operations.md)

User can filter and search operations, see
[DI-Portal-PKGVER-007: Search and Filter Operations](di-portal-pkgver-007-search-and-filter-operations.md)

## Screen View
