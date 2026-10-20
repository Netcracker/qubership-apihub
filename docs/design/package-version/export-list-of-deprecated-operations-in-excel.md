**Design Item ID**: DI-Portal-PKGVER-018  
**Design Item Name**: Export List of Deprecated Operations in Excel  
**Related Design Items**: -  
**Related API**: 
  - Export deprecated operations to xlsx file (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations/deprecated)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description
The functionality provides a user with the ability to export a list of deprecated operations (including deprecated items such as parameters, schema, enum values, or field definitions) within REST/GraphQL operations for the currently selected package version.

# Start Point
1. User navigates to APIHUB Portal → specific workspace → specific group → specific package version → Deprecated tab.

# Execution
1. User clicks **Export** button.  
2. The system displays two options to export the list of deprecated operations to Excel:  
   - All operations - all deprecated operations of current API type from package version will be exported.  
   - Filtered operations - only currently displayed deprecated operations will be exported.  
3. User selects the required option.  
4. The system exports the list of deprecated operations to an Excel file.  
   - API to export deprecated operations to xlsx file - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations/deprecated  
     - No query parameters are required if all deprecated operations will be exported.  
     - If exporting filtered operations, then query parameters and their usage are the same as in operations filtering.  
   - Excel file name is 'DeprecatedOperations_<package.id>_\<version>.xlsx'  
   - The following information is present in Excel file:  
   - Tab 1: Cover Page  
     - Package Name: The name of the package for which the Deprecated operations are exported.  
     - Title: "Deprecated API Operations"  
     - Version Number: The current version of the package.  
     - Status: The current status of the package version (e.g., Release, Draft etc.)  
     - Document Date: The date when the deprecated operations were exported (e.g., 2024-11-08).  
     - Owner: Netcracker  
   - Tab 2:  REST API/GraphQL (tab with deprecated operations, REST API or GraphQL tab depends on type of exported operations)  
   - Columns in REST API Tab:  
     - Package ID: Unique identifier of the package.  
     - Package Name: Name of the package containing the deprecated operations (e.g., APIHUB backend).  
     - Service Name: The associated service name of the package. (e.g., apihub-backend).  
     - Version: Version of the package (e.g., 2024.3).  
     - Operation Title: Title of the API operation that has been deprecated.  
     - Operation Method: HTTP method used for the operation (e.g., GET, POST, PUT, DELETE).  
     - Operation Path: Operation endpoint.  
     - Tag: OAS tag(s) of operations  
     - Kind: Indicates if the API is committed to follow backward compatibility policies or not (BWC or no-BWC).  
     - Deprecated Since: The version in which the operation/item was first deprecated (e.g., 2024.1).  
     - Deprecated Description: A brief description of the deprecated item, specifying the particular schema, field, or operation that has been deprecated.  
     - Additional Information: Any other relevant details regarding the deprecated operation or item.  
   - Columns in GraphQL Tab:  
     - Package ID: Unique identifier of the package.  
     - Package Name: Name of the package containing the deprecated operations (e.g., APIHUB backend).  
     - Service Name: The associated service name of the package. (e.g., apihub-backend).  
     - Version: Version of the package (e.g., 2024.3).  
     - Operation Title: Title of the GraphQL operation that has been deprecated.  
     - Operation Type: Type of the GraphQL operation (e.g., query, mutation, subscription).  
     - Operation Method: The method of the operation (e.g., availabilityCheck, changeQuoteState).  
     - Tag: Associated tags for the operation, if applicable.  
     - Kind: Indicates if the API is committed to follow backward compatibility policies or not (BWC or no-BWC).  
     - Deprecated Since: The version in which the operation/item was first deprecated (e.g., 2024.1).  
     - Deprecated Description: A brief note indicating that the item is deprecated, typically marked as "Deprecated" in the description.  
     - Additional Information: Further details about the deprecated item, such as its impact or guidance on alternatives, upcoming changes, or recommended actions.

# Screen View
tbd