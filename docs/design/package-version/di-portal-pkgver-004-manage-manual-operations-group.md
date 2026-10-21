# DI-Portal-PKGVER-004 Manage Manual Operations Group

**Design Item ID**: DI-Portal-PKGVER-004  
**Design Item Name**: Manage Manual Operations Group  
**Related Design Items**:

- [DI-Portal-PKGVER-009: List Operations Groups](di-portal-pkgver-009-list-of-operations-groups.md)
-  

**Related API**:

- Create manual operation group (POST /api/v3/packages/{packageId}/versions/{version}/{apiType}/groups)
- Update parameters of operation group (PATCH
  /api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName})
- Delete operation group (DELETE /api/v2/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName})

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

Manual groups are user-created groups that allow the grouping of operations within a specific package version. These
groups enable users to categorize operations based on their specific needs and criteria, such as grouping by consumer of
the API. One operation can be included in multiple groups.  
After manual groups are created, it is possible to filter operation by these groups (see Search and Filter Operations).
It is also possible to export operations from the groups with REST API type as OpenAPI specification (see
[Download Operations Group (reduced source specifications)](di-portal-pkgver-005-export-operations-group-reduced-source-specifications.md)
and
[Download Operations Group (combined specification)](di-portal-pkgver-006-export-operations-group-combined-specification.md))

## Start Point

1. User navigates to APIHUB Portal → workspace → group → package version → Overview tab → Groups menu

## Execution

To create manual group:

1. User clicks **Create Manual Group**.
2. The system opens Create Manual Group popup:
   - Group Name - required field. Group name must be unique within one API type.
   - API Type - required field. The system provides the ability to select those API types which are available in current
     package version.
   - Description
   - OpenAPI Specification Template - field is available only if REST API is selected in API Type field. Otherwise,
     entire Additional Options section is disabled. See more information about this field in
     [(Download Operations Group (combined specification))](di-portal-pkgver-006-export-operations-group-combined-specification.md).
3. User fills required fields and clicks **Create**.
   - API to create manual operation group - POST /api/v3/packages/{packageId}/versions/{version}/{apiType}/groups
   - apiType = \<type of the API\> (REST/GraphQL)
   - packageId = \<current package Id\>
   - version = \<current package version\>
4. The system creates group and opens "Edit \<Group Name\> Group of REST API Operations" popup where user can add
   required operations in the group.  
Popup contains two sections "\<API type\> API Operations" (left) and "Group \<Group name\>" (right). Left section
contains all operations of appropriate API type from the current version. Right section contains operation that were
added to the group. After operation is added to the group, it is no longer available in the left section.
It is possible to filter operations by API kind and/or tags. Also, user can search operation by title, method and path.
Filters and search are applied to the operations from both left and rights sections.
User can selects one or multiple operations to add to the group by checking checks boxes near each operation. It is
possible to select all operations at once that are currently loaded in the left/right section. By default the system
loads per 500 in the left side.
The system counts number of operation that are currently added to the group. Once group have 5000 operations, it will
not possible to add more operations (right arrow button will be disabled with the following tooltip "You cannot add more
than 5000 operations to the group".
5. User adds required operations to the group and clicks **Save**.
6. The system saves changes.

To edit parameters of the manual group:

1. User hovers over row with the required group and clicks **Edit**.
2. The system opens "Edit \<Group name\> Group" popup. It is possible to change group name, description and (if group
   has REST API type) OpenAPI specification template. API type of the group cannot be changed.
3. User makes required changes and clicks **Update**.
   - API to update parameters of operation group - PATCH
     /api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}
     - apiType = \<type of the API\> (REST/GraphQL)
     - packageId = \<current package Id\>
     - version = \<current package version\>
     - groupName = \<group name\>

To change operations in the current group:

1. User hovers over row with the required group and clicks **Change operations in the group**.
2. The system opens "Edit \<Group Name\> Group of REST API Operations" popup (see info about popup in "Create manual
   group").
3. User makes required changes and clicks **Save**.
   - API to update operations in group - PATCH
     /api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}
     - apiType = \<type of the API\> (REST/GraphQL)
     - packageId = \<current package Id\>
     - version = \<current package version\>
     - groupName = \<group name\>
     - operations = \<Operations in the group\>

To delete manual group:

1. User hovers over row with the required group and clicks **Delete**.
2. The system shows confirmation message.
3. User clicks **Delete**.
4. The system deletes group.
   - API to delete operation group - DELETE /api/v2/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}
     - apiType = \<type of the API\> (REST/GraphQL)
     - packageId = \<current package Id\>
     - version = \<current package version\>
     - groupName = \<group name\>

## Screen View

tbd
