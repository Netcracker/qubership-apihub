package view

const SysadmRole = "System administrator"

const AdminRoleId = "admin"
const EditorRoleId = "editor"
const ViewerRoleId = "viewer"
const NoneRoleId = "none"

type PackageRole struct {
	RoleId      string   `json:"roleId"`
	RoleName    string   `json:"role"`
	ReadOnly    bool     `json:"readOnly,omitempty"`
	Permissions []string `json:"permissions"`
	Rank        int      `json:"rank"`
}

type PackageRoles struct {
	Roles []PackageRole `json:"roles"`
}

type PackageRoleCreateReq struct {
	Role        string   `json:"role" validate:"required"`
	Permissions []string `json:"permissions" validate:"required"`
}

type PackageRoleUpdateReq struct {
	Permissions *[]string `json:"permissions"`
}

type PackageRoleOrderReq struct {
	Roles []string `json:"roles" validate:"required"`
}
