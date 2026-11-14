package service

import (
	"context"
	"fmt"
	"os"
	"sync/atomic"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/config"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/spf13/viper"

	log "github.com/sirupsen/logrus"
)

const configFolderEnv = "LIBRARIES_CONFIG_FOLDER"

// productionModeRetryInterval is how long the service waits before asking APIHUB again for the flag that
// decides whether test-only endpoints are reachable.
const productionModeRetryInterval = 5 * time.Second

type SystemInfoService interface {
	GetBasePath() string
	GetApiSpecDir() string
	GetCreds() *view.DbCredentials

	GetAPIHubUrl() string
	GetApihubAccessToken() string

	GetListenAddress() string
	GetAllowedOrigins() []string
	ShowDebugInResponse() bool

	GetRegistries() []config.RegistryConfig
	GetBuildKeepaliveTimeout() time.Duration
	GetBuildRestartLimit() int

	SetProductionMode(apihubClient client.ApihubClient)
	IsProductionMode() bool
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
	s := &systemInfoServiceImpl{config: cfg}
	// Production mode is owned by the APIHUB backend and set at runtime via SetProductionMode. Until that
	// call lands, assume production: an endpoint that must not exist on a production environment stays shut.
	s.apihubProductionMode.Store(true)
	return s, nil
}

func getConfigFolder() string {
	folder := os.Getenv(configFolderEnv)
	if folder == "" {
		log.Warnf("%s is not set, using default value: '.'", configFolderEnv)
		folder = "."
	}
	return folder
}

func setDefaults() {
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.name", "apihub_libraries")
	viper.SetDefault("database.username", "apihub_libraries")
	viper.SetDefault("database.password", "apihub_libraries")
	viper.SetDefault("database.sslMode", "disable")
	viper.SetDefault("technicalParameters.basePath", ".")
	viper.SetDefault("technicalParameters.listenAddress", ":8080")
	viper.SetDefault("technicalParameters.apihub.url", "http://localhost:8090")
	viper.SetDefault("security.allowedOrigins", []string{})
	viper.SetDefault("security.showDebugInResponse", false)
	viper.SetDefault("build.keepaliveTimeoutSeconds", 600)
	viper.SetDefault("build.restartLimit", 2)
}

type systemInfoServiceImpl struct {
	config               config.Config
	apihubProductionMode atomic.Bool
}

func (s *systemInfoServiceImpl) GetBasePath() string {
	return s.config.TechnicalParameters.BasePath
}

func (s *systemInfoServiceImpl) GetApiSpecDir() string {
	if s.config.TechnicalParameters.ApiSpecDirectory != "" {
		return s.config.TechnicalParameters.ApiSpecDirectory
	}
	return s.config.TechnicalParameters.BasePath + string(os.PathSeparator) + "api"
}

func (s *systemInfoServiceImpl) GetCreds() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     s.config.Database.Host,
		Port:     s.config.Database.Port,
		Database: s.config.Database.Name,
		Username: s.config.Database.Username,
		Password: s.config.Database.Password,
		SSLMode:  s.config.Database.SSLMode,
	}
}

func (s *systemInfoServiceImpl) GetAPIHubUrl() string {
	return s.config.TechnicalParameters.Apihub.URL
}

func (s *systemInfoServiceImpl) GetApihubAccessToken() string {
	return s.config.TechnicalParameters.Apihub.AccessToken
}

func (s *systemInfoServiceImpl) GetListenAddress() string {
	return s.config.TechnicalParameters.ListenAddress
}

func (s *systemInfoServiceImpl) GetAllowedOrigins() []string {
	return s.config.Security.AllowedOrigins
}

func (s *systemInfoServiceImpl) ShowDebugInResponse() bool {
	return s.config.Security.ShowDebugInResponse
}

func (s *systemInfoServiceImpl) GetRegistries() []config.RegistryConfig {
	return s.config.Registries
}

func (s *systemInfoServiceImpl) GetBuildKeepaliveTimeout() time.Duration {
	return time.Duration(s.config.Build.KeepaliveTimeoutSeconds) * time.Second
}

func (s *systemInfoServiceImpl) GetBuildRestartLimit() int {
	return s.config.Build.RestartLimit
}

func (s *systemInfoServiceImpl) SetProductionMode(apihubClient client.ApihubClient) {
	for {
		systemInfo, err := apihubClient.GetSystemInfo(secctx.MakeSysadminContext(context.Background()))
		if err != nil {
			log.Warnf("Failed to get system info from APIHUB: %v. Retrying...", err)
			time.Sleep(productionModeRetryInterval)
			continue
		}

		log.Infof("Successfully retrieved system info from APIHUB")
		s.apihubProductionMode.Store(systemInfo.ProductionMode)
		return
	}
}

func (s *systemInfoServiceImpl) IsProductionMode() bool {
	return s.apihubProductionMode.Load()
}
