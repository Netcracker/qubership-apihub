package view

type ApihubSystemConfigurationInfo struct {
	DefaultWorkspaceId string      `json:"defaultWorkspaceId"`
	AuthConfig         AuthConfig  `json:"authConfig"`
	Extensions         []Extension `json:"extensions"`
}

type Extension struct {
	Name       string `json:"name" validate:"required"`
	BaseUrl    string `json:"baseUrl" validate:"required"`
	PathPrefix string `json:"pathPrefix" validate:"required"`
}

type AuthConfig struct {
	Providers []IDP `json:"identityProviders"`
	AutoLogin bool  `json:"autoLogin"`
}

type IDP struct {
	Id                   string `json:"id"`
	IdpType              string `json:"type"`
	DisplayName          string `json:"displayName"`
	ImageSvg             string `json:"imageSvg"`
	LoginStartEndpoint   string `json:"loginStartEndpoint"`
	RefreshTokenEndpoint string `json:"refreshTokenEndpoint,omitempty"`
}
