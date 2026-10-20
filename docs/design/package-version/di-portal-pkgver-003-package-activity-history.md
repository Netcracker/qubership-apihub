**Design Item ID**: DI-Portal-PKGVER-003  
**Design Item Name**: Package Activity History  
**Related Design Items**:
  - [Activity History](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90012-Activity-History)

**Related API**: 
  - Get activity history for the package (GET /api/v2/packages/{packageId}/activity)  

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

# Description
The functionality provides a user with the ability to view list of actions that are made by the users in the current package.

# Start Point
1. User navigates to APIHUB Portal → workspace → group → package version → Overview tab

# Execution
1. User clicks Activity History menu in package version.
2. The system opens Activity History page, which displays the following information for events in the current package:
   - date of the event
   - user who generated event
   - event message
   - ===
   - API to show activity history - GET /api/v2/packages/{packageId}/activity


The system allows searching events by user name or package name. See details about search in [Activity History](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90012-Activity-History).  

The system allows filtering events by event groups: See details about filters in [Activity History](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90012-Activity-History).

# Screen View