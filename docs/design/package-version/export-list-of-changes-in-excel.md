# Export List of Changes in Excel

**Design Item ID**: DI-Portal-PKGVER-013  
**Design Item Name**: Export List of Changes in Excel  
**Related Design Items**: -  
**Related API**: 
  - Export API changes to xlsx file (GET /api/v3/packages/{packageId}/versions/{version}/{apiType}/export/changes)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description  
The functionality provides a user with the ability to export a list of changes in REST/GraphQL operations between currently selected version and the previous release version, if specified.



# Start Point  
1. User navigates to APIHUB Portal → specific workspace → specific group → specific package version → API Changes tab.

# Execution
1. User clicks **[Export]** button.  
2. The system displays two options to export the list of changed operations to Excel:  
   - All changes - all changed operations from the current package version will be exported.  
   - Filtered changes - only currently displayed (filtered) changes will be exported.  
3. User selects the required option.  
4. The system exports the list of changed operations to an Excel file.  
   - API to export operations to xlsx file - GET /api/v3/packages/{packageId}/versions/{version}/{apiType}/export/changes  
     - No query parameters are required if all changed operations will be exported.  
     - If exporting filtered changes, then query parameters and their usage are the same as in change filtering.  
    - Excel file name is 'APIChanges_<package.id>_<version>.xlsx'  
    - The following information is present in Excel file:  
    - Tab 1: Cover Page  
      - Package Name: The name of the package for which the API changes are exported.  
      - Title: "API changes between versions \<previous release version> and \current package version>"  
      - Version Number: The current version of the package.  
      - Status: The current status of the package version (e.g., Release, Draft etc.).  
      - Document Date: The date when the changes were exported (e.g., 2024-11-08).  
      - Owner: Netcracker  
    - Tab 2: Summary  
      - Package ID: Unique identifier of the package.  
      - Package Name: The name of the package for which the changed operations are exported.  
      - Service Name: The service name associated with the package.  
      - Version: The current version of the package.  
      - Previous Version: Previous release version.  
      - API Type: Indicates the type of API (e.g., rest).  
      - Number of operations with breaking changes: Shows the count of operations that have at least one breaking change.  
      - Number of operations with semi-breaking changes: Shows the count of operations that have at least one semi-breaking change.  
      - Number of operations with non-breaking changes: Shows the count of operations that have at least one non-breaking change.  
      - Number of operations with deprecated changes: Shows the count of operations that have at least one deprecating change.  
      - Number of operations with annotation changes: Shows the count of operations with at least one annotation change.  
      - Number of operations with unclassified changes: Shows the count of operations with at least one unclassified change.  
    - Tab 3:  REST API/GraphQL (tab with changed operations, REST API or GraphQL tab depends on type of exported operations)  
    - Columns in REST API Tab:  
      - Package ID: Unique identifier of the package.  
      - Package Name: Name of the package for which the API changes are listed (e.g., APIHUB backend).  
      - Service Name: Service name of the package (e.g., apihub-backend).  
      - Version: The current version of the package being compared (e.g., 2024.3).  
      - Previous Version: The version of the package with which the current version is compared (e.g., 2024.2).  
      - Operation Title: Title of the API operation that has changed.  
      - Operation Method: HTTP method used for the operation (e.g., GET, POST, PUT, DELETE).  
      - Operation Path: Operation endpoint.  
      - Operation Action: Indicates the type of action performed on the operation (add/change/remove).  
      - Change Description: A human-readable summary of the specific change made in the operation.  
      - Change Severity: Severity level of the change (e.g., annotation, breaking).  
      - API Kind: Indicates if the API is committed to follow backward compatibility policies or not (BWC or no-BWC).  
    - Columns in GraphQL Tab:  
      - Package ID: Unique identifier of the package.  
      Package Name: Name of the package for which the API changes are listed.  
      - Service Name: Service name of the package.  
      - Version: The current version of the package being compared (e.g., 2024.3).  
      - Previous Version: The version of the package with which the current version is compared (e.g., 2024.2).  
      - Operation Title: Title of the API operation that has changed.  
      - Operation Method: The method of the operation (e.g., availabilityCheck, changeQuoteState).  
      - Operation Type: Type of the operation (query/mutation/subscription)  
      - Operation Action: Indicates the type of action performed on the operation (add/change/remove).  
      - Change Description: A human-readable summary of the specific change made in the operation.  
      - Change Severity: Severity level of the change (e.g., annotation, breaking).  
      - API Kind: Indicates if the API is committed to follow backward compatibility policies or not (BWC or no-BWC).

# Screen View
tbd