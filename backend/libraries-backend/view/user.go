package view

type User struct {
	Id        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarUrl string `json:"avatarUrl"`
}
