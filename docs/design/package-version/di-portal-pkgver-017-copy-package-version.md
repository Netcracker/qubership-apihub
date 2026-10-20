# DI-Portal-PKGVER-017 Copy Package Version

**Design Item ID**: DI-Portal-PKGVER-017  
**Design Item Name**: Copy Package Version  
**Related Design Items**: -  
**Related API**: 
  - Copy package version to another package (POST /api/v2/packages/{packageId}/versions/{version}/copy)  
  - Get publish process status (GET /api/v2/packages/{packageId}/publish/{publishId}/status)  
  - Get packages list (GET /api/v2/packages)


**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description  
This functionality allows users to copy package version (source files) to the same or another package version.
It is also possible to copy dashboard version: in this the system copies not source files (because in fact the dashboard does not have own files), but all references to packages/dashboards. 

Note: Further on this page, the term "package" will refer to both package and dashboard unless otherwise noted.

# Start Point  
1. User navigates to APIHUB Portal → workspace → group → package→ version

# Execution
1. User clicks **Copy** button.  
Note: There is no case when Copy button is disabled. Whether a user has permission to copy (i.e. publish) a version to another package or not depends on the target package and version status.  
2. The system displays "Copy Package Version" popup ("Copy Dashboard Version" in case of dashboard) with the following fields:  
   - Target Package (Target Dashboard in case of dashboard) section:  
     - Workspace - required field, predefined with current workspace.  
       - API to get workspaces - GET /api/v2/packages:  
       - kind = workspace  
       - textFilter = \<use input> in case of search  
     - Package (Dashboard - in case of dashboard) - required field. Field allows selecting a package/dashboard from the selected workspace. The field is disabled if target workspace field is empty. If the user selects a package and then changes the workspace, the value in the Package field will be reset.
       - API to get packages - GET /api/v2/packages:  
         - kind = package (or dashboard - in case of dashboard)
         - parentId = \<workspace id from Workspace field>  
         - showAllDescendants = true  
         - textFilter = \<use input> in case of search  
   - Target Version Info section:  
     - Version - target package version, predefined with current package version.
       - API to get list of versions for suggestions - GET /api/v3/packages/{packageId}/versions. 
         - packageId = \<id of the package selected in the Package field>
         - statul = release
         - textFilter = \<use input> in case of search  
     - Status - target package version status, predefined with status of current package version.  
     - Labels - target package version labels, predefined with label(s) of current package version.  
     - Previous release version - list of release versions from target package (list should not include the version with the value specified in the Version field). The field is disabled if Package field is empty. If user selects previous release version and then user changes packages, the value in the Previous release version field will be reset to "No previous release version" value.
       - API to get list of previous release versions - GET /api/v3/packages/{packageId}/versions
         - packageId = \<id of the package selected in the Package field>
         - statul = release
         - textFilter = \<use input> in case of search.     
3. User fills the required fields and clicks **Copy**.  
4. The system displays loading wheel in Copy button and popup remains opened until new version is published in the target package.  
5. The system gets sources of package and publishes (server-side building) them in the target package version.  
   - API to copy package version - POST /api/v2/packages/{packageId}/versions/{version}/copy:  
     - packageId = \<current (to be copied) package id>  
     - version = \<current (to be copied) package version>  
     - targetPackageId = \<package id of the target package selected in Copy Package Version>  
     - targetVersion = \<target version specified in Copy Package Version>  
     - targetPreviousVersion = \<target previous release version selected in Copy Package Version>  
     - targetStatus = \<target version status selected in Copy Package Version>  
     - targetVersionLabels = \<target version labels specified in Copy Package Version>  
   - API to get status of publication (copy) process - GET /api/v2/packages/{packageId}/publish/{publishId}/status  
     - packageId = \<package id of the target package selected in Copy Package Version>  
     - publishId = \<response from POST /api/v2/packages/{packageId}/versions/{version}/copy>  
6. If new version is published successfully, the system shows notification "The package version was copied. Check it out".  
7. User clicks **Check it out**.  
8. The system opens newly published target package version.

# Mockup
![Copy Package Version](https://github.com/user-attachments/assets/defa64fa-9db4-4e4a-99fb-ec6b9d2f84c8)
