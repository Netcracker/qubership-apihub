# DI-Portal-PKGVER-009 List of Operations Groups

**Design Item ID**: DI-Portal-PKGVER-009  
**Design Item Name**: List of Operations Groups  
**Related Design Items**: 
  - [DI-Portal-PKGVER-010: Manage REST Path Prefix Group](di-portal-pkgver-010-manage-rest-path-prefix-group.md)  
  - [DI-Portal-PKGVER-004: Manage Manual Operations Group](di-portal-pkgver-004-manage-manual-operations-group.md)  

**Related API**: 
  - Get package version content (GET /api/v3/packages/{packageId}/versions/{version})

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description
The system allows grouping of operations within a specific package version. For example, for product API, it can be useful to divide operations by consumers of this API. There are two types of groups available within the system:  
- Manual groups: Allows the user to manually select operations that shall be included in the operations group. See more about manual groups in [DI-Portal-PKGVER-004: Manage Manual Operations Group](di-portal-pkgver-004-manage-manual-operations-group.md)  
- REST path prefix groups: Automatically created group based on custom regular expression which is applied to the operation's endpoint. This group is applicable only for REST operations. See more about REST path prefix groups in [DI-Portal-PKGVER-010: Manage REST Path Prefix Group](di-portal-pkgver-010-manage-rest-path-prefix-group.md).

# Start Point
1. User navigates to APIHUB Portal → workspace → group → package version → Overview tab

# Execution
1. User clicks Groups menu.  
2. The system opens the Groups page and displays a list of existing groups with the following information:  
   - Group Name  
   - Type: "Manual" or "REST Path Prefix"  
   - Description  
   - API Type: Type of API operations included in the group. One group can contain operations of only one API type.  
   - Number of Operations: Maximum number of operations that can be included in a group is 5000.  
   - API to get the list of groups - GET /api/v3/packages/{packageId}/versions/{version}  
     - packageId = \<current package Id>
     - version = \<current package version>
     - includeGroups = true

# Screen View
tbd