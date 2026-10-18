package view

import (
	"time"
)

type PersonaAccessTokenStatus string

const PersonaAccessTokenActive PersonaAccessTokenStatus = "active"
const PersonaAccessTokenExpired PersonaAccessTokenStatus = "expired"

type PersonalAccessTokenItem struct {
	Id        string                   `json:"id"`
	Name      string                   `json:"name"`
	ExpiresAt *time.Time               `json:"expiresAt"`
	CreatedAt time.Time                `json:"createdAt"`
	Status    PersonaAccessTokenStatus `json:"status"`
}

type PersonalAccessTokenExtAuthView struct {
	Pat         PersonalAccessTokenItem `json:"personalAccessToken"`
	User        User                    `json:"user"`
	SystemRoles []string                `json:"systemRoles"`
}
