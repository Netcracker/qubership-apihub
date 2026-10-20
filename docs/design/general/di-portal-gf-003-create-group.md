**Design Item ID**: DI-Portal-GF-003  
**Design Item Name**: Create Group  
**Related Design Items**: -  
**Related API**: 
- Create a new package ([POST /api/v2/packages](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/api/Public%20Registry%20API.yaml#L1010))
- Get packages list ([GET /api/v2/packages](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/api/Public%20Registry%20API.yaml#L1073))

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

# Description
The functionality provides a user with the ability to create group.  
Group is grouping entity for packages, dashboards and another groups. Group can be created under workspace or another group. Within a workspace, groups help further categorize APIs based on functional domains or specific areas of focus. Groups provide a flexible way to organize APIs and make them easily discoverable within the API Management portal.

# Start Point
1. User navigates to APIHUB Portal → specific workspace → specific group

# Execution
1. User clicks **Create** → **Group** button.
2. The system opens Create Group popup with the following fields:
   - Name - required field.
   - Workspace/Parent Group - required field. By default, the value equals to the current group/workspace. It is possible to select group only under current workspace.
     - API to select group - [GET /api/v2/packages](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/api/Public%20Registry%20API.yaml#L1073):
       - kind = group
       - showAllDescendants = true
       - textFilter = <user input in Workspace/Parent Group field>.
   - Alias - required field. Alias must be unique within parent group/workspace. If alias is not unique, the system shows the following message when user clicks Create button: "Alias "%s" is already reserved. Please use another alias."
   - Description - short summary for the group.
   - Private - if checked, then group will be private and by default will be visible to current user only. If parent group/workspace is public, then current group will also be public even if private checkbox 
3. User clicks **Create**.
4. The system creates new package
   - API to create group - [POST /api/v2/packages](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/api/Public%20Registry%20API.yaml#L1010):
   - parentId = <Id of workspace/group under which current group is created>
   - kind = group
   - name = \<user input from Name field\>
   - alias = \<user input from Alias field\>
   - description = \<user input from Description field\>
   - defaultRole. If Private checkbox is selected, then defaultRole = none. Otherwise, defaultRole = viewer.
5. The system opens newly create group.

# Screen View
<img width="446" alt="group" src="https://github.com/user-attachments/assets/ae5711d2-3814-4cf0-91fa-1eeea6974a1f" />
