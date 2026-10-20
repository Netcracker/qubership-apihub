# DI-Portal-GF-005 Favorite packages, dashboards, groups, workspaces

**Design Item ID**: DI-Portal-GF-005  
**Design Item Name**: Favorite packages, dashboards, groups, workspaces  
**Related Design Items**: -  
**Related API**:  

- Favor package ([POST /api/v2/packages/{packageId}/favor](../../../backend/portal-backend/docs/api/APIHUB_API.yaml))
- Disfavor package ([/api/v2/packages/{packageId}/disfavor](../../../backend/portal-backend/docs/api/APIHUB_API.yaml))
- Get packages list ([GET /api/v2/packages](../../../backend/portal-backend/docs/api/APIHUB_API.yaml))  

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

 The functionality provides a user with the ability to add package/dashboard/groups/workspace to favorites.

## Flow 1 (for packages, dashboards and groups)

### Start Point

1. User navigates to APIHUB Portal → workspace, or
2. APIHUB Portal → workspace → group

### Execution

1. User clicks 'star' icon near package/dashboard.
2. The systems changes state of the icon and adds current package/dashboard in favorites.
   - API to favor package:
     [POST /api/v2/packages/{packageId}/favor](../../../backend/portal-backend/docs/api/APIHUB_API.yaml)
3. User navigates to Favorite tab.
4. The system display package/dashboard from step 1 on Favorite page.
   - API to list packages on Favorite page -
     [GET /api/v2/packages](../../../backend/portal-backend/docs/api/APIHUB_API.yaml):
   - onlyFavorite = true
   - kind = group, package, dashboard
5. User clicks 'star' icon near already favorite package/dashboard.
6. The system removes package/dashboard from favorites. This package/dashboard is not displayed on Favorite page.
   - API to disfavor package:
     [POST /api/v2/packages/{packageId}/disfavor](../../../backend/portal-backend/docs/api/APIHUB_API.yaml).

## Flow 2 (for workspaces)

### Start Point

User navigates to APIHUB Portal → Workspaces tab

### Execution

1. User either:
   - clicks 'star' icon near workspace in the list of workspaces or
   - opens workspace and click 'star' icon near workspace name
2. The systems changes state of the icon.
3. The system adds current workspace in favorites and displays this workspace in the left sidebar of home page..
   - API to favor package:
     [POST /api/v2/packages/{packageId}/favor](../../../backend/portal-backend/docs/api/APIHUB_API.yaml)
   - API to list workspace in the left sidebar -
     [GET /api/v2/packages](../../../backend/portal-backend/docs/api/APIHUB_API.yaml):
   - onlyFavorite = true
   - kind = workspace
4. User clicks 'star' icon near already favorite workspace.
5. The system removes workspace from favorites. This workspace is not displayed under Favorite workspaces.
   - API to disfavor package:
     [POST /api/v2/packages/{packageId}/disfavor](../../../backend/portal-backend/docs/api/APIHUB_API.yaml).

## Screen View

tbd
