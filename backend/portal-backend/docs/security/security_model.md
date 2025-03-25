# Authentication
Apihub provides no anonymous access except some dedicated endpoints like shared document or it's own openapi spec.
System supports SSO and local(disabled in production mode) authentication.

At this moment SSO is implemented via SAML and tested with ADFS.

## SSO via Saml
![SSO auth flow](./sso_flow.png)

Notes:
* Apihub is using external authentication, but issuing its own Bearer token which is used for all requests to Apihub.
* Attributes "User-Principal-Name", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" are mandatory in SAML response.
* Attributes "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname", "thumbnailPhoto" are not mandatory, but expected in SAML response to fill the user profile.

In the result of successful IDP auth, user is synced to Apihub DB and bearer token is generated. The token validity period is limited to 12h, but it could be re-issued with corresponding refresh token.
The bearer token is used for authentication/authorization, it should be passed in "Authorization" header for any API calls.  
Library https://github.com/shaj13/go-guardian is used on the backend to issue and check JWT tokens.

## Internal(local) user management
Apihub supports local user management, but this functionality is disabled in production.  
(Production mode is configured via `PRODUCTION_MODE` env, false by default)

There's no registration page, but it's possible to create local user via API.
Local login is supported via UI page("/login") and dedicated endpoint ("/api/v2/auth/local").

## API keys
API key is another auth method intended for some automation.
Despite API key have "created by" and "created for" relations with users, it acts like a separate entity. 
E.g. if some version was published with API key, it's "created by" property will point to the key, not to user.

API key is bound to workspace/group/package/dashboard (see Data entities chapter), so it limit's the scope of the key.

However, system API keys exist as well, but it could be issued only by system administrators.

## Personal Access Tokens
PAT is equals to the bearer token when we talk about the permissions and user representation, but it have different properties in terms of TTL. Lifetime is configurable on creation and could be unlimited.  
PAT is intended for personal automation, for example for Qubership APIHUB VS Code extension ( https://github.com/Netcracker/qubership-apihub-vscode ).  
It's possible to delete a token.  
There's a limit for 100 PAT per user in the system.  

# Authorization
## Data entities
First of all let's define some terms/entities used in the following description.
'Workspace' is a top grouping entity which may contain groups, packages, dashboards.
'Group' is a grouping entity for a list of packages.
'Package' is a representation of a service with API.
'Dashboard' is representation for a set of particulate versions of services, i.e. it's like deployment.

## Roles and permissions
Apihub have built-in authorization model which is based on granted roles for workspace/group/package/dashboard and system roles.

```mermaid
flowchart LR
 subgraph role1["Package role A"]
    direction RL
        permission_1_1["permission 1"]
        permission_1_2["permission 2"]
  end
 subgraph role2["Package role B"]
    direction RL
        permission_2_1["permission 1"]
        permission_2_3["permission 3"]
  end
 subgraph system_role["System role"]
    direction BT
  end
 subgraph roles["Roles"]
    direction RL
        role1
        role2
        system_role
  end
    user["User"] --> roles
    role1 --> package_1["package/group/dashboard/workspace X"]
    role2 --> package_1
    system_role --> package_1 & package_2["package/group/dashboard/workspace *"] & system_actions["system actions"]
```

User have a set of roles for particular entity.  
Role have a set of permissions.  
Roles are defined system-wide by system administrators.  
Roles have a hierarchy which limits privilege escalation. 

Permission in required to execute some action like view content, publish version, create package, etc.

Workspace/group/package/dashboard have a default role that is assigned to a user which have no granted role.
Default role for most entities is "Viewer", i.e. read only access.

### Permissions
Permissions are hardcoded, i.e. it's not possible to modify permissions list via configuration.

Available permissions:
* read content of public packages	
* create, update group/package	
* delete group/package	
* manage version in draft status	
* manage version in release status	
* manage version in archived status	
* user access management	
* access token management

### Role management
Built-in roles:
* Viewer - read only role
* Editor - role with an ability to publish new version
* Owner - role with full ability to manage the entity, but without access configuration
* Admin - full access to the entity
* Release Manager - role to manage release versions

It's possible to create a new custom role with any set of permissions(but read permission is mandatory).

Example:  
![create role](create_role.png)

It's possible to edit or delete roles other than "Admin" and "Viewer":

![edit and delete controls](edit_and_delete_controls.png)

![edit role](edit_role.png)

![delete role](delete_role.png)

### Permissions configuration
Default permissions configuration:
![default permissions](roles.png)

The roles configuration provides flexibility to create required roles with required set of permissions.

### Roles inheritance
The assigned roles are inherited in the Workspace/group tree in a hierarchy approach approach.
I.e. nested entities inherit access control configuration from the parents, but can add extra roles.  
Inherited roles can't be revoked down the hierarchy.  

So the final set of roles for a particular package/dashboard a calculated as as sum of roles in the parent groups and workspace plus package/dashboard roles.  

#### Example:
Package tree contains the following hierarchy:
"g1"(workspace) -> "top group" -> "bottom group" -> "package 1"

In workspace "g1" user "x_APIHUB" have no role assigned, so default role "Viewer" is used.  
"x_APIHUB" is added to the "top group" as editor.

![inheritance example 1](inheritance_example_1.png)

The user access is inherited in the "bottom group" and "package 1":

![inheritance example 2](inheritance_example_2.png)
![inheritance example 3](inheritance_example_3.png)

Add role "Owner" for the specific package:

![inheritance example 4](inheritance_example_4.png)

### Roles hierarchy
The roles have an hierarchy which is used in access management.
User may not assign a role higher than his own. (It's not used in default hierarchy)

Default roles Hierarchy:
![roles hierarchy](roles_hierarchy.png)

#### Example:  
* Create a role "Gatekeeper" with permission to manage user access only. Move it to the top of hierarchy.  
* Add permission to manage roles to role "Editor".

![roles hierarchy example](roles_hierarchy_example.png)

In this case only "Admin" can add users with "Gatekeeper" role.  
"Gatekeeper" user is able to set to users any roles other than "Admin".  
"Editor" is able to set only "Editor" and "Viewer" roles.  
And all this logic is applied to package tree

## System roles
Apihub have a concept of system role - a role which is not bound/limited to workspace/group/package/dashboard entities and works system-wide.
Currently the only built-in system role is "system administrator".

It gives:
* access to all packages with maximum permissions
* access to admin-only actions

## Entity visibility(privacy)
Workspace/group/package/dashboard invisibility(privacy) is implemented via missing read permission.  
System have built-in role "none" which have no permissions at all.
So if the workspace/group/package/dashboard need to be private - the default role should be "none"

In UI it's managed by a "Private" checkbox:  
![alt text](private_checkbox.png)

In this case any user which have no granted roles for the entity, will not be able to see/retrieve it. It's managed on the API level.

The known gap related to privacy is global search: private workspaces/groups/packages/dashboards are excluded from search.