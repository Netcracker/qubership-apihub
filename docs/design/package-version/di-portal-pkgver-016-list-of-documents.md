# DI-Portal-PKGVER-016 List of Documents

**Design Item ID**: DI-Portal-PKGVER-016  
**Design Item Name**: List of Documents  
**Related Design Items**: -  
**Related API**:

- Get version documents (GET /api/v2/packages/{packageId}/versions/{version}/documents)  

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description  

The system allows users to view all documents published to the current package version.

## Start Point  

1. User navigates to APIHUB Portal → workspace → group → package version.

## Execution

1. User opens Documents tab.  
2. The system displays the list of documents published in the current package version.  
   - All document are grouped by type (if package version does not contain document for a specific group, that group
     will not be displayed):  
     - Markdown group: contains documents with type = `markdown`.  
     - OpenAPI group: contains documents with type = openapi-3-1 / openapi-3-0 / openapi-2-0.  
     - GraphQL group: contains documents with type = introspection / graphql-schema.  
     - Other group: contains documents with type = unknown.  
   - The system displays groups in a predefined order as listed above, and documents within each group are sorted in
     ascending alphabetical order.  
   - For each document the system displays:  
      - for OpenAPI document: title and version. Title is value from specification from info.title parameter. Version is
        is value from specification from info.version parameter.  
      - for any other document: filename.  
   - API to display list of documents - GET /api/v2/packages/{packageId}/versions/{version}/documents:  
      - packageId = id of the current package  
      - version = current package version  
3. User types required document title in Search field.  
4. The system searches for document by its title.  
   - API to display documents - GET /api/v2/packages/{packageId}/versions/{version}/documents:  
     - packageId = id of the current package  
     - version = current package version  
     - textFilter = \<user's input in Search field>

## Screen View

tbd
