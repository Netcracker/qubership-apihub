package config

type Config struct {
	Database            DatabaseConfig
	TechnicalParameters TechnicalParameters
	Security            SecurityConfig
	Olric               OlricConfig
	Linters             LintersConfig
}

type DatabaseConfig struct {
	Host     string `validate:"required"`
	Port     int    `validate:"required"`
	Name     string `validate:"required"`
	Username string `validate:"required"`
	Password string `validate:"required" sensitive:"true"`
	SSLMode  string
}

type TechnicalParameters struct {
	BasePath         string
	ListenAddress    string `validate:"required"`
	Apihub           ApihubConfig
	ApiSpecDirectory string
}

type ApihubConfig struct {
	URL         string `validate:"required"`
	AccessToken string `validate:"required" sensitive:"true"`
}

type SecurityConfig struct {
	AllowedOrigins []string
}
type OlricConfig struct {
	DiscoveryMode string
	ReplicaCount  int `validate:"gte=1"`
	Namespace     string
}

type LintersConfig struct {
	Spectral SpectralLinterConfig
	AI       AILinterConfig
}

type SpectralLinterConfig struct {
	BinPath string `validate:"required"`
	Workers int    `validate:"gte=1"`
}

type AILinterConfig struct {
	Enabled          bool
	Workers          int `validate:"gte=1"`
	ExcludedPackages []string
	IncludedPackages []string
	OpenAI           OpenAIConfig
}

type OpenAIConfig struct {
	APIKey         string `sensitive:"true"`
	APIProxy       string
	Model          string
	RateLimitRPS   float64 `validate:"gt=0"`
	RateLimitBurst int     `validate:"gte=1"`
}
