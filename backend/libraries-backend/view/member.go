package view

type MemberUser struct {
	UserId string `json:"userId"`
	Name   string `json:"name,omitempty"`
}

// InheritedFrom names the portal-backend package group a role comes from when the role is not assigned
// on the library itself.
type InheritedFrom struct {
	PackageId string `json:"packageId"`
	Kind      string `json:"kind,omitempty"`
	Name      string `json:"name,omitempty"`
}

type MemberRole struct {
	RoleId        string         `json:"roleId"`
	Role          string         `json:"role,omitempty"`
	InheritedFrom *InheritedFrom `json:"inheritedFrom,omitempty"`
}

type Member struct {
	User  MemberUser   `json:"user"`
	Roles []MemberRole `json:"roles"`
}

type Members struct {
	Members []Member `json:"members"`
}

type SetMemberRolesReq struct {
	RoleIds []string `json:"roleIds"`
}
