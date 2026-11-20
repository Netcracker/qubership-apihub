# DI-Portal-PS-007 Configure List of OAS Extensions Preserved on Export

**Design Item ID**: DI-Portal-PS-007  
**Design Item Name**: Configure List of OAS Extensions Preserved on Export  
**Related Design Items**: -  
**Related API**:

- GET /api/v1/packages/{packageId}/exportConfig
- PATCH /api/v1/packages/{packageId}/exportConfig

**Revision History:**  

| Date       | Description                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 08-03-2025 | initial version. <https://github.com/Netcracker/qubership-apihub/issues/64>, <https://github.com/Netcracker/qubership-apihub/issues/71> |

***

## Description

OpenAPI specification can be extended via OAS extensions. These extensions can contain any API related information
including some internal information. If specifications are shared with stakeholders, there can be cases when such
internal information must not be shared with them.
APIHUB allows users to export OpenAPI specifications without those OAS extensions that are not defined in the allowed
list of OAS extensions.
Current page contains information about configuration of allowed list of OAS extensions (i.e. extensions that shall be
preserved in OAS specifications during their export).

**Note:** on this page the word "package" refers to all kinds of packages - workspaces, groups, dashboards, and
packages.

**Glossary:**

- Inherited extension - extension that was inherited from parent package. For such an extension GET
  /api/v1/packages/{packageId}/exportConfig returns packageId that is not equal to the packageId of the current package.
If the GET method returns multiple identical extensions, none of their packageIds will match the identifier of the
current package.  
It is impossible to change extension that was inherited.
- Direct extension - extension that is directly specified for the current package and there is no identical extension
  which was inherited. For such an extension GET /api/v1/packages/{packageId}/exportConfig returns packageId that is
  equal to the packageId of the current package.
- Mixed extension - extension that was inherited from parent package(s) **and** identical extension was directly
  specified for the current package. In this case GET /api/v1/packages/{packageId}/exportConfig returns one extension
  multiple times - one of which has a packageId that is equal to the current packageId and at least one of which has a
  packageId that is not equal to the current package.

## Start Point

1. Workspace/group/dashboard/package settings page -> Export Settings tab

## Execution

1. User opens Export Settings tab.
2. The system shows "List of OAS Extensions Preserved on Export" parameter with the list of existing **unique** OAS
   extensions (including inherited/mixed extensions).
   - API to show list of extensions: GET /api/v1/packages/{packageId}/exportConfig.
3. User hovers over "OAS Extensions Preserved on Export" parameter.
4. The system shows Edit button.
5. User clicks **Edit** button.
6. The system opens Edit List of OAS Extensions Preserved on Export popup.  
   - In popup the system shows **unique** list of existing OAS extensions (including inherited/mixed extensions).
     Extensions are sorted in the following way:
     1. firstly, inherited extensions sorted in alphabetical order are displayed.
     2. secondary, direct/mixed extensions sorted in alphabetical order are displayed.
   - Inherited extensions are disabled and cannot be removed.
   - Direct extensions are enabled and can be removed.
   - Mixed extension is displayed as own package extension (i.e., it is not disabled and can be removed).
7. User hovers over inherited (disabled) or mixed OAS extension.
8. The system shows tooltip with the list of packages from which the extension was inherited.
9. User hovers over direct extension and deletes it.
10. The system removes the value from popup.
11. User hovers over mixed extension and deletes it.
12. The extension becomes inherited extension and displays appropriately (see points 6-8).
    - Note: in fact, the system removes the value from popup, but since the same extension value was inherited from
      parent package(s), it is still displayed in popup, but now it becomes inherited extension and it displays
      appropriately.
13. User enters an extension that already exists (among all extensions, including inherited/mixed ones).
14. The system shows an error message: "\<extension\>" already exists.
    - Note: this validation is available only on client side; server validates uniqueness of extensions only among
      direct package extensions.
15. User enters unique (among all extensions, including inherited/mixed ones) extension and clicks **Save**.
16. The system saves the value and closes popup.
    - API to update extensions PATCH /api/v1/packages/{packageId}/exportConfig:
      - The full list of direct extensions must be included in "allowedOasExtensions" parameter in the request, as the
        request replaces the items in the array rather than adding to them.

## Security

The user must have create_and_update_package permission for the package to edit "List of OAS Extensions Preserved on
Export" parameter. If user does not have permission, the Edit button is disabled and the system shows the following
tooltip on hover: "You do not have permission to edit the package"

## Mockups

tbd
