package config

type Config struct {
	Database            DatabaseConfig
	TechnicalParameters TechnicalParameters
	BusinessParameters  BusinessParameters
	Security            SecurityConfig
	Cleanup             CleanupConfig
}

type DatabaseConfig struct {
	Host     string `validate:"required"`
	Port     int    `validate:"required"`
	Name     string `validate:"required"`
	Username string `validate:"required"`
	Password string `validate:"required" sensitive:"true"`
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
type BusinessParameters struct {
	DefaultWorkspaceId string
}
type SecurityConfig struct {
	InsecureProxy  bool
	AllowedOrigins []string
}

type CleanupConfig struct {
	Snapshots SnapshotsCleanupConfig
}

type SnapshotsCleanupConfig struct {
	Schedule string
	TTLDays  int `validate:"gte=0"`
}
