# Access Tokens Management

**Design Item ID**: DI-Portal-PS-003    
**Design Item Name**: Access Tokens Management    
**Related Design Items**:    
**Related API**:   

- Package API keys list retrieve (GET /api/v4/packages/{packageId}/apiKeys)
- Get list of available roles for package (GET /api/v2/packages/{packageId}/availableRoles)
- Get users list (GET /api/v2/users)
- Create a package API Key (POST /api/v4/packages/{packageId}/apiKeys)
- Delete package API Key (DELETE /api/v2/packages/{packageId}/apiKeys/{id})

**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

The functionality provides a user with the ability to generate an API key for the current package. The API key is available for all kinds of packages (package, dashboard, group, workspace) for which it is generated and for all its child groups/packages/dashboards. The key does not have a period of life and needs to be stored on the client side because it is shown only once after generation and then the user will not see it again.

# Assumption
1. GET /api/v4/packages/{packageId}/apiKeys - has access_token_management permission for workspace/group/package/dashboard-level API keys, and for system API keys, a system administrator role is required
2. GET /api/v2/users - requires a system administrator role or a role with the user_access_management permission in any package

# Start Point

1. User navigates to APIHUB Portal → specific workspace settings.
2. User navigates to APIHUB Portal → specific workspace → specific group settings.
3. User navigates to APIHUB Portal → specific workspace → specific group → specific package/dashboard settings.

# Execution

(Further on this page only the word “package” will be used to mean all kind of packages)

1. User opens Access Tokens tab.
2. The system opens Access Tokens page and displays the list of all generated access tokens for the current package.
   - API to show list of access tokens – GET /api/v4/packages/{packageId}/apiKeys
     - packageId = Id of current package
   - For each API key, the system shows the following information:
     - Name – API key name
     - Roles – Role with the set of permissions available for the API key
     - Create At – Date of API key creation
     - Create By – User who created the API key
     - Created For – User for which the API was created (owner of API key)

To create a new API key:

1.  User fills the following fields:
    - Name (required) – API key name must be unique within the current package. If there is another key with the same name, then the system shows an error message: API key with name <name> already exists
    - Roles (optional) – The role(s) that will be available for the API key. If the user does not specify a role, the role(s) will be the same as the user who generated the token.
      - API to get list of available roles for a package – GET /api/v2/packages/{packageId}/availableRoles
        - packageId = Id of current package
    - Created For (required) – The user who will be the owner of the API key. By default, the field is predefined with the current user.
      - API to get list of users – GET /api/v2/users
2.  User fills the required fields and clicks **Generate** button.
3.  The system generates the key and shows it. If the user leaves the page or reloads it, the token will not be shown again.
    - API to create package access token – POST /api/v4/packages/{packageId}/apiKeys
      - packageId = Id of current package
4.  User clicks the copy icon in the Personal access token field.
5.  The system copies the key to the clipboard.

To delete an API key:

1.  User hovers over the row with the required key and clicks **Delete** button.
2.  The system deletes the appropriate key.
    - API to delete access token – DELETE /api/v2/packages/{packageId}/apiKeys/{id}
      - id = id of current API key
      - packageId = Id of current package

If the user does not have permission access_token_management, then:

- Name field will be disabled.
- Created For field will be disabled.
- Generate button will be disabled, and the tooltip You do not have permission to generate token will be displayed when the user hovers over the disabled button.
- Delete button will be disabled, and the tooltip You do not have permission to delete the token will be displayed when the user hovers over the disabled button.

# Screen View
