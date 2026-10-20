# DI-Portal-GS-003 Roles Hierarchy

**Design Item ID**: DI-Portal-GS-003  
**Design Item Name**: Roles Hierarchy  
**Related Design Items**:

- [Manage Roles](di-portal-gs-001-manage-roles.md)  

**Related API**:

- Get list of existing roles (GET /api/v2/roles)
- Update the roles order (POST /api/v2/roles/changeOrder)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

The functionality allows users to update the order of existing roles, excluding OOB roles such as Administrator, None,
and Viewer.

## Assumption

1. GET /api/v2/roles - requires a system administrator role or a role with the user_access_management permission in any
   package

## Start Point

1. APIHUB → Global Setting

## Execution

Roles has hierarchical order. This order is taken into account when:

- user (user1) assign's role to another user (user2) in some package. In this case, user1 can assign only those roles to
  the user that is not higher that his own role on current package.
- user generates token with specific role for the package. In this case, user can generate a token only with those roles
  that is not higher that his own role on the current package.  

By default, newly created role has lowest rank after None and Viewer roles.

Roles hierarchy:

1. User opens Roles Hierarchy tab.
2. The system displays list of all existing role in hierarchical order.
   - API to show the list of roles - GET /api/v2/roles.
Parameter 'rank' defines order of the role: the higher the rank, the higher the role.
   - Administrator role always has highest rank (1000) and it cannot be changed (the role has readOnly = true).
   - None role always has lowest rank (0) and it cannot be changed (the role has readOnly = true).
   - Viewer role always has the second lowest rank (1) and it cannot be changed (the role has readOnly = true).
3. User drags role and moves it higher/lower.
4. User clicks **Save**.
5. The system updated order (ranks) of the roles.
   - API to update role order - POST /api/v2/roles/changeOrder.

## Screen View
