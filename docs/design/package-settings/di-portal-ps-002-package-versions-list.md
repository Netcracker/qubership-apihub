**Design Item ID**: DI-Portal-PS-002    
**Design Item Name**: Package versions list     
**Related Design Items**: -     
**Related API**:    


- Get package versions list (GET /api/v2/packages/{packageId}/versions)
- Update package version (PATCH /api/v2/packages/{packageId}/versions/{version})
- Delete package version (DELETE /api/v2/packages/{packageId}/versions/{version})

**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

The functionality provides a user with the ability to view information about all versions published in the current package/dashboard. User can change version meta or delete version.

# Start Point

1. User navigates to APIHUB Portal → specific workspace → specific group → specific package/dashboard settings.

# Execution

1. User clicks Versions tab.

2. The system opens Versions page and displays the list of all versions published in the current package.
   - API to show list of versions – GET /api/v2/packages/{packageId}/versions
     - packageId = current package Id
   - For each version, the system shows the following information:
     - Version – name of the version. The value is a link to the appropriate package version.
     - Status – status for the version. Available values are draft, release, and archived.
     - Labels – version labels.
     - Publication Date – date when the version was published.
     - Published by – user who published the version.
     - Previous Version – name of the previous release version.

The system allows searching versions by version name and labels:

1.  User fills Search field in versions page.
2.  The system searches versions according to user input by version name/labels.
    - API to search versions – GET /api/v2/packages/{packageId}/versions
      - packageId = current package Id
      - textFilter = user's input in Search field

The system allows filtering versions by status:

1.  The system displays the following options for filtering:

    - All (selected by default)
    - Draft
    - Release
    - Archived

2.  User selects one option in the filter by status.
3.  The system filters versions according to the selected option.
    - API to filter versions - GET /api/v2/packages/{packageId}/versions.
      - packageId = current package Id
      - status = status selected by the user

The system allows changing status and label of the version:

1.  User hovers over the row with the required version and clicks **Edit** button.
2.  The system opens Edit Version popup with the following fields:
    - Version – current version name. The field is disabled.
    - Status
    - Labels
3.  User makes required changes and clicks **Save** button.
    - API to edit version – PATCH /api/v2/packages/{packageId}/versions/{version}
      - packageId = current package Id
      - version = current package version
      - status = value from Status field
      - versionLabels = value from Labels field

To delete a version:

1.  User hovers over the row with the required version and clicks **Delete** button.
2.  The system shows a confirmation window with the following text: "Are you sure, you want to delete version <version>?"
3.  User clicks **Yes, delete.**
4.  The system deletes the version.
    - API to delete version – DELETE /api/v2/packages/{packageId}/versions/{version}
      - packageId = current package Id
      - version = current package version

> ⚠ If the user does not have permission to manage a version in a specific status (i.e. the user does not have manage status permission) in the package/dashboard, then the edit or delete button will be disabled with a tooltip.

# Screen View
