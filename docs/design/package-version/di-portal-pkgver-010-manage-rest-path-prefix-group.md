# DI-Portal-PKGVER-010 Manage REST Path Prefix Group

**Design Item ID**: DI-Portal-PKGVER-010  
**Design Item Name**: Manage REST Path Prefix Group  
**Related Design Items**:

- [DI-Portal-PKGVER-009: List Operations Groups](di-portal-pkgver-009-list-of-operations-groups.md)
  
**Related API**:

- Get package by Id (GET /api/v2/packages/{packageId})
- Update parameters of operation group (PATCH
  /api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName})
- Recalculate package version groups (POST /api/v2/packages/{packageId}/recalculateGroups)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description  

The REST Path Prefix Group feature allows users to organize and categorize REST API operations based on a specific path
prefix, which is defined for each package. This functionality is particularly beneficial when multiple versions of an
API share similar paths with version-specific prefixes, as it enables users to group APIs by version or other meaningful
criteria embedded in the path. This feature improves the organization and management of API operations, allowing for
easier filtering and comparison.

## Start Point  

1. User navigates to APIHUB Portal → workspace → group → package settings → API Specific Configuration tab

## Execution  

Configure REST Path Prefix group:  

1. User navigates to package settings and opens API Specific Configuration tab.  
2. The system opens API Specific Configuration page, if a REST Path Prefix for Grouping by Version has been previously
   defined, the field will display the current regular expression.  
   - API to get value of REST Path Prefix for Grouping by Version parameter - GET /api/v2/packages/{packageId}  
     - packageId = \<current package Id>  
3. When user hover over info icon near 'REST Path Prefix for Grouping by Version parameter, the system displays a
   tooltip with message "The parameter allows you to define custom regular expression, which will be applied to the
   paths of REST operations. This expression must begin and end with a / character and contain the {group} keyword. For
   example: /api/{group}/. The system will look for the {group} entry in the REST operation paths during the publication
   of the package version. All found matches will form a list of groups that will include the corresponding operations."  
4. User clicks **Edit** button and defines custom regular expression REST Path Prefix for Grouping by Version field.  
5. User checks or leave unchecked parameter "Recalculate groups in all published versions". Parameter defines whether
   specified custom regular expression should be applied to only newly published package versions (after the param value
   is saved) or to the all already published package versions.  
6. The system validates the input:  
   - The expression must start and end with a slash (/).  
   - The expression must contain the {group} keyword exactly once.  
7. User clicks **Save** button.  
8. The system saves the value.  
   - API to update value of the parameter - PATCH /api/v2/packages/{packageId}  
   - If user checked "Recalculate groups in all published versions" option, then additionally the following API is
     called when user clicks **Save** - POST /api/v2/packages/{packageId}/recalculateGroups  

The grouping of operations into their respective groups (operations that match the {group} pattern) will be performed
during the package version publishing process. As a result, when the user publishes the package version, the system will
use the specified REST Path Prefix for Grouping by Version to categorize operations and display them under groups tab in
package version overview. Additionally, if there are any operations that do not match the prefix pattern, they will not
be grouped and will remain ungrouped.  

For example, if REST Path Prefix for Grouping by Version = /api/{group}/, and user publishes packages version with the
following operations:  

- /api/v1/packages  
- /api/v1/package/{packageId}  
- /api/v2/packages  
- /api/internal/package  

the the system will create "v1", "v2", and "internal" groups, where:  

- "v1" group contains /api/v1/packages and /api/v1/package/{packageId} operations.  
- "v2" group contains /api/v2/packages operation.  
- "internal" group contains /api/internal/package operation.  

To see the list of created groups for package version see DI-Portal-PKGVER-009: Operations Group.  

To edit parameters of the Rest Path Prefix group:  

1. User navigates to package version and opens Groups menu.  
2. User hovers over row with the required Rest Path Prefix group and clicks [Edit].  
3. The system opens "Edit \<Group name> Group" popup. It is possible to change description and OpenAPI specification
   template. API type and group name of the Rest Path Prefix group cannot be changed.  
4. User makes required changes and clicks **Update**.  
   - Note: API to update parameters of operation group - PATCH
     /api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}  
     - apiType = \<type of the API> (REST/GraphQL)  
     - packageId = \<current package Id>  
     - version = \<current package version>  
     - groupName = \<group name>

The **Change operations in the group** button is disabled for Rest Path Prefix groups, and when the user hovers over the
disabled button, a tooltip will appear with the message: "Operations cannot be changed in the REST Path Prefix group"

The **Delete group** button will be disabled for Rest Path Prefix groups, and when the user hovers over the disabled
button, a tooltip will appear with the message: "Deletion is not available for the REST Path Prefix group"

## Screen View

tbd
