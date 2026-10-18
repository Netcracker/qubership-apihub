package view

type User struct {
	Id        string `json:"id"`
	Email     string `json:"email,omitempty"`
	Name      string `json:"name,omitempty"`
	AvatarUrl string `json:"avatarUrl,omitempty"`
}
