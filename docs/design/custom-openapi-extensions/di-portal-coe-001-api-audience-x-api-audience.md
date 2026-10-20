**Design Item ID**: DI-Portal-COE-001  
**Design Item Name**: API Audience (x-api-audience)  
**Related Design Items**:

**Related API**: 
  - Get package version content (GET /api/v3/packages/{packageId}/versions/{version})
  - Store publish status (POST /api/v3/packages/{packageId}/publish/{publishId}/status)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description
The audience parameter is designed to categorize APIs based on their intended visibility and usage. This parameter allows API developers and managers to clearly define whether an API is internal, external, or unclassified. The audience parameter is set within the OpenAPI specification before publishing it to the APIHUB.

## How to Specify API Audience
The audience parameter is specified in the OpenAPI specification using an extension x-api-audience. "x-api-audience" must be specified only on document level (under "info" section). It can have the following values (case sensitive):
  - x-api-audience: internal: Indicates that the API is intended for internal use within the organization. Internal APIs are typically restricted in visibility and may bypass certain validations.
  - x-api-audience: external: Indicates that the API is intended for external use and may be consumed by third-party services or external teams.
  - x-api-audience: {any other value}: If any value other than internal or external is used, the API is considered as unknown.

If no audience value is specified, the API will default to external.

Here is an example of how to specify the audience in an OpenAPI specification:
```yaml
info:
  title: Example API
  version: "1.0.0"
  x-api-audience: internal
paths:
  /api/v1/resource:
    get:
      summary: Get resource details
    ...
```
In the example above, the overall API is defined as internal

## api-processor requirements:
1. For documents with types "openapi-3-1", "openapi-3-0", "openapi-2-0":
   - api-processor shall read value of "x-api-audience" extension from OAS (from "info" object) being published in Portal.
   - api-processor shall save value to (Store publish status - POST /api/v3/packages/{packageId}/publish/{publishId}/status):
     - BuildResult/operations.json/operations/apiAudience (value of "x-api-audience" shall be propagated to the all operations of current document)
   - The following values shall be saved:
     - internal: If "x-api-audience" extension value is equal to "internal" (case sensitive)
     - external: If "x-api-audience" extension value is equal to "external" (case sensitive) or if "x-api-audience" extension is not specified at all
     - unknown: if "x-api-audience" extension value neither "internal" nor "external"
2. For operations with apiType = graphql save "external" value to BuildResult/operations.json/operations/apiAudience
3. api-processor shall calculate and save information about the transitions of apiAudience values between the previous and current versions. For each combination of previous and current audience values where the audience value has changed, the builder shall record (BuildResult/comparisons.json/comparisons/operationsTypes/apiAudienceTransitions):
   - previousAudience: The audience value in the previous version ("external", "internal", or "unknown").
   - currentAudience: The audience value in the current version ("external", "internal", or "unknown").
   - operationsCount: The number of operations where the apiAudience has transitioned from previousAudience to currentAudience.

# Execution
1. User opens package/dashboard summary page.
2. The system displays "Number of operations for internal audience" parameter if there is at least one internal operation. If there are no such operations, then the system does not display this parameter.
   - The system shows warning icon, if there is at least one operation that changed audience (compared to previous release version) from external to internal.
   - The system shows tooltip when user hovers over warning icon: "API audience changed from external to internal for N operations".
3. The system displays "Number of operations for unknown audience" parameter if there is at least one unknown operation. If there are no such operations, then the system does not display this parameter.
   - the system shows warning icon, if there is at least one operation that changed audience (compared to previous release version) from external to unknown OR internal to unknown.
   - the system shows tooltip when user hovers over warning icon: "API audience changed from external/internal to unknown for N operations"

# Mockups
![audience_summary](https://github.com/user-attachments/assets/ac0db4fc-9892-40fa-bb3f-07fa22d29ad2)