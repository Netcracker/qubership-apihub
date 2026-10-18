package view

import "fmt"

const SysadmRole = "System administrator"

const AdminRoleId = "admin"
const EditorRoleId = "editor"
const ViewerRoleId = "viewer"
const NoneRoleId = "none"

// AllPackagesApikeyScope is the package id of an api key that is not limited to a single package subtree.
const AllPackagesApikeyScope = "*"

type PackageReadScopeKind int

const (
	// PackageReadScopeNone is the zero value, so a scope that was never resolved denies everything.
	PackageReadScopeNone PackageReadScopeKind = iota
	// PackageReadScopeAll applies no package restriction: a sysadmin, or an api key scoped to all packages.
	PackageReadScopeAll
	// PackageReadScopeSubtree limits reading to SubtreeRoot and its descendants: an api key scoped to a package.
	PackageReadScopeSubtree
	// PackageReadScopeUser limits reading to the packages a user may read via role and default role inheritance.
	PackageReadScopeUser
)

func (k PackageReadScopeKind) String() string {
	switch k {
	case PackageReadScopeNone:
		return "none"
	case PackageReadScopeAll:
		return "all"
	case PackageReadScopeSubtree:
		return "subtree"
	case PackageReadScopeUser:
		return "user"
	default:
		return fmt.Sprintf("unknown(%d)", int(k))
	}
}

type PackageReadScope struct {
	Kind        PackageReadScopeKind
	SubtreeRoot string // set for PackageReadScopeSubtree only
}

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
