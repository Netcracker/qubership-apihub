package service

import (
	"fmt"
	"os"

	"github.com/Netcracker/qubership-apihub-agents-backend/config"
	"github.com/Netcracker/qubership-apihub-agents-backend/utils"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

type SystemInfoService interface {
	GetBasePath() string
	GetApiSpecDir() string
	GetPGHost() string
	GetPGPort() int
	GetPGDB() string
	GetPGUser() string
	GetPGPassword() string
	GetDBCreds() *view.DbCredentials
	GetApihubUrl() string
	GetApihubAccessToken() string
	GetDefaultWorkspaceId() string
	GetSnapshotsCleanupSchedule() string
	GetSnapshotsTTLDays() int
	InsecureProxyEnabled() bool //TODO: remove this after deprecated proxy path is removed
	GetListenAddress() string
	GetAllowedOrigins() []string
}

func NewSystemInfoService() (SystemInfoService, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(getConfigFolder())
	setDefaults()
	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}
	var cfg config.Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}
	utils.PrintConfig(cfg)
	if err := utils.ValidateConfig(cfg); err != nil {
		return nil, err
	}
	return &systemInfoServiceImpl{config: cfg}, nil
}

func getConfigFolder() string {
	folder := os.Getenv("AGENTS_BACKEND_CONFIG_FOLDER")
	if folder == "" {
		log.Warn("AGENTS_BACKEND_CONFIG_FOLDER is not set, using default value: '.'")
		folder = "."
	}
	return folder
}

func setDefaults() {
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.name", "apihub_agents_backend")
	viper.SetDefault("database.username", "apihub_agents_backend")
	viper.SetDefault("database.password", "apihub_agents_backend")
	viper.SetDefault("technicalParameters.basePath", ".")
	viper.SetDefault("technicalParameters.listenAddress", ":8080")
	viper.SetDefault("technicalParameters.apihub.url", "http://localhost:8090")
	viper.SetDefault("security.insecureProxy", false)
	viper.SetDefault("security.allowedOrigins", []string{})
	viper.SetDefault("cleanup.snapshots.schedule", "0 22 * * 0") // at 10:00 PM on Sunday
	viper.SetDefault("cleanup.snapshots.ttlDays", 30)
}

type systemInfoServiceImpl struct {
	config config.Config
}

func (s systemInfoServiceImpl) GetBasePath() string {
	return s.config.TechnicalParameters.BasePath
}

func (s systemInfoServiceImpl) GetApiSpecDir() string {
	if s.config.TechnicalParameters.ApiSpecDirectory != "" {
		return s.config.TechnicalParameters.ApiSpecDirectory
	}
	return s.config.TechnicalParameters.BasePath + string(os.PathSeparator) + "api"
}

func (s systemInfoServiceImpl) GetDBCreds() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     s.GetPGHost(),
		Port:     s.GetPGPort(),
		Database: s.GetPGDB(),
		Username: s.GetPGUser(),
		Password: s.GetPGPassword(),
	}
}

func (s systemInfoServiceImpl) GetPGHost() string {
	return s.config.Database.Host
}

func (s systemInfoServiceImpl) GetPGPort() int {
	return s.config.Database.Port
}

func (s systemInfoServiceImpl) GetPGDB() string {
	return s.config.Database.Name
}

func (s systemInfoServiceImpl) GetPGUser() string {
	return s.config.Database.Username
}

func (s systemInfoServiceImpl) GetPGPassword() string {
	return s.config.Database.Password
}

func (s systemInfoServiceImpl) GetApihubUrl() string {
	return s.config.TechnicalParameters.Apihub.URL
}

func (s systemInfoServiceImpl) GetApihubAccessToken() string {
	return s.config.TechnicalParameters.Apihub.AccessToken
}

func (s systemInfoServiceImpl) GetDefaultWorkspaceId() string {
	return s.config.BusinessParameters.DefaultWorkspaceId
}

func (s systemInfoServiceImpl) GetSnapshotsCleanupSchedule() string {
	return s.config.Cleanup.Snapshots.Schedule
}

func (s systemInfoServiceImpl) GetSnapshotsTTLDays() int {
	return s.config.Cleanup.Snapshots.TTLDays
}

func (s systemInfoServiceImpl) InsecureProxyEnabled() bool {
	return s.config.Security.InsecureProxy
}

func (s systemInfoServiceImpl) GetListenAddress() string {
	return s.config.TechnicalParameters.ListenAddress
}

func (s systemInfoServiceImpl) GetAllowedOrigins() []string {
	return s.config.Security.AllowedOrigins
}
