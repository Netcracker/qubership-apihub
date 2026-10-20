# Default Release Version

**Design Item ID**: DI-Portal-PS-005  
**Design Item Name**: Default Release Version  
**Related Design Items**: DI-Portal-PS-001: General Settings  
**Related API**:

- Get package by Id (GET /api/v2/packages/{packageId})
- Get package versions list (GET /api/v3/packages/{packageId}/versions)
- Change the package's parameters (PATCH /api/v2/packages/{packageId})

**Revision History:**

| Date | Description |
| ---- | ----------- |
|      |             |

---

## Description

This functionality allows users to select a default release version for a specific release version to be opened by
default when the user accesses a package. If the default release version parameter is empty, the latest release version
sorted alphabetically by name (desc order) will be opened when the user opens a package. If there are no release
versions available in the package, then the latest (by date, desc order) published draft version will be opened.

## Start Point

1. User navigates to APIHUB Portal → specific workspace → specific group → package settings

## Execution

1. User opens **General** tab in package settings.
2. The system opens the general page, which displays information about the parameters of the current package.
   - API to show information on General page – GET /api/v2/packages/{packageId}
     - packageId = current package Id
3. User clicks **Edit** and expands values in **Default Release Version** field.
4. The system shows the list of all published versions in release status in the current package.
   - API to show list of versions – GET /api/v3/packages/{packageId}/versions
     - packageId = current package Id
     - status = release
5. User selects the default release version and clicks **Save**.
6. The system updates the value of the default release version.
   - Note: API to update default release version – PATCH /api/v2/packages/{packageId}
     - packageId = current package Id
     - defaultReleaseVersion = value from Default Release Version field

## Screen View
