# Revision History

**Design Item ID**: DI-Portal-PKGVER-002  
**Design Item Name**: Revision History  
**Related Design Items**: -  
**Related API**:

- Get the version revisions list (GET /api/v3/packages/{packageId}/versions/{version}/revisions)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

The functionality provides a user with the ability to view information about all revisions of current package.  
When user publishes new version, he/she creates first revision of this version. Every time when user publishes version
with the existing name, new revision of this version is created. Revisions are useful when you need to make changes (fix
problems) in the current version. All revisions are stored in Portal and user always can open old revision and check its
content. By default, user always works with latest revision and if user open some old revision, then version is
displayed as \<version@revision>.  
Revision cannot be deleted or changed.

## Start Point

1. User navigates to APIHUB Portal → specific workspace → specific group → specific package version → Overview tab

## Execution

1. User clicks Revision History menu in the package version.  
2. The system opens the Revision History page, which displays a list of all revisions in the current package version.
   - API to show the list of revisions: GET /api/v3/packages/{packageId}/versions/{version}/revisions
     - packageId = \<current package Id\>
     - version = \<current package version\>
   - For each revision, the system shows the following information:
     - Revision - number of the revision
     - Status - revision status
     - Labels - additional info
     - Publication Date - date when the revision was published
     - Published by - user who published the revision  
3. User fills the Search field.  
4. The system searches the revision according to the user input by revision labels or by the user who published.
   - API for search - GET /api/v3/packages/{packageId}/versions/{version}/revisions: "textFilter" query parameter.

If the user clicks on any revision (except the latest), the system opens this revision. The functionality is completely
the same as for the latest revision, the only difference is that the revision number is displayed near the version as
\<version@revision>. If the user hovers over such version revision, the system shows the message: *"You are viewing the
old revision @50 of the version"*

## Screen View

tbd
