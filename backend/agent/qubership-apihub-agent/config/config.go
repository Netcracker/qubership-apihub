package config

type Config struct {
	TechnicalParameters TechnicalParameters
	Security            SecurityConfig
	Discovery           DiscoveryConfig
}

type TechnicalParameters struct {
	BasePath              string
	ListenAddress         string `validate:"required"`
	Version               string
	Apihub                ApihubConfig
	AgentUrl              string `validate:"required"`
	CloudName             string `validate:"required,slug_only_characters"`
	Namespace             string `validate:"required,slug_only_characters"`
	AgentName             string `validate:"slug_only_characters"`
	PaasPlatform          string `validate:"required"`
	NamespacesCacheTTLMin int
	ServicesCacheTTLMin   int
}

type ApihubConfig struct {
	URL         string `validate:"required"`
	AccessToken string `validate:"required" sensitive:"true"`
}

type SecurityConfig struct {
	AllowedOrigins []string
	InsecureProxy  bool
}

type DiscoveryConfig struct {
	ExcludeLabels  []string
	GroupingLabels []string
	TimeoutSec     int
	Urls           ApiTypeUrlsConfig
}

type ApiTypeUrlsConfig struct {
	OpenAPI      UrlsConfig           `mapstructure:"openapi"`
	GraphQL      UrlsConfig           `mapstructure:"graphql"`
	ApihubConfig ConfigOnlyUrlsConfig `mapstructure:"apihub-config"`
	AsyncAPI     DocOnlyUrlsConfig    `mapstructure:"asyncapi"`
}

type UrlsConfig struct {
	DocUrls    []string `mapstructure:"doc-urls"`
	ConfigUrls []string `mapstructure:"config-urls"`
}

type DocOnlyUrlsConfig struct {
	DocUrls []string `mapstructure:"doc-urls"`
}

type ConfigOnlyUrlsConfig struct {
	ConfigUrls []string `mapstructure:"config-urls"`
}
