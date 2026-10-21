# Edit dashboard version

**Design Item ID**: DI-Portal-DSHVER-002  
**Design Item Name**: Edit dashboard version  
**Related Design Items**:  
**Related API**:

- Get package by id (GET /api/v2/packages/{packageId})
- Get version references (GET /api/v3/packages/{packageId}/versions/{version}/references)
- Get packages list (GET /api/v2/packages)
- Get packages versions list (GET /api/v2/packages/{packageId}/versions)

**Revision History:**

| Date | Description |
| ---- | ----------- |
|      |             |

---

## Description

The functionality allows the user to edit previously added packages/dashboards in the required dashboard version and
republish it with updated content.

## Start Point

1. User navigates to APIHUB Portal → workspace → group → dashboard version

## Execution

1. User opens required dashboard version page
2. User clicks **Edit** button. If user does not have permission to manage version in current status (i.e. user does not
   have manage status permission) in the current dashboard, then edit button will be disabled (for example, if the user
   is on dashboard version in release status, then he shall have manage_release_version permission to be able to edit
   current version).
   - API to get permissions of current user - GET /api/v2/packages/{packageId}:
     - packageId - current dashboard Id
3. The system opens editing page of current dashboard version and shows list of included packages/dashboards which
   current dashboard version contains.
   - API to show list of included packages/dashboards - GET /api/v3/packages/{packageId}/versions/{version}/references
     - packageId = current dashboard Id
     - version = current dashboard version

All other functionality is the same as in DI-Portal-DSHVER-001: Configure dashboard version from scratch.

## Screen View
