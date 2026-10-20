# DI-Portal-GS-002 Manage System Tokens

**Design Item ID**: DI-Portal-GS-002  
**Design Item Name**: Manage System Tokens  
**Related Design Items**: -  
**Related API**: 
- Package API keys list retrieve (GET /api/v4/packages/{packageId}/apiKeys)
- Get users list (GET /api/v2/users)
- Create a package API Key (POST /api/v4/packages/{packageId}/apiKeys)
- Delete package API Key (DELETE /api/v2/packages/{packageId}/apiKeys/{id})

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

# Description
The functionality provides a system administrator with the ability to generate system-wide (applicable to all packages of Portal) API keys. API key does not have a period of life and needs to be stored on the client side because it shows in APIHUB UI only once after generation, and then user will not see it again.

# Assumption
1. GET /api/v2/users - requires a system administrator role or a role with the user_access_management permission in any package
2. GET /api/v4/packages/{packageId}/apiKeys - has access_token_management permission for workspace/group/package/dashboard-level API keys, and for system API keys, a system administrator role is required

# Start Point
  - APIHUB → Global Settinfs

# Execution
1. User clicks System Tokens tab in Portal settings.
2. The system opens System Tokens page, which display list of all generated access tokens for the system
   - API to show list of system tokens - GET /api/v4/packages/{packageId}/apiKeys
     - packageId = "*" instead of packageId for system tokens.
3. For each API key the system shows the following information:
   - Name - Unique (per package) API key name.
   - Roles - Role with the set of permissions available for the API key.
   - Create At - Date of API key creation.
   - Create By - User who created API key.
   - Created For - User for which the API was created (owner of API key).  

To create new API key: 
1. User fills the following fields:
   - Name - required field. API key name must be unique within system. If there is another key with the same name, then the system shows error message "API key with name <name> already exists" after user clicks **Generate** button.
   - Roles - optional field. Value of this field defines role(s), i.e. set of permissions that will be available for API key. If the user does not specify a role, the role(s) will be the same as the user who generated the token, i.e. system administator.
     - API to get list of available roles for package - GET /api/v2/roles
   - Created For - required field. User who will be the owner of API key shall be selected in this field. By default, the field is predefined with current user.
     - API to get list of users - GET /api/v2/users
2. User fills the required fields and clicks the **Generate** button.
3. The system generates key and shows it. If user leaves the page or reloads it, the token will never be shown again. 
   - API to create system access token - POST /api/v4/packages/{packageId}/apiKeys
   - packageId = "*" instead of packageId for system tokens.
4. User clicks copy icon in "Access token" field.
5. The system copies key in the clipboard. 

To deleted API key:
1. User hovers over the row with the required key.
2. The system displays the **Delete** button.
3. User clicks **Delete** button.
4. The system deletes appropriate key.
   - API to delete system access token - DELETE /api/v2/packages/{packageId}/apiKeys/{id}
   - id = id of current API key
   - packageId = "*" instead of packageId for system tokens

# Screen View
tbd