package view

import (
	"time"
)

type ApihubApiKey struct {
	Id         string     `json:"id"`
	PackageId  string     `json:"packageId"`
	Name       string     `json:"name"`
	CreatedBy  User       `json:"createdBy"`
	CreatedFor *User      `json:"createdFor,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	DeletedBy  string     `json:"deletedBy,omitempty"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty"`
	ApiKey     string     `json:"apiKey,omitempty"`
	Roles      []string   `json:"roles"`
}

type ApihubApiKeys struct {
	ApiKeys []ApihubApiKey `json:"apiKeys"`
}

type ApihubApiKeyCreateReq struct {
	Name       string   `json:"name" validate:"required"`
	CreatedFor string   `json:"createdFor"`
	Roles      []string `json:"roles"`
}

type ApihubApiKeyExtAuthView struct {
	Id        string   `json:"id"`
	PackageId string   `json:"packageId"`
	Name      string   `json:"name"`
	Revoked   bool     `json:"revoked"`
	Roles     []string `json:"roles"`
}
