# DI-Portal-GS-001 Manage Roles

**Design Item ID**: DI-Portal-GS-001  
**Design Item Name**: Roles and permissions  
**Related Design Items**: -  
**Related API**:

- Get list of permissions (GET /api/v2/permissions)
- Get list of existing roles (GET /api/v2/roles)
- Create a new role (POST /api/v2/roles)
- Update role (PATCH /api/v2/roles/{roleId})
- Delete role (DELETE /api/v2/roles/{roleId})

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

The functionality provides system administrator to manage roles. The role is a set of predefined permissions. Further,
this roles can be assigned to specific user for package/dashboard/group/workspace.

## Assumption

1. GET /api/v2/permissions - requires a system administrator role or a role with the user_access_management permission
   in any package
2. GET /api/v2/roles - requires a system administrator role or a role with the user_access_management permission in any
   package

## Start Point

- APIHUB → Global Settinfs  

(Global settings icon is visible only for system administrator users. All functionality in Portal global settings are
available only for system administrator users.)

## Execution

The system provides the set of predefined permissions each of which defines some action available for the user in
Portal:

| permission                | description                          |
| ------------------------- | ------------------------------------ |
| read                      | read content of public packages      |
| delete_package            | delete group/package/dashboard       |
| manage_draft_version      | manage version in draft status       |
| manage_release_version    | manage version in release status     |
| manage_archived_version   | manage version in archived status    |
| manage_deprecated_version | manage version in deprecated status  |
| user_access_management    | assign/remove role(s) to the user    |
| access_token_management   | generate/revoke API keys             |

The system also provides roles that are mapped to some subset of permission. The system provides OOB roles (Admin,
Viewer, None), but also system administrator has an ability to create new roles.  

To create role:

1. User opens User Roles tab.
2. The system shows list of permissions, list of existing roles and mapping between them.
   - API to show the list of permissions - GET /api/v2/permissions.
   - API to show the list of roles with their permissions - GET /api/v2/roles.
     - role with readOnly = true means that it is OOB role and it cannot be edited or deleted.
3. User clicks **Create Role**.
4. The system opens Create Role popup with the following fields:
   - Role Name - required field, must be unique (case insensitive).
   - Select permissions - list of all permissions that can be assigned to the user. By default, 'read content of public
     packages' permission is preselected and cannot be unselected. This is done this way because by default all users
     have read rights to public packages. To prohibit read rights to package, the package must be private package.
5. User specifies all required information and clicks **Create**.
   - API to create new role - POST /api/v2/roles:
     - role = \<user input in Role Name field\>.
     - permissions = \<list of permission selected by the user\>.  
6. The system creates new role.  

To edit permissions of the role:

1. User opens User Roles tab.
2. User hovers over column with role and clicks **Edit** button.  
It is prohibited to edit roles with readOnly = true - Admin, Viewer and None. If user hovers over such role, the Edit
button will be disabled with tooltip: "\<Role'> cannot be edited".
3. The system opens Edit Role popup. Role name field is disabled since it is prohibited to change role name.
4. User changes permissions for the role and clicks **Update**.
5. The system saves changes.
   - API to update role - PATCH /api/v2/roles/{roleId}  

To delete role:

1. User opens User Roles tab.
2. User hovers over column with role and clicks **Delete** button.  
It is prohibited to delete roles with readOnly = true - Admin, Viewer and None. If user hovers over such role, the Edit
button will be disabled with tooltip: "\<Role\> cannot be deleted".
3. The system shows confirmation message.
4. The user clicks **Delete** button.
5. The system deletes role. If deleted role was assigned to a user in some package (any kind), then this role will be
   removed from the user in this package.
   - API to delete role - DELETE /api/v2/roles/{roleId}
