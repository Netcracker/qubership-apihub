package config

type Config struct {
	Database            DatabaseConfig
	TechnicalParameters TechnicalParameters
	Security            SecurityConfig
	Registries          []RegistryConfig `validate:"dive"`
	Build               BuildConfig
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
	AllowedOrigins      []string
	ShowDebugInResponse bool
}

// RegistryConfig is one external artifact registry this service tracks libraries in. Credentials never
// reach the database: the service reads them from here and keeps only the pointer in the `registry` table.
type RegistryConfig struct {
	Id           string `validate:"required"`
	Type         string `validate:"required,oneof=artifactory nexus"`
	BaseUrl      string `validate:"required,url"`
	Name         string
	Username     string   `sensitive:"true"`
	Password     string   `sensitive:"true"`
	Repositories []string `validate:"required,min=1,dive,required"`
}

type BuildConfig struct {
	// KeepaliveTimeoutSeconds is how long a running build may stay silent before the queue hands it
	// to another worker.
	KeepaliveTimeoutSeconds int `validate:"gte=1"`
	// RestartLimit is how many times the queue re-offers a build that went silent before failing it.
	RestartLimit int `validate:"gte=0"`
}
