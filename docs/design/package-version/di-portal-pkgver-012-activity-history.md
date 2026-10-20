# DI-Portal-PKGVER-012 Activity History

**Design Item ID**: DI-Portal-PKGVER-012  
**Design Item Name**: Activity History  
**Related Design Items**:

**Related API**: 
  - Get activity history (GET /api/v4/activity)
  - Get activity history for the package (GET /api/v4/packages/{packageId}/activity)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

# Description
The functionality provides users with the ability to track and view actions taken by users within APIHUB Portal. This feature captures various events and allows the users to review them in a chronological format.  
List of events that the system can track is listed in the table below in "eventType" column.  
For each event the system generates appropriate message. Messages are listed in the table below in "eventMessage" column.  
Each event type is related with event groups; user can filter events by event groups. Mapping between event type and and event group see in the table below in "eventType" and "eventGroup" columns.  

eventType              | eventMessage                                   | eventGroup              |
---------------------- | ---------------------------------------------- | ----------------------- |
grant_role | \<User name> added \<member name> with <array [role]> role(s) to the \<package name> \<kind> | Package members
update_role | \<User name> updated role(s) of \<member name> in the \<package name> \<kind> | Package members
delete_role | \<User name> deleted \<member name> with <array [role]> role(s) from the \<package name> \<kind> | Package members
generate_api_key | \<User name> generated access token in the \<package name> \<kind> | Package security
revoke_api_key | \<User name> revoked access token in the \<package name> \<kind> | Package security
publish_new_version | \<User name> published \<version name> version in \<status name> status in the \<package name> package - for the first publication | New version
publish_new_revision | \<User name> published \<@revision> revision of \<version name> version in \<status name> status in the \<package name> package - for revisions starting from the second revision | Package version
patch_version_meta | \<User name> changed <array [parameter]> for \<versions name> version of \<package name> package. <br><br>enum for parameter:<br>- status<br>- labels | Package version
delete_version | \<User name> deleted \<version name> version in \<status> status in \<package name> package | Package version
create_package | \<User name> created \<package name> \<kind> | Package management
delete_package | \<User name> deleted \<package name> \<kind> | Package management
patch_package_meta | \<User name> updated <array [parameter]> of \<package name> package. <br><br>enum for parameter:<br>-name<br>-description<br>-serviceName<br>-imageUrl<br>-defaultRole | Package management
delete_revision | Deleted \<@revision> revision of \<version name> version in \<status name> status in the \<package name> package | Package version
update_document_shareability | \<User name> changed shareability status of "\<document name>" to \<new status> in \<@revision> revision of \<version name> version of \<package name> package. <br><br>enum for new status:<br>- shareable<br>- non-shareable<br>- unknown | Package version


The system allows the users to search events by user name or package name.
1. User enters value in search field.
2. The system searches event by user name and package name.
   - API for search - GET /api/v2/activity ([for Activity History in Main Page](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90GF%E2%80%90007-Activity-History-in-Main-Page)) or GET /api/v2/packages/{packageId}/activity (for [Package Activity History]()):
     - textFilter = \<user input\>  

The system allows the use to filter events by event group. Available filter options:
1. User clicks filter icon.
2. The system shows the following filtering options: 
   - Package management: Events related to package creation, deletion, and metadata updates.
   - New version: Events for publishing new versions or revisions of packages.
   - Package version: Events related to version metadata changes, deletions, document shareability updates, etc.
   - Package security: Events for generating and revoking access tokens.
   - Package members: Events related to role assignments, updates, and deletions.
3. The user selects one or multiple filtering options.
4. The system filters events by the selected options: 
   - API for filtering - GET /api/v2/activity (for [Activity History in Main Page](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90GF%E2%80%90007-Activity-History-in-Main-Page)) or GET /api/v2/packages/{packageId}/activity (for [Package Activity History]())
     - types = \<filtering option(s) selected by the user\>  

User can see activity history for the specific package in package version page (see more in [Package Activity History]()) or for some set of packages on main page (see more in [Activity History in Main Page](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90GF%E2%80%90007-Activity-History-in-Main-Page))
