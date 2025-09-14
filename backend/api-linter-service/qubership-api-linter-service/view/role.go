package view

type RolePermission string

const (
	ReadPermission                   RolePermission = "read"
	CreateAndUpdatePackagePermission RolePermission = "create_and_update_package"
	DeletePackagePermission          RolePermission = "delete_package"
	ManageDraftVersionPermission     RolePermission = "manage_draft_version"
	ManageReleaseVersionPermission   RolePermission = "manage_release_version"
	ManageArchivedVersionPermission  RolePermission = "manage_archived_version"
	UserAccessManagementPermission   RolePermission = "user_access_management"
	AccessTokenManagementPermission  RolePermission = "access_token_management"
)

type PackageRole struct {
	RoleId      string           `json:"roleId"`
	RoleName    string           `json:"role"`
	ReadOnly    bool             `json:"readOnly,omitempty"`
	Permissions []RolePermission `json:"permissions"`
	Rank        int              `json:"rank"`
}

type PackageRoles struct {
	Roles []PackageRole `json:"roles"`
}
