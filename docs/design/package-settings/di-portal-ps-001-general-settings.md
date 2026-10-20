# General Settings

**Design Item ID**: DI-Portal-PS-001   
**Design Item Name**: General Settings    
**Related Design Items**: -     
**Related API**:   


- Get package by ID (GET /api/v2/packages/{packageId})
- Change package's parameters (PATCH /api/v2/packages/{packageId})

**Revision History:**    

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

The functionality allows users to view and modify information about package parameters.

# Start Point

1. User navigates to APIHUB Portal → specific workspace → specific group → specific package settings.

# Execution

1. User opens General tab in package settings.
2. The system opens the general page, which displays information about the parameters of the current package.

   - API to show information on General page - GET /api/v2/packages/{packageId}
     - packageId = сurrent package Id
   - The system shows the following parameters:
     - Package Name
     - Service Name - The associated service name of the package. This parameter is required if you publish versions to APIHUB via the Agent. The service name specified in the package must match the service name in CMDB and Kubernetes (k8s). The Agent uses this service name to create a mapping between the microservices discovered in the environment and the baselines (reference data) configured in APIHUB. The service name can only be added and is not editable once set.
     - Package Visibility - Defines whether the package is public or private. If the visibility is public, the default role for the user is Viewer (any APIHUB user has at least read access to the package content). If the visibility is private, the package is visible only to the creator, and by default, only the creator has CRUD permissions.
     - Description - A brief description of the package.
     - Alias
     - Parent Group - The group that the package belongs to. The parent group cannot be changed via the Edit button.
     - Default Release Version: See DI-Portal-PS-005: Default Release Version
     - Release Version Pattern: See DI-Portal-PS-006: Define Release Version Pattern

3. User clicks Edit button. If the user does not have permission to edit the package, the Edit button will be disabled amd When the user hovers over the disabled button, a tooltip will appear with the message: "You do not have permission to edit the package."

4. The system allows editing the following fields:

   - Package Name
   - Service Name (only if value is currently empty)
   - Package Visibility
   - Description
   - Default Release Version
   - Release Version Pattern

5. User changes parameter values and clicks **Save** button.

6. The system saves the changes and displays a message: "Package has been updated",
   confirming that the updated parameter values have been successfully saved.
   - API to edit package's parameters - PATCH /api/v2/packages/{packageId}
     - packageId = current package Id
     - in the request body, the system sends only those parameters whose values were changed.

# Screen View
