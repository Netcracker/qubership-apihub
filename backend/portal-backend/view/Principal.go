package view

type PrincipalUserView struct {
	PrincipalType PrincipalType `json:"type"`
	User
}
type PrincipalApiKeyView struct {
	PrincipalType PrincipalType `json:"type"`
	ApiKey
}

type PrincipalJobView struct {
	PrincipalType PrincipalType `json:"type"`
	Job
}

type PrincipalType string

const PTUser PrincipalType = "user"
const PTApiKey PrincipalType = "apiKey"
const PTJob PrincipalType = "job"
