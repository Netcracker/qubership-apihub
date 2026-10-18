package view

type ApihubApiKeyView struct {
	Id        string   `json:"id"`
	PackageId string   `json:"packageId"`
	Name      string   `json:"name"`
	Revoked   bool     `json:"revoked"`
	Roles     []string `json:"roles"`
}
