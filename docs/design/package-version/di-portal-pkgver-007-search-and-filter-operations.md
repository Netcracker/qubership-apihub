# DI-Portal-PKGVER-007 Search and Filter Operations

**Design Item ID**: DI-Portal-PKGVER-007  
**Design Item Name**: Search and Filter Operations  
**Related Design Items**:
  - [DI‐Portal‐PKGVER‐011: List of Operations
](di-portal-pkgver-011-list-of-operations.md)
  - [DI‐Portal‐PKGVER‐014: List of Deprecated Operations](di-portal-pkgver-014-list-of-deprecated-operations.md)

**Related API**: 
  - Get list of operations (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/operations)
  - Export operations to xlsx file (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description
The functionality provides a user with the ability to search and filter operations API. The Portal provides a filtering panel that allows the user to filter operations on the following tabs: API Operations, API Changes, Deprecated tabs. 

# Start Point
1. User navigates to APIHUB Portal → workspace → group → package version → API Operations tab / API Changes / Deprecated tab

# Execution
User can filter operations using the left filtering panel. If at least one filter is applied to the list of operations, then the filter button will highlight it.

1. By default, the system shows left panel with filters. Current shown/hidden state of filter panel is persisted in current session.  
2. User clicks **Show/hide filter panel**.
3. The system hides filter panel.  
4. User clicks **Show/hide filter panel**.  
5. The system shows filter panel with the following filters:
   - Filter by Group - field is disabled if package version does not have any [operations group](di-portal-pkgver-009-list-of-operations-groups.md). If at least one (manual or REST path prefix) group exists, the system shows the following options:
     - All - selected by default, shows all operations.  
     - Ungrouped - of selected, shows operations, which are not included in any group.  
     - \<list of groups> - after the first two options, the system shows list of all groups from current package version.  
    - Filter by API Kind:  
      - All - selected by default, shows all operations  
      - BWC  
      - No-BWC  
      - Experimental
    - Filters by Tag - section shows list of all tags from all operations. If there is at least one operation without tag, then tag list will contain "default" value. The system allows searching tag by its name ('contains' criterion, case insensitive).  
6. User selects required filtering options.  
7. The system provides list of filtered operations based on selected parameters.  
   - API to show list of filtered operations on API Operations tab - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/operations:
     - emptyGroup = true, if 'Filter by Group' = Ungrouped.
     - group = <selected group name in 'Filter by Group'>
     - kind = <value selected in 'Filter by API Kind'>
     - emptyTag = true`, if 'Filters by Tag' = default (i.e., operation without a tag).
     - tag = <selected tag name in 'Filters by Tag'>
   - API to show list of filtered operations on Deprecated tab - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated:
     - emptyGroup = true, if 'Filter by Group' = Ungrouped.
     - group = <selected group name in 'Filter by Group'>
     - kind = <value selected in 'Filter by API Kind'>
     - emptyTag = true`, if 'Filters by Tag' = default (i.e., operation without a tag).
     - tag = <selected tag name in 'Filters by Tag'>
   - API to show list of filtered operations on API Changes tab - GET /api/v3/packages/{packageId}/versions/{version}/{apiType}/changes:
     - emptyGroup = true, if 'Filter by Group' = Ungrouped.
     - group = <selected group name in 'Filter by Group'>
     - kind = <value selected in 'Filter by API Kind'>
     - emptyTag = true`, if 'Filters by Tag' = default (i.e., operation without a tag).
     - tag = <selected tag name in 'Filters by Tag'>

User can search operations using the Search Operations field. The system is able to search: 
  - REST operations
      - by title, path, method
      - custom metadata - OAS extension specified on operation level only. Search is applicable for extension with scalar value only. Search us performed by exact match of "key: value"
  - GraphQL operations by title, method and type.

1. User types the search criterion in the Search Operations panel.  
2. The system displays a list of the matching operations.
   - API to show the list of operations based on the search on API Operations tab - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/operations:  
     - textFilter = \<user input in Search Operations field>.
   - API to show the list of operations based on the search on Deprecated tab - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated:
     - textFilter = \<user input in Search Operations field>.
   - API to show the list of operations based on the search on API Changes tab - GET /api/v3/packages/{packageId}/versions/{version}/{apiType}/changes:
     - textFilter = \<user input in Search Operations field>.

# Screen View
tbd