package service

import (
	"context"
	"fmt"
	"os"
	"sync/atomic"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/config"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/spf13/viper"

	log "github.com/sirupsen/logrus"
)

type SystemInfoService interface {
	GetBasePath() string
	GetApiSpecDir() string
	GetPGHost() string
	GetPGPort() int
	GetPGDB() string
	GetPGUser() string
	GetPGPassword() string
	GetPGSSLMode() string
	GetCreds() *view.DbCredentials

	GetAPIHubUrl() string
	GetApihubAccessToken() string

	GetListenAddress() string
	GetAllowedOrigins() []string

	GetSpectralBinPath() string

	GetOlricConfig() config.OlricConfig

	GetOpenAIAPIKey() string
	GetOpenAIAPIProxy() string
	GetOpenAIModel() string
	GetOpenAIRateLimitRPS() float64
	GetOpenAIRateLimitBurst() int
	IsAiOasLinterEnabled() bool
	IsAiLinterOptional() bool
	GetAiLinterWorkers() int
	GetAiLinterExcludedPackages() []string
	GetAiLinterIncludedPackages() []string
	GetAiLinterDeduplicationPrompt() string
	GetSpectralLinterWorkers() int
	IsSpectralLinterOptional() bool

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
	// production mode is owned by apihub backend and set at runtime via SetProductionMode.
	s.apihubProductionMode.Store(true)
	return s, nil
}

func getConfigFolder() string {
	folder := os.Getenv("LINTER_CONFIG_FOLDER")
	if folder == "" {
		log.Warn("LINTER_CONFIG_FOLDER is not set, using default value: '.'")
		folder = "."
	}
	return folder
}

func setDefaults() {
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.name", "apihub_linter")
	viper.SetDefault("database.username", "apihub_linter")
	viper.SetDefault("database.password", "apihub_linter")
	viper.SetDefault("database.sslMode", "disable")
	viper.SetDefault("technicalParameters.basePath", ".")
	viper.SetDefault("technicalParameters.listenAddress", ":8080")
	viper.SetDefault("technicalParameters.apihub.url", "http://localhost:8090")
	viper.SetDefault("security.allowedOrigins", []string{})
	viper.SetDefault("olric.discoveryMode", "local")
	viper.SetDefault("olric.replicaCount", 1)
	viper.SetDefault("linters.spectral.workers", 1)
	viper.SetDefault("linters.spectral.optional", false)
	viper.SetDefault("linters.ai.enabled", false)
	viper.SetDefault("linters.ai.optional", false)
	viper.SetDefault("linters.ai.workers", 1)
	viper.SetDefault("linters.ai.openAI.rateLimitRPS", 10.0)
	viper.SetDefault("linters.ai.openAI.rateLimitBurst", 30)
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
		Host:     s.GetPGHost(),
		Port:     s.GetPGPort(),
		Database: s.GetPGDB(),
		Username: s.GetPGUser(),
		Password: s.GetPGPassword(),
		SSLMode:  s.GetPGSSLMode(),
	}
}

func (s *systemInfoServiceImpl) GetPGHost() string {
	return s.config.Database.Host
}

func (s *systemInfoServiceImpl) GetPGPort() int {
	return s.config.Database.Port
}

func (s *systemInfoServiceImpl) GetPGDB() string {
	return s.config.Database.Name
}

func (s *systemInfoServiceImpl) GetPGUser() string {
	return s.config.Database.Username
}

func (s *systemInfoServiceImpl) GetPGPassword() string {
	return s.config.Database.Password
}

func (s *systemInfoServiceImpl) GetPGSSLMode() string {
	return s.config.Database.SSLMode
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

func (s *systemInfoServiceImpl) GetSpectralBinPath() string {
	return s.config.Linters.Spectral.BinPath
}

func (s *systemInfoServiceImpl) GetOlricConfig() config.OlricConfig {
	return s.config.Olric
}

func (s *systemInfoServiceImpl) GetOpenAIAPIKey() string {
	return s.config.Linters.AI.OpenAI.APIKey
}

func (s *systemInfoServiceImpl) GetOpenAIAPIProxy() string {
	return s.config.Linters.AI.OpenAI.APIProxy
}

func (s *systemInfoServiceImpl) GetOpenAIModel() string {
	return s.config.Linters.AI.OpenAI.Model
}

func (s *systemInfoServiceImpl) GetOpenAIRateLimitRPS() float64 {
	return s.config.Linters.AI.OpenAI.RateLimitRPS
}

func (s *systemInfoServiceImpl) GetOpenAIRateLimitBurst() int {
	return s.config.Linters.AI.OpenAI.RateLimitBurst
}

func (s *systemInfoServiceImpl) IsAiOasLinterEnabled() bool {
	return s.config.Linters.AI.Enabled
}

func (s *systemInfoServiceImpl) IsAiLinterOptional() bool {
	return s.config.Linters.AI.Optional
}

func (s *systemInfoServiceImpl) GetAiLinterWorkers() int {
	return s.config.Linters.AI.Workers
}

func (s *systemInfoServiceImpl) GetAiLinterExcludedPackages() []string {
	return s.config.Linters.AI.ExcludedPackages
}

func (s *systemInfoServiceImpl) GetAiLinterIncludedPackages() []string {
	return s.config.Linters.AI.IncludedPackages
}

func (s *systemInfoServiceImpl) GetAiLinterDeduplicationPrompt() string {
	return s.config.Linters.AI.DeduplicationPrompt
}

func (s *systemInfoServiceImpl) GetSpectralLinterWorkers() int {
	return s.config.Linters.Spectral.Workers
}

func (s *systemInfoServiceImpl) IsSpectralLinterOptional() bool {
	return s.config.Linters.Spectral.Optional
}

func (s *systemInfoServiceImpl) SetProductionMode(apihubClient client.ApihubClient) {
	for {
		systemInfo, err := apihubClient.GetSystemInfo(secctx.MakeSysadminContext(context.Background()))
		if err != nil {
			log.Warnf("Failed to get system info from APIHUB: %v. Retrying...", err)
			time.Sleep(5 * time.Second)
			continue
		}

		log.Infof("Successfully retrieved system info from APIHUB")
		s.apihubProductionMode.Store(systemInfo.ProductionMode)
		break
	}
}

func (s *systemInfoServiceImpl) IsProductionMode() bool {
	return s.apihubProductionMode.Load()
}
