package service

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/config"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

const (
	BASE_PATH          = "BASE_PATH"
	DOCS_CONFIG_FOLDER = "DOCS_CONFIG_FOLDER"
	EnvPrefix          = "DOCS"
)

// SystemInfoService exposes the effective configuration (config.yaml + DOCS_* environment overrides).
type SystemInfoService interface {
	Init() error

	GetBasePath() string
	GetListenAddress() string
	GetAllowedOrigins() []string
	ShowDebugInResponse() bool
	GetLogLevel() string
	GetDBCredsFromEnv() *view.DbCredentials
	GetApihubUrl() string
	GetApihubTimeout() time.Duration
	GetConfigurationCacheTtl() time.Duration
	GetPackageAccessCacheTtl() time.Duration
	GetMaxUploadSizeBytes() int64
}

func NewSystemInfoService() (SystemInfoService, error) {
	s := &systemInfoServiceImpl{}
	if err := s.Init(); err != nil {
		log.Error("Failed to read system info: " + err.Error())
		return nil, err
	}
	return s, nil
}

type systemInfoServiceImpl struct {
	config   config.Config
	basePath string
}

func (s *systemInfoServiceImpl) Init() error {
	s.basePath = os.Getenv(BASE_PATH)
	if s.basePath == "" {
		s.basePath = "."
	}
	v := viper.New()
	s.setDefaults(v)
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(s.getConfigFolder())
	v.SetEnvPrefix(EnvPrefix)
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()
	if err := v.ReadInConfig(); err != nil {
		var notFound viper.ConfigFileNotFoundError
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok && err != notFound {
			return fmt.Errorf("failed to read config file: %w", err)
		}
		log.Warnf("config.yaml not found in %s, using defaults and %s_* environment", s.getConfigFolder(), EnvPrefix)
	}
	// AutomaticEnv resolves only keys viper knows about; defaults cover every key so env-only setups work.
	if err := v.Unmarshal(&s.config); err != nil {
		return fmt.Errorf("failed to unmarshal config: %w", err)
	}
	utils.PrintConfig(s.config)
	return utils.ValidateConfig(s.config)
}

func (s *systemInfoServiceImpl) getConfigFolder() string {
	if folder := os.Getenv(DOCS_CONFIG_FOLDER); folder != "" {
		return folder
	}
	return s.basePath
}

func (s *systemInfoServiceImpl) setDefaults(v *viper.Viper) {
	v.SetDefault("server.listenAddress", "0.0.0.0:8080")
	v.SetDefault("server.allowedOrigins", []string{})
	v.SetDefault("server.showDebugInResponse", true)
	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.name", "documents")
	v.SetDefault("database.username", "documents")
	v.SetDefault("database.password", "")
	v.SetDefault("apihub.url", "http://apihub-backend:8080")
	v.SetDefault("apihub.timeout", "10s")
	v.SetDefault("apihub.configurationCacheTtl", "60s")
	v.SetDefault("apihub.packageAccessCacheTtl", "60s")
	v.SetDefault("static.maxUploadSizeBytes", 5242880)
	v.SetDefault("log.level", "info")
}

func (s systemInfoServiceImpl) GetBasePath() string             { return s.basePath }
func (s systemInfoServiceImpl) GetListenAddress() string        { return s.config.Server.ListenAddress }
func (s systemInfoServiceImpl) GetAllowedOrigins() []string     { return s.config.Server.AllowedOrigins }
func (s systemInfoServiceImpl) ShowDebugInResponse() bool       { return s.config.Server.ShowDebugInResponse }
func (s systemInfoServiceImpl) GetLogLevel() string             { return s.config.Log.Level }
func (s systemInfoServiceImpl) GetApihubUrl() string            { return s.config.Apihub.Url }
func (s systemInfoServiceImpl) GetApihubTimeout() time.Duration { return s.config.Apihub.Timeout }
func (s systemInfoServiceImpl) GetConfigurationCacheTtl() time.Duration {
	return s.config.Apihub.ConfigurationCacheTtl
}
func (s systemInfoServiceImpl) GetPackageAccessCacheTtl() time.Duration {
	return s.config.Apihub.PackageAccessCacheTtl
}
func (s systemInfoServiceImpl) GetMaxUploadSizeBytes() int64 {
	return s.config.Static.MaxUploadSizeBytes
}

func (s systemInfoServiceImpl) GetDBCredsFromEnv() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     s.config.Database.Host,
		Port:     s.config.Database.Port,
		Database: s.config.Database.Name,
		Username: s.config.Database.Username,
		Password: s.config.Database.Password,
	}
}
