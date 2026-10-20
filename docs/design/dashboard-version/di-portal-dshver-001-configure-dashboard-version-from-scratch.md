# Configure dashboard version from scratch

**Design Item ID**: DI-Portal-DSHVER-001   
**Design Item Name**: Configure dashboard version from scratch   
**Related Design Items**:   

- [DI-Portal-DSHVER-002: Edit dashboard version](https://github.com/Netcracker/qubership-apihub/wiki/Edit-dashboard-version)

**Related API**:   

- Get packages list (GET /api/v2/packages)
- Get packages versions list (GET /api/v2/packages/{packageId}/versions)

**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

Portal supports virtual packages named as dashboard. Unlike regular packages, dashboard versions do not contain API data; instead, they provide links to published packages or other dashboards. This level of abstraction allows for a more streamlined and organized view of APIs within the portal.

# Start Point

1. User navigates to APIHUB Portal → workspace → group → empty dashboard
2. User navigates to APIHUB Portal → workspace → group → dashboard version

# Execution

1. User opens empty dashboard and clicks **[Create Version]**; or user opens dashboard version and cliks + button in the subheader
2. The system opens Configure Dashboard page and shows 'No included packages or dashboards'.
3. User clicks **[Add Package]**.
4. The system shows Add Package popup with the following fields\
   - Workspace - required field. Field shows list of existing workspaces. By default, the current workspace is selected.
     - API to show list of workspaces - GET /api/v2/packages:
       - kind = workspace
       - textFilter = 'user input' if user searches workspace
   - Package / Dashboard - required field. Field shows list of packages and dashboards (title and id) under selected workspace. If package/dashboard has been already added to the current dashboard, then it will not be displayed in Package / Dashboard field.
     - API to show list of packages/dashboards - GET /api/v2/packages:
       - kind = package, dashboard
       - parentId = id of selected workspace
       - showAllDescendants = true
       - textFilter = 'user input' if user searches package/dashboard
   - Version - required field. Field is disabled if 'Package / Dashboard' field is disabled. Field shows versions list of selected package/dashboard.
     - API to show list of versions - GET /api/v2/packages/{packageId}/versions:
       - packageId = Id of selected package/dashboard
       - textFilter = 'user input' if user searches version
5. User fills the fields and clicks **[Add]**.
6. The system adds selected package/dashboard version and show this package/dashboard on the 'Configure Dashboard' page.

The system prohibits adding the same package/dashboard twice to the dashboard directly, but there are cases when a user can add a package/dashboard twice indirectly. For example, there is a dashboard D1 containing links to packages P1 and P2. The user configures dashboard D2 and adds package P2 and dashboard D1 to dashboard D2. Since D1 contains references to P2, this causes D2 to reference P2's package twice.

![mdmdmd](https://github.com/user-attachments/assets/56e53197-096f-461d-addd-b89fceb0d4f9)

If such situation occurs, then:

1. The system shows warning icon (with tooltip 'There are conflicts in dashboard configuration') in the left sidebar near Packages menu item.
2. The system shows warning icon (with tooltip 'There is a conflict because this package is included in the dashboard multiple times. The conflict will be resolved automatically after version publication and out of all identical packages only one package will be included in the dashboard') near duplicated packages/dashboards on Configure Dashboard page.
   - If duplicated package/dashboard placed under dashboard, then the system shows special mark (yellow circle with tooltip 'One of the child package/dashboard has conflict') near such dashboard.

The user can remove previously added package/dashboard from the dashboard configuration.

1. User hovers overs a row with the required package/dashboard.
2. The system shows 'Delete' icon.
   > ⚠ It is not possible to remove package that included into another dashboard. In this case only dashboard itself can be deleted.
3. User clicks **Delete**.
4. The system shows confirmation popup with the following message: 'Remove 'package kind' 'package name' from the dashboard?'
5. The user clicks **[Remove]**
6. The system removes package/dashboard from the dashboard configuration (in case of removing dashboard, the system removes all child packages too)

After user adds required packages/dashboards, user can publish dashboard version:

1. User clicks **[Publish]**.
2. The system opens Publish popup with the following fields:
   - Version - required field.
   - Status - required field. Default value - draft
   - Labels - multiple value can be specified in the field. The user needs to click 'Enter' to finish adding label.
   - Previous release version - required field.
3. The user fills all required fields and clicks Publish.
4. The system publishes version and opens this dashboard version.

If user did not include any package/dashboard to dashboard configuration, then **[Publish]** button is disabled (with tooltip 'Add at least one package/dashboard to publish dashboard version.').

If user clicks **[Exit]** button, the system opens previous page from which user navigated to the current one. No changes in this case will be saved.

# Screen View
