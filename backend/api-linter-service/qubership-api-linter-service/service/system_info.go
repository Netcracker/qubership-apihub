package service

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/view"

	log "github.com/sirupsen/logrus"
)

const (
	BASE_PATH    = "BASE_PATH"
	API_SPEC_DIR = "API_SPEC_DIR"

	LINTER_POSTGRESQL_HOST     = "LINTER_POSTGRESQL_HOST"
	LINTER_POSTGRESQL_PORT     = "LINTER_POSTGRESQL_PORT"
	LINTER_POSTGRESQL_DB_NAME  = "LINTER_POSTGRESQL_DB_NAME"
	LINTER_POSTGRESQL_USERNAME = "LINTER_POSTGRESQL_USERNAME"
	LINTER_POSTGRESQL_PASSWORD = "LINTER_POSTGRESQL_PASSWORD"
	LINTER_PG_SSL_MODE         = "LINTER_PG_SSL_MODE"

	APIHUB_URL          = "APIHUB_URL"
	APIHUB_ACCESS_TOKEN = "APIHUB_ACCESS_TOKEN"

	LISTEN_ADDRESS = "LISTEN_ADDRESS"
	ORIGIN_ALLOWED = "ORIGIN_ALLOWED"
	LOG_LEVEL      = "LOG_LEVEL"

	SPECTRAL_BIN_PATH = "SPECTRAL_BIN_PATH"

	OLRIC_DISCOVERY_MODE = "OLRIC_DISCOVERY_MODE"
	OLRIC_REPLICA_COUNT  = "OLRIC_REPLICA_COUNT"
	NAMESPACE            = "NAMESPACE"

	PRODUCTION_MODE = "PRODUCTION_MODE"

	OPENAI_API_KEY          = "OPENAI_API_KEY"
	OPENAI_API_PROXY        = "OPENAI_API_PROXY"
	OPENAI_MODEL            = "OPENAI_MODEL"
	OPENAI_RATE_LIMIT_RPS   = "OPENAI_RATE_LIMIT_RPS"
	OPENAI_RATE_LIMIT_BURST = "OPENAI_RATE_LIMIT_BURST"
	ENABLE_AI_OAS_LINTER    = "ENABLE_AI_OAS_LINTER"
	AI_LINTER_WORKERS       = "AI_LINTER_WORKERS"
	SPECTRAL_LINTER_WORKERS = "SPECTRAL_LINTER_WORKERS"

	AI_LINTER_EXCLUDED_PACKAGES = "AI_LINTER_EXCLUDED_PACKAGES"
	AI_LINTER_INCLUDED_PACKAGES = "AI_LINTER_INCLUDED_PACKAGES"
)

type SystemInfoService interface {
	Init() error

	GetBasePath() string
	GetApiSpecDir() string
	GetPGHost() string
	GetPGPort() int
	GetPGDB() string
	GetPGUser() string
	GetPGPassword() string
	GetPGSSLMode() string
	GetCredsFromEnv() *view.DbCredentials

	GetAPIHubUrl() string
	GetApihubAccessToken() string

	GetListenAddress() string
	GetOriginAllowed() string
	GetLogLevel() string

	GetSpectralBinPath() string

	GetOlricDiscoveryMode() string
	GetReplicaCount() int
	GetNamespace() string

	GetOpenAIAPIKey() string
	GetOpenAIAPIProxy() string
	GetOpenAIModel() string
	GetOpenAIRateLimitRPS() float64
	GetOpenAIRateLimitBurst() int
	IsAiOasLinterEnabled() bool
	GetAiLinterWorkers() int
	GetAiLinterExcludedPackages() []string
	GetAiLinterIncludedPackages() []string
	GetSpectralLinterWorkers() int

	SetProductionMode(apihubClient client.ApihubClient)
	IsProductionMode() bool
}

func NewSystemInfoService() (SystemInfoService, error) {
	s := &systemInfoServiceImpl{
		systemInfoMap: make(map[string]interface{})}
	if err := s.Init(); err != nil {
		log.Error("Failed to read system info: " + err.Error())
		return nil, err
	}
	return s, nil
}

type systemInfoServiceImpl struct {
	systemInfoMap map[string]interface{}
}

func (s systemInfoServiceImpl) Init() error {
	s.setBasePath()
	s.setApiSpecDir()

	s.setPGHost()
	if err := s.setPGPort(); err != nil {
		return err
	}
	s.setPGDB()
	s.setPGUser()
	s.setPGPassword()
	s.setPGSSLMode()
	s.setAPIHubUrl()
	s.setApihubAccessToken()

	s.setListenAddress()
	s.setOriginAllowed()
	s.setLogLevel()
	if err := s.setSpectralBinPath(); err != nil {
		return err
	}

	s.setOlricDiscoveryMode()
	s.setReplicaCount()
	s.setNamespace()

	s.setOpenAIAPIKey()
	s.setOpenAIAPIProxy()
	s.setOpenAIModel()
	s.setOpenAIRateLimitRPS()
	s.setOpenAIRateLimitBurst()
	s.setEnableAIOasLinter()
	s.setAiLinterWorkers()
	s.setAiLinterExcludedPackages()
	s.setAiLinterIncludedPackages()
	s.setSpectralLinterWorkers()

	return nil
}

func (s systemInfoServiceImpl) GetBasePath() string {
	return s.systemInfoMap[BASE_PATH].(string)
}

func (s systemInfoServiceImpl) setBasePath() {
	s.systemInfoMap[BASE_PATH] = os.Getenv(BASE_PATH)
	if s.systemInfoMap[BASE_PATH] == "" {
		s.systemInfoMap[BASE_PATH] = "."
	}
}

func (s systemInfoServiceImpl) setApiSpecDir() {
	s.systemInfoMap[API_SPEC_DIR] = os.Getenv(API_SPEC_DIR)
	if s.systemInfoMap[API_SPEC_DIR] == "" {
		s.systemInfoMap[API_SPEC_DIR] = s.GetBasePath() + string(os.PathSeparator) + "api"
	}
}

func (s systemInfoServiceImpl) GetApiSpecDir() string {
	return s.systemInfoMap[API_SPEC_DIR].(string)
}

func (s systemInfoServiceImpl) GetCredsFromEnv() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     s.GetPGHost(),
		Port:     s.GetPGPort(),
		Database: s.GetPGDB(),
		Username: s.GetPGUser(),
		Password: s.GetPGPassword(),
		SSLMode:  s.GetPGSSLMode(),
	}
}

func (s systemInfoServiceImpl) setPGHost() {
	host := os.Getenv(LINTER_POSTGRESQL_HOST)
	if host == "" {
		host = "localhost"
	}
	s.systemInfoMap[LINTER_POSTGRESQL_HOST] = host
}

func (s systemInfoServiceImpl) GetPGHost() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_HOST].(string)
}

func (s systemInfoServiceImpl) setPGPort() error {
	portStr := os.Getenv(LINTER_POSTGRESQL_PORT)
	var port int
	var err error
	if portStr == "" {
		port = 5432
	} else {
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return fmt.Errorf("failed to parse %v env value: %v", LINTER_POSTGRESQL_PORT, err.Error())
		}
	}
	s.systemInfoMap[LINTER_POSTGRESQL_PORT] = port
	return nil
}

func (s systemInfoServiceImpl) GetPGPort() int {
	return s.systemInfoMap[LINTER_POSTGRESQL_PORT].(int)
}

func (s systemInfoServiceImpl) setPGDB() {
	database := os.Getenv(LINTER_POSTGRESQL_DB_NAME)
	if database == "" {
		database = "apihub_linter"
	}
	s.systemInfoMap[LINTER_POSTGRESQL_DB_NAME] = database
}

func (s systemInfoServiceImpl) GetPGDB() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_DB_NAME].(string)
}

func (s systemInfoServiceImpl) setPGUser() {
	user := os.Getenv(LINTER_POSTGRESQL_USERNAME)
	if user == "" {
		user = "apihub_linter"
	}
	s.systemInfoMap[LINTER_POSTGRESQL_USERNAME] = user
}

func (s systemInfoServiceImpl) GetPGUser() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_USERNAME].(string)
}

func (s systemInfoServiceImpl) setPGPassword() {
	s.systemInfoMap[LINTER_POSTGRESQL_PASSWORD] = os.Getenv(LINTER_POSTGRESQL_PASSWORD)
}

func (s systemInfoServiceImpl) GetPGPassword() string {
	return s.systemInfoMap[LINTER_POSTGRESQL_PASSWORD].(string)
}

func (s systemInfoServiceImpl) setPGSSLMode() {
	sslMode := os.Getenv(LINTER_PG_SSL_MODE)
	if sslMode == "" {
		sslMode = "disable"
	}
	s.systemInfoMap[LINTER_PG_SSL_MODE] = sslMode
}

func (s systemInfoServiceImpl) GetPGSSLMode() string {
	return s.systemInfoMap[LINTER_PG_SSL_MODE].(string)
}

func (s systemInfoServiceImpl) setAPIHubUrl() {
	s.systemInfoMap[APIHUB_URL] = os.Getenv(APIHUB_URL)
	if s.systemInfoMap[APIHUB_URL] == "" {
		s.systemInfoMap[APIHUB_URL] = "http://localhost:8090"
	}
}

func (s systemInfoServiceImpl) GetAPIHubUrl() string {
	return s.systemInfoMap[APIHUB_URL].(string)
}

func (s systemInfoServiceImpl) setApihubAccessToken() {
	s.systemInfoMap[APIHUB_ACCESS_TOKEN] = os.Getenv(APIHUB_ACCESS_TOKEN)
}

func (s systemInfoServiceImpl) GetApihubAccessToken() string {
	return s.systemInfoMap[APIHUB_ACCESS_TOKEN].(string)
}

func (s systemInfoServiceImpl) setListenAddress() {
	listenAddr := os.Getenv(LISTEN_ADDRESS)
	if listenAddr == "" {
		listenAddr = ":8080"
	}
	s.systemInfoMap[LISTEN_ADDRESS] = listenAddr
}

func (s systemInfoServiceImpl) GetListenAddress() string {
	return s.systemInfoMap[LISTEN_ADDRESS].(string)
}

func (s systemInfoServiceImpl) setOriginAllowed() {
	s.systemInfoMap[ORIGIN_ALLOWED] = os.Getenv(ORIGIN_ALLOWED)
}

func (s systemInfoServiceImpl) GetOriginAllowed() string {
	return s.systemInfoMap[ORIGIN_ALLOWED].(string)
}

func (s systemInfoServiceImpl) setLogLevel() {
	s.systemInfoMap[LOG_LEVEL] = os.Getenv(LOG_LEVEL)
}

func (s systemInfoServiceImpl) GetLogLevel() string {
	return s.systemInfoMap[LOG_LEVEL].(string)
}

func (s systemInfoServiceImpl) setSpectralBinPath() error {
	s.systemInfoMap[SPECTRAL_BIN_PATH] = os.Getenv(SPECTRAL_BIN_PATH)
	if val, _ := s.systemInfoMap[SPECTRAL_BIN_PATH]; val == "" {
		return fmt.Errorf("mandatory env %s is not set", SPECTRAL_BIN_PATH)
	}
	return nil
}

func (s systemInfoServiceImpl) GetSpectralBinPath() string {
	return s.systemInfoMap[SPECTRAL_BIN_PATH].(string)
}

func (s systemInfoServiceImpl) setOlricDiscoveryMode() {
	s.systemInfoMap[OLRIC_DISCOVERY_MODE] = os.Getenv(OLRIC_DISCOVERY_MODE)
}

func (s systemInfoServiceImpl) GetOlricDiscoveryMode() string {
	return s.systemInfoMap[OLRIC_DISCOVERY_MODE].(string)
}

func (s systemInfoServiceImpl) setReplicaCount() {
	s.systemInfoMap[OLRIC_REPLICA_COUNT] = os.Getenv(OLRIC_REPLICA_COUNT)
}

func (s systemInfoServiceImpl) GetReplicaCount() int {
	replicaCountStr, exists := os.LookupEnv("OLRIC_REPLICA_COUNT")
	if exists {
		rc, err := strconv.Atoi(replicaCountStr)
		if err != nil {
			log.Errorf("Invalid OLRIC_REPLICA_COUNT env value, expecting int. Replica count set to 1.")
			return 1
		}
		return rc
	}
	return 1
}

func (s systemInfoServiceImpl) setNamespace() {
	s.systemInfoMap[NAMESPACE] = os.Getenv(NAMESPACE)
}

func (s systemInfoServiceImpl) GetNamespace() string {
	return s.systemInfoMap[NAMESPACE].(string)
}

func (s systemInfoServiceImpl) setOpenAIAPIKey() {
	s.systemInfoMap[OPENAI_API_KEY] = os.Getenv(OPENAI_API_KEY)
}

func (s systemInfoServiceImpl) GetOpenAIAPIKey() string {
	return s.systemInfoMap[OPENAI_API_KEY].(string)
}

func (s systemInfoServiceImpl) setOpenAIAPIProxy() {
	s.systemInfoMap[OPENAI_API_PROXY] = os.Getenv(OPENAI_API_PROXY)
}

func (s systemInfoServiceImpl) GetOpenAIAPIProxy() string {
	return s.systemInfoMap[OPENAI_API_PROXY].(string)
}

func (s systemInfoServiceImpl) setOpenAIModel() {
	s.systemInfoMap[OPENAI_MODEL] = os.Getenv(OPENAI_MODEL)
}

func (s systemInfoServiceImpl) GetOpenAIModel() string {
	return s.systemInfoMap[OPENAI_MODEL].(string)
}

func (s systemInfoServiceImpl) setOpenAIRateLimitRPS() {
	rpsStr := os.Getenv(OPENAI_RATE_LIMIT_RPS)
	var rps float64
	if rpsStr != "" {
		if parsed, err := strconv.ParseFloat(rpsStr, 64); err == nil && parsed > 0 {
			rps = parsed
		}
	}
	if rps <= 0 {
		rps = 10.0 // default: 10 requests per second
	}
	s.systemInfoMap[OPENAI_RATE_LIMIT_RPS] = rps
}

func (s systemInfoServiceImpl) GetOpenAIRateLimitRPS() float64 {
	return s.systemInfoMap[OPENAI_RATE_LIMIT_RPS].(float64)
}

func (s systemInfoServiceImpl) setOpenAIRateLimitBurst() {
	burstStr := os.Getenv(OPENAI_RATE_LIMIT_BURST)
	var burst int
	if burstStr != "" {
		if parsed, err := strconv.Atoi(burstStr); err == nil && parsed > 0 {
			burst = parsed
		}
	}
	if burst <= 0 {
		burst = 30 // default: allow burst of 30 requests
	}
	s.systemInfoMap[OPENAI_RATE_LIMIT_BURST] = burst
}

func (s systemInfoServiceImpl) GetOpenAIRateLimitBurst() int {
	return s.systemInfoMap[OPENAI_RATE_LIMIT_BURST].(int)
}

func (s systemInfoServiceImpl) setEnableAIOasLinter() {
	val := os.Getenv(ENABLE_AI_OAS_LINTER)
	enabled, err := strconv.ParseBool(val)
	if err != nil {
		enabled = false
	}
	s.systemInfoMap[ENABLE_AI_OAS_LINTER] = enabled
}

func (s systemInfoServiceImpl) IsAiOasLinterEnabled() bool {
	return s.systemInfoMap[ENABLE_AI_OAS_LINTER].(bool)
}

func (s systemInfoServiceImpl) setAiLinterWorkers() {
	workersStr := os.Getenv(AI_LINTER_WORKERS)
	var workers int
	if workersStr != "" {
		if parsed, err := strconv.Atoi(workersStr); err == nil && parsed > 0 {
			workers = parsed
		}
	}
	if workers <= 0 {
		workers = 1
	}
	s.systemInfoMap[AI_LINTER_WORKERS] = workers
}

func (s systemInfoServiceImpl) GetAiLinterWorkers() int {
	return s.systemInfoMap[AI_LINTER_WORKERS].(int)
}

func parseCommaSeparatedList(val string) []string {
	if val == "" {
		return nil
	}
	parts := strings.Split(val, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

func (s systemInfoServiceImpl) setAiLinterExcludedPackages() {
	s.systemInfoMap[AI_LINTER_EXCLUDED_PACKAGES] = parseCommaSeparatedList(os.Getenv(AI_LINTER_EXCLUDED_PACKAGES))
}

func (s systemInfoServiceImpl) GetAiLinterExcludedPackages() []string {
	return s.systemInfoMap[AI_LINTER_EXCLUDED_PACKAGES].([]string)
}

func (s systemInfoServiceImpl) setAiLinterIncludedPackages() {
	s.systemInfoMap[AI_LINTER_INCLUDED_PACKAGES] = parseCommaSeparatedList(os.Getenv(AI_LINTER_INCLUDED_PACKAGES))
}

func (s systemInfoServiceImpl) GetAiLinterIncludedPackages() []string {
	return s.systemInfoMap[AI_LINTER_INCLUDED_PACKAGES].([]string)
}

func (s systemInfoServiceImpl) setSpectralLinterWorkers() {
	workersStr := os.Getenv(SPECTRAL_LINTER_WORKERS)
	var workers int
	if workersStr != "" {
		if parsed, err := strconv.Atoi(workersStr); err == nil && parsed > 0 {
			workers = parsed
		}
	}
	if workers <= 0 {
		workers = 1
	}
	s.systemInfoMap[SPECTRAL_LINTER_WORKERS] = workers
}

func (s systemInfoServiceImpl) GetSpectralLinterWorkers() int {
	return s.systemInfoMap[SPECTRAL_LINTER_WORKERS].(int)
}

func (s systemInfoServiceImpl) SetProductionMode(apihubClient client.ApihubClient) {
	for {
		systemInfo, err := apihubClient.GetSystemInfo(secctx.MakeSysadminContext(context.Background()))
		if err != nil {
			log.Warnf("Failed to get system info from APIHUB: %v. Retrying...", err)
			time.Sleep(5 * time.Second)
			continue
		}

		log.Infof("Successfully retrieved system info from APIHUB")
		s.systemInfoMap[PRODUCTION_MODE] = systemInfo.ProductionMode
		break
	}
}

func (s systemInfoServiceImpl) IsProductionMode() bool {
	if val, exists := s.systemInfoMap[PRODUCTION_MODE]; exists {
		if boolVal, ok := val.(bool); ok {
			return boolVal
		}
	}
	return true
}
