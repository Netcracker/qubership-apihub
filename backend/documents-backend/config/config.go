package config

import "time"

// Config mirrors config.yaml. Every key can be overridden with DOCS_<SECTION>_<KEY> (see service.SystemInfoService).
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Apihub   ApihubConfig   `mapstructure:"apihub"`
	Static   StaticConfig   `mapstructure:"static"`
	Log      LogConfig      `mapstructure:"log"`
}

type ServerConfig struct {
	ListenAddress       string   `mapstructure:"listenAddress" validate:"required"`
	AllowedOrigins      []string `mapstructure:"allowedOrigins"`
	ShowDebugInResponse bool     `mapstructure:"showDebugInResponse"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host" validate:"required"`
	Port     int    `mapstructure:"port" validate:"required"`
	Name     string `mapstructure:"name" validate:"required"`
	Username string `mapstructure:"username" validate:"required"`
	Password string `mapstructure:"password" sensitive:"true"`
}

type ApihubConfig struct {
	Url                   string        `mapstructure:"url" validate:"required,url"`
	Timeout               time.Duration `mapstructure:"timeout"`
	ConfigurationCacheTtl time.Duration `mapstructure:"configurationCacheTtl"`
	PackageAccessCacheTtl time.Duration `mapstructure:"packageAccessCacheTtl"`
}

type StaticConfig struct {
	MaxUploadSizeBytes int64 `mapstructure:"maxUploadSizeBytes" validate:"gt=0"`
}

type LogConfig struct {
	Level string `mapstructure:"level"`
}
