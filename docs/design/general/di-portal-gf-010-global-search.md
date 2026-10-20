**Design Item ID**: DI-Portal-GF-010   
**Design Item Name**: Global Search   
**Related Design Items**:   
**Related API**:   

- Global search (POST /api/v3/search/{searchLevel})

**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

The functionality allows users to search for API operations, documents and packages.

# Start Point

1. User navigates to APIHUB Portal

# Execution
1. User clicks Search in the header.
2. The system opens the Global Search panel with API Operations tab opened by default.
3. User types value in Search field.
4. The system searches for operations (see details in search by operations section):
  - API for search - POST /api/v3/search/{searchLevel}
    - searchLevel = operations
    - earchString = user's input
  - the system shows found operations if any.
  - if no operation was found, the system shows "No search results" message.

5. User selects Documents tab.
6. The system searches for documents (see details in search by documents section):

- API for search - POST /api/v3/search/{searchLevel}
  - searchLevel = documents
  - searchString = user's input
- the system shows found documents if any.
- if no documents was found, the system shows "No search results" message.

7. User selects Packages tab.
8. The system searches for packages (see details in search by packages section):

- API for search - POST /api/v3/search/{searchLevel}
  - searchLevel = packages
  - searchString = user's input
- the system shows found packages if any.
- if no packages was found, the system shows "No search results" message.

### Search by operations.

Search by documents is performed on API Operations tab. The system searches operations in packages only (i.e. the system does not search operation from dashboards, because in face dashboards do not have their own operations). Search scope:

- for REST operations - DI-Portal-GS-001: Search Scope for REST API
- for GraphQL operations - (not impl) DI-Portal-GS-002: Search Scope for GraphQL Operations

For the found API operation the system displays the following information:

- icon of API type
- full path to the API - Workspace / Group 1 / ... / Group N / Package / Version and Version status (status shall not be displayed if status = release). If path is too long and does not fit completely, then only Workspace, Package, Versions and Version status shall be displayed
- operation title
- HTTP method (for REST API)
- endpoint (for REST API)
- operation type (for GraphQL API)

When user clicks on found API operation, the system opens doc view for the appropriate version where selected operation is opened by default.

### Search by documents.

Search by documents is performed on Documents tab. The system can search by the following information:

- document title
- document labels
- document content (text)

For the found document the system displays the following information:\

- icon of file type
- full path to the API - Workspace / Group 1 / ... / Group N / Package / Version (Version Status). If path is too long and does not fit completely, then only Workspace, Package (Versions status shall be displayed)
- title
- labels (only those labels which matches search term)
- String (~70 characters) with first search term occurrence. If document content does not contain search term, then the system shall display the first N (~70 characters) characters. Of document content is empty, then system shall return 'No content' string

If the user clicks on the found document, the system opens appropriate version with this document selected in the left panel.

### Search by packages/dashboards and versions of packages/dashboards.

Search by packages/dashboards and versions of packages/dashboards is performed on Packages tab. The system can search by the following information:

- for packages:
  - Package name
  - Package description
  - Alias
  - Service name
- for versions:
  - Versions name
  - Version labels

For the found package, the system displays only its latest version.

For the each found package/dashboard or version of package/dashboard, the system displays the following information (each search result shall have the same height):

- full path to the package - Workspace / Group 1 / ... / Group N. If path is too long and does not fit completely, then only Workspace and the last package.
- Package name, version and status
- publication date
- service name, but:
  - if search term matches ID, then instead of service name the system shall display ID
  - if search term matches version label, then instead of service name the system shall display labels (which contains matching)
  - if search term matches both (service name and ID) or (service name and labels), then display service name
  - if search term matches both Id and labels, then display labels (which contains matching)
  - if there is no service name for package, return ID.

If user clicks on the found package/version, the system shall open Summary tab of this package version.

### Filtering panel.

Filtering panel

# Mockups
