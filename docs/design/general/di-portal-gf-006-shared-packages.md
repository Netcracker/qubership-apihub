# DI-Portal-GF-006 Shared Packages

**Design Item ID**: DI-Portal-GF-006  
**Design Item Name**: Shared Packages  
**Related Design Items**: -  
**Related API**:

- Get packages list (GET /api/v2/packages)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

The functionality provides a user with the ability to see all packages/dashboards for which you have directly assigned a
role.

## Start Point

1. User navigates to APIHUB Portal

## Execution

1. User opens Shared tab.
2. The system displays list of all packages/dashboards for which user has directly assigned role.
   - API to list packages on shared page - GET /api/v2/packages:
     - kind = package, dashboard
     - onlyShared = true
3. User enters value in Search package field.
   - API to search packages on shared page - GET /api/v2/packages:
     - kind = package, dashboard
     - onlyShared = true
     - textFilter = \<user input from search field\>.
The system also displays Activity History panel in the right side of page. See more information about activity history
in tbd

## Screen View
