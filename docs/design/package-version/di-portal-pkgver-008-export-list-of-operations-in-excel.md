**Design Item ID**: DI-Portal-PKGVER-008  
**Design Item Name**: Export List of Operations in Excel  
**Related Design Items**:
  - [DI‐Portal‐PKGVER‐011: List of Operations](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90011-List-of-Operations)

**Related API**: 
  - Export operations to xlsx file (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description
The functionality provides a user with the ability to export a list of REST/GraphQL operations from the selected package version to an Excel file.

# Start Point
1. User navigates to APIHUB Portal → workspace → group → package version → API Operations tab

# Execution
1. User clicks **Export** button.  
2. The system displays two options to export operations to Excel:  
   - All operations - all operations of the current API type from the package version will be exported.  
   - Filtered operations - only currently displayed operations will be exported.  
3. User selects the required option.  
4. The system exports operations to Excel.
   - API to export operations to xlsx file - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations  
     - No query params are required if all operations will be exported.  
     - If it is needed to export filtered operations, the query params and their usage are the same as in operations filtering.  
   - Excel file name is 'APIOperations_<package.id>_<version>.xlsx'.  
   - The following information is present in the Excel file:  
     - Tab 1: Cover Page  
       - Package Name: The name of the package for which the API operations are exported.  
       - Version Number: The version of the package.  
       - Status: The current status of the package version (e.g., Release, Draft, etc.).  
       - Document Date: The date when the operations were exported.  
       - Owner: Netcracker  
     - Tab 2: REST API/GraphQL (tab with operations, REST API or GraphQL depends on the type of exported operations)  
       - Columns in REST API Tab:  
         - Package ID: Unique identifier of the package.  
         - Package Name: Name of the package.  
         - Service Name: The associated service name of the package.  
         - Version: Version of the package.  
         - Operation Title: Title of the API operation.  
         - Operation Method: HTTP method (e.g., GET, POST, PUT, DELETE) of the operation.  
         - Operation Path: Operation endpoint.  
         - Tag: OAS tag(s) of operations.  
         - Kind: Indicates if the API follows backward compatibility policies or not (BWC or no-BWC).  
         - Deprecated: Whether the operation is deprecated (true/false).  
        - Columns in GraphQL Tab:  
          - Package ID: Unique identifier for the package.  
          - Package Name: Name of the package.  
          - Service Name: The associated service name for the package.  
          - Version: Version of the package.  
          - Operation Title: Descriptive name of the API operation.  
          - Operation Method: The specific method used for the operation (e.g., AVAILABILITYCHECK, CHANGEQUOTESTATE, etc.).  
          - Operation Type: The type of operation (e.g., query, mutation).  
          - Kind: Indicates if the API is committed to follow backward compatibility policies or not (BWC or no-BWC).  
          - Deprecated: Whether the operation is deprecated (true/false).

# Screen View
tbd