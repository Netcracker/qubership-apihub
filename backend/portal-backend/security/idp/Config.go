package idp

type IDPType string
type AuthProtocol string

const (
	IDPTypeInternal IDPType = "internal"
	IDPTypeExternal IDPType = "external"

	AuthProtocolSAML AuthProtocol = "SAML"
	AuthProtocolOIDC AuthProtocol = "OIDC"
)

type AuthConfig struct {
	Providers []IDP `json:"identityProviders"`
	AutoLogin bool  `json:"autoLogin"`
}

type IDP struct {
	Id                   string             `json:"id"`
	IdpType              IDPType            `json:"type"`
	DisplayName          string             `json:"displayName"`
	ImageSvg             string             `json:"imageSvg"`
	LoginStartEndpoint   string             `json:"loginStartEndpoint"`
	RefreshTokenEndpoint string             `json:"refreshTokenEndpoint,omitempty"`
	Protocol             AuthProtocol       `json:"-"`
	SAMLConfiguration    *SAMLConfiguration `json:"-"`
	OIDCConfiguration    *OIDCConfiguration `json:"-"`
}

type SAMLConfiguration struct {
	Certificate    string
	PrivateKey     string
	IDPMetadataURL string
	RootURL        string
}

type OIDCConfiguration struct {
	ClientID     string
	ClientSecret string
	RootURL      string
	RedirectPath string
	ProviderURL  string
	Scopes       []string
}

type OIDCClaims struct {
	UserId  string `json:"sub"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Picture string `json:"picture,omitempty"`
}
