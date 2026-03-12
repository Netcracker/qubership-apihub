package idp

type Manager interface {
	GetAuthConfig() AuthConfig
	GetProvider(id string) (Provider, bool)
	IsSSOIntegrationEnabled() bool
}
