package view

const ActionAddRole = "add"
const ActionRemoveRole = "remove"

type PackageMemberRoleView struct {
	RoleId      string        `json:"roleId"`
	RoleName    string        `json:"role"`
	Inheritance *ShortPackage `json:"inheritance,omitempty"`
}

type PackageMember struct {
	User  User                    `json:"user"`
	Roles []PackageMemberRoleView `json:"roles"`
}

type PackageMembers struct {
	Members []PackageMember `json:"members"`
}

type ShortPackage struct {
	PackageId string `json:"packageId"`
	Kind      string `json:"kind"`
	Name      string `json:"name"`
}

type AvailablePackagePromoteStatuses map[string][]string // map[packageId][]version status

type PackageMembersAddReq struct {
	Emails  []string `json:"emails" validate:"required"`
	RoleIds []string `json:"roleIds" validate:"required"`
}

type PackageMemberUpdatePatch struct {
	RoleId string `json:"roleId" validate:"required"`
	Action string `json:"action" validate:"required"`
}

type PackagesReq struct {
	Packages []string `json:"packages"`
}
