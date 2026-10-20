**Design Item ID**: DI-Portal-PKGVER-018  
**Design Item Name**: Export Package Version  
**Related Design Items**: -
**Related API**: 
  - Async export of version, document or operations group (POST /api/v1/export)
  - Get status of async export (GET /api/v1/export/{exportId}/status)

**Revision History:**  
| Date           | Description                         |
| -------------- | ----------------------------------- |
|12.03.2025      | 1) Initial version. 2) Export OAS specifications without OAS extensions (https://github.com/Netcracker/qubership-apihub/issues/73, https://github.com/Netcracker/qubership-apihub/issues/65)|

***
# Description
The functionality provides a user with the ability to export all documents in the package version.\
**Note:** The functionality is not supported for the dashboards (neither via UI nor API).

Start Point
1. User navigates to APIHUB Portal → workspace → group → package version

Execution
1. User clicks **Export** button in the page subheader. 
2. The system checks if current version has at least one OpenAPI document (documents with type types openapi-3-1, openapi-3-0, or openapi-2-0) and if so, go to step 3. If there is no OpenAPI document, the system immediately exports version, i.e. go directly to step 8.
3. The system opens Export Settings popup.
4. User selects file format from "File format for OpenAPI specifications" parameter: YAML, JSON or Interactive HTML. 
5. User hovers over info icon near Remove OAS extensions option.
6. The system shows tooltip: 
   - if there is least one allowed OAS extension defined on the package: "All extensions will be removed from the specifications except for the following: \<ext 1>, \<ext 2>, ..., \<ext N>".
     - in tooltip the system shows only unique list of extensions.
   - if there is no OAS extension defined on the package "All extensions will be removed from the specifications because no allowed list of extensions is defined for the package."
   - ===
   - API to get allowed list of OAS extensions for tooltip: GET /api/v1/packages/{packageId}/exportConfig 
7. User selects Remove OAS extensions or Preserve all OAS extensions option and clicks **Export** button.
8. The system exports the version. 
   - API to export version:
     - start export process - POST /api/v1/export 
       - packageId = \<current package id>
       - version = \<current version>
       - removeOasExtensions:
         - true if user selected "Remove OAS extensions" option
         - false if user selected "Preserve all OAS extensions" option
       - format = \<format selected by the user>
     - get export status / resulting file - GET /api/v1/export/{exportId}/status.
       - exportId = \<export process id returned in POST /api/v1/export>

The resulting file is ZIP file:
1. if package version has no OpenAPI specification (i.e. documents with type types openapi-3-1, openapi-3-0, or openapi-2-0), then ZIP contains:
   - all files (in raw format) from package version
2. if package version has OpenAPI specification(s), then ZIP contains:
   - if format = html:
     - all documents (in raw format) from package version, which are not OpenAPI specifications
     - OpenAPI specification file(s) in HTML format
     - index.html file which shows table of contents with all OpenAPI specifications
     - ls.html file with legal statement
     - resources folder with corporatelogo.png and style.css
   - if format = yaml:
     - all documents (in raw format) from package version, which are not OpenAPI specifications
     - OpenAPI specification file(s) in yaml format
   - if format = json:
     - all documents (in raw format) from package version, which are not OpenAPI specifications
     - OpenAPI specification file(s) in json format
3. If multiple files have the same name, a postfix " N" will be added, where N is 1, 2, 3, etc., for each duplicate file name.

# Security
User must have "read" permission for the package to export package version.

# Mockups
![export_version](https://github.com/user-attachments/assets/768ee98c-6869-4a45-b88e-421494d942e2)
