# DI-Portal-GF-007 Activity History in Main Page

**Design Item ID**: DI-Portal-GF-007  
**Design Item Name**: Activity History in Main Page  
**Related Design Items**:
  - [Shared Packages](di-portal-gf-006-shared-packages.md)
  - [Favorite packages, dashboards, groups, workspaces](di-portal-gf-005-favorite-packages-dashboards-groups-workspaces.md)
  - [Activity History](../package-version/di-portal-pkgver-012-activity-history.md)

**Related API**: 
  - Get activity history (GET /api/v4/activity)
  - Get activity history for the package (GET /api/v4/packages/{packageId}/activity)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

# Description
The functionality provides a user with the ability to view list of actions that are made by the users in some groups/packages/dashboards.

# Flow 1 (For Favorite, Shared, Private tabs) 
## Start Point
1. User navigates to APIHUB Portal

## Execution
1. User opens Favorite, Shared or Private tab.
2. The system displays Activity History panel in the right side of page. By default panel is expanded.
The panel contains the list of events for all packages/dashboards/groups present on the current page. For each event the system show the following information:
   - date of the event
   - user who generated event
   - event message
   -
   - API to display activity history for Favorite / Shared tab - [GET /api/v4/activity](https://apihub.netcracker.com/portal/packages/NC.CP.AH.RS/develop%40102/operations/rest/api-v4-activity-get#/):
     - if user is on Favorite tab:
       - onlyFavorite = true
       - kind = package,group,dashboard
     - if user is on Shared tab:
       - onlyShared = true
       - kind = package,dashboard
     - if user is on Private tab:
       - API to display activity history for Private tab - GET /api/v4/packages/{packageId}/activity:
         - packageId = <id of the private workspace>
         - includeRefs = true
3. User clicks **Collapse** button.
4. The system collapses activity history panel and saves state of the panel in local storage (expandActivityHistoryPanel: false).
5. User clicks left chevron button.
6. The system expands activity history panel and saves state of the panel in local storage (expandActivityHistoryPanel: true).

The system allows searching events by user name or package name. See details about search in [Activity History](../package-version/di-portal-pkgver-012-activity-history.md).  
The system allows filtering events by event groups: See details about filters in [Activity History](../package-version/di-portal-pkgver-012-activity-history.md).

## Screen View
tbd

# Flow 2 (for specific workspace or group)
## Start Point
1. User navigates to APIHUB Portal → Workspaces

## Execution
1. User opens workspace or group.
2. The system displays activity history panel in the right side of selected workspace page, which displays activity history of all groups/packages/dashboards from the current workspace.
   - API to show activity - GET /api/v4/packages/{packageId}/activity:
     - packageId = <id of the current workspace/group>
     - includeRefs = true

All functionality for activity history panel is the same as in "Flow 1".

## Screen View
tbd