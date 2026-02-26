package view

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp"
)

type SystemInfo struct {
	BackendVersion      string         `json:"backendVersion"`
	ProductionMode      bool           `json:"productionMode"`
	Notification        string         `json:"notification,omitempty"`
	ExternalLinks       []string       `json:"externalLinks"`
	MigrationInProgress bool           `json:"migrationInProgress"`
	FeatureFlags        FeatureFlags `json:"featureFlags"`
}

type FeatureFlags struct {
	UseLegacySearch bool `json:"useLegacySearch"`
}

type SystemConfigurationInfo_deprecated struct {
	SSOIntegrationEnabled bool   `json:"ssoIntegrationEnabled"`
	AutoRedirect          bool   `json:"autoRedirect"`
	DefaultWorkspaceId    string `json:"defaultWorkspaceId"`
}

type SystemConfigurationInfo struct {
	DefaultWorkspaceId string         `json:"defaultWorkspaceId"`
	AuthConfig         idp.AuthConfig `json:"authConfig"`
	Extensions         []Extension    `json:"extensions"`
}

type Extension struct {
	Name       string `json:"name" validate:"required"`
	BaseUrl    string `json:"baseUrl" validate:"required"`
	PathPrefix string `json:"pathPrefix" validate:"required"`
}
