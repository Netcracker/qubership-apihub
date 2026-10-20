# Delete Package

**Design Item ID**: DI-Portal-PS-004    
**Design Item Name**: Delete Package    
**Related Design Items**:   
**Related API**:   

- Delete package (DELETE /api/v2/packages/{packageId})

**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

This functionality allows users to delete a package.

# Start Point

1. User navigates to APIHUB Portal → specific workspace → specific group & Subgroup → Manage Package

# Execution

1. User opens **General** tab and clicks the **Delete** button.
   - If the user does not have "delete group/package" permission, then **Delete** button will be disabled with tooltip "You do not have permission to delete the package".
2. The system shows the confirmation message "Delete Package package name?".
3. User confirms the deletion by clicking **Delete** button.
4. The system shows the message "Package <Package name> is deleted" and deletes the package with all its versions:
   - API to delete package – DELETE /api/v2/packages/{packageId}
     - packageId = current package Id

# Screen View
