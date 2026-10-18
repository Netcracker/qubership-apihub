package view

type User struct {
	Id        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarUrl string `json:"avatarUrl"`
}

type ExtendedUser_deprecated struct {
	User
	GitIntegrationStatus  bool   `json:"gitIntegrationStatus"`
	SystemRole            string `json:"systemRole"`
	AccessTokenTTLSeconds *int   `json:"accessTokenTTLSeconds,omitempty"`
}

type ExtendedUser struct {
	User
	SystemRole            string `json:"systemRole"`
	AccessTokenTTLSeconds *int   `json:"accessTokenTTLSeconds,omitempty"`
}

type UserAvatar struct {
	Id       string
	Avatar   []byte
	Checksum [32]byte
}

type Users struct {
	Users []User `json:"users"`
}

type LdapUsers struct {
	Users []LdapUser
}

type LdapUser struct {
	Id     string
	Email  string
	Name   string
	Avatar []byte
}

type UsersListReq struct {
	Filter string `json:"filter"`
	Limit  int    `json:"limit"`
	Page   int    `json:"page"`
}

type InternalUser struct {
	Id                 string `json:"-"`
	Email              string `json:"email" validate:"required"`
	Name               string `json:"name"`
	Password           string `json:"password" validate:"required"`
	PrivateWorkspaceId string `json:"privateWorkspaceId"`
}

type LdapSearchFilterReq struct {
	FilterToValue map[string]string
	Limit         int
}
