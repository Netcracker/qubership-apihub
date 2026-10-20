# DI-Portal-GF-008 Personal Private Workspace

**Design Item ID**: DI-Portal-GF-008    
**Design Item Name**: Personal Private Workspace   
**Related Design Items**:

**Related API**: 
  - Create personal private package (POST /api/v2/users/{userId}/space)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

# Description

Each user in Portal can create personal workspace that will be available only for the current user. Other users do not have read access to the workspace and all groups/package/dashboard inside this workspace. However, owner of personal workspace can give permissions to work with groups/package/dashboard from personal workspace for other users, but permission cannot be given to the entire workspace.

# Start Point
1. User navigates to APIHUB Portal → Private

# Execution
1. User opens Private tab
2. The system shows page with **Create Private Workspace** button if user does not have private workspace.
3. User clicks **Create Private Workspace** button.
4. The system creates private workspace and opens it.
   - API to create private workspace - POST /api/v2/users/{userId}/space:
     - userId = Login of the current user

Only one private workspace can exist per user and the user who created personal workspace has Admin role for this space.  
"User" table in db has required column "PrivateWorkspaceId". In case if there is integration with e.g. ADFS, PrivateWorkspaceId is automatically generated for the user by userId. During local user creation, there is an ability to specify PrivateWorkspaceId, but if it is not specified, then it will be generated automatically.

# Screen View
tbd