package view

type PersonalAccessTokenStatus string

type PersonalAccessTokenItem struct {
	Id        string                    `json:"id"`
	Name      string                    `json:"name"`
	ExpiresAt string                    `json:"expiresAt"`
	CreatedAt string                    `json:"createdAt"`
	Status    PersonalAccessTokenStatus `json:"status"`
}

type PersonalAccessTokenExtAuthView struct {
	Pat         PersonalAccessTokenItem `json:"personalAccessToken"`
	User        User                    `json:"user"`
	SystemRoles []string                `json:"systemRoles"`
}
