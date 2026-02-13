package service

import (
	"fmt"
	"os"
	"strconv"

	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	log "github.com/sirupsen/logrus"
)

const (
	BASE_PATH    = "BASE_PATH"
	API_SPEC_DIR = "API_SPEC_DIR"

	POSTGRESQL_HOST            = "AGENTS_BACKEND_POSTGRESQL_HOST"
	POSTGRESQL_PORT            = "AGENTS_BACKEND_POSTGRESQL_PORT"
	POSTGRESQL_DB_NAME         = "AGENTS_BACKEND_POSTGRESQL_DB_NAME"
	POSTGRESQL_USERNAME        = "AGENTS_BACKEND_POSTGRESQL_USERNAME"
	POSTGRESQL_PASSWORD        = "AGENTS_BACKEND_POSTGRESQL_PASSWORD"
	APIHUB_URL                 = "APIHUB_URL"
	APIHUB_ACCESS_TOKEN        = "APIHUB_ACCESS_TOKEN"
	DEFAULT_WORKSPACE_ID       = "DEFAULT_WORKSPACE_ID"
	SNAPSHOTS_CLEANUP_SCHEDULE = "SNAPSHOTS_CLEANUP_SCHEDULE"
	SNAPSHOTS_TTL_DAYS         = "SNAPSHOTS_TTL_DAYS"
	INSECURE_PROXY             = "INSECURE_PROXY" //TODO: remove this after deprecated proxy path is removed
	LISTEN_ADDRESS             = "LISTEN_ADDRESS"
	ORIGIN_ALLOWED             = "ORIGIN_ALLOWED"
	LOG_LEVEL                  = "LOG_LEVEL"
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
	GetDBCredsFromEnv() *view.DbCredentials
	GetApihubUrl() string
	GetApihubAccessToken() string
	GetDefaultWorkspaceId() string
	GetSnapshotsCleanupSchedule() string
	GetSnapshotsTTLDays() int
	InsecureProxyEnabled() bool //TODO: remove this after deprecated proxy path is removed
	GetListenAddress() string
	GetOriginAllowed() string
	GetLogLevel() string
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
	s.setApihubUrl()
	s.setApihubAccessToken()
	s.setDefaultWorkspaceId()
	s.setSnapshotsCleanupSchedule()
	s.setSnapshotsTTLDays()
	s.setInsecureProxy()

	s.setListenAddress()
	s.setOriginAllowed()
	s.setLogLevel()

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

func (s systemInfoServiceImpl) GetDBCredsFromEnv() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     s.GetPGHost(),
		Port:     s.GetPGPort(),
		Database: s.GetPGDB(),
		Username: s.GetPGUser(),
		Password: s.GetPGPassword(),
	}
}

func (s systemInfoServiceImpl) setPGHost() {
	host := os.Getenv(POSTGRESQL_HOST)
	if host == "" {
		host = "localhost"
	}
	s.systemInfoMap[POSTGRESQL_HOST] = host
}

func (s systemInfoServiceImpl) GetPGHost() string {
	return s.systemInfoMap[POSTGRESQL_HOST].(string)
}

func (s systemInfoServiceImpl) setPGPort() error {
	portStr := os.Getenv(POSTGRESQL_PORT)
	var port int
	var err error
	if portStr == "" {
		port = 5432
	} else {
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return fmt.Errorf("failed to parse %v env value: %v", POSTGRESQL_PORT, err.Error())
		}
	}
	s.systemInfoMap[POSTGRESQL_PORT] = port
	return nil
}

func (s systemInfoServiceImpl) GetPGPort() int {
	return s.systemInfoMap[POSTGRESQL_PORT].(int)
}

func (s systemInfoServiceImpl) setPGDB() {
	database := os.Getenv(POSTGRESQL_DB_NAME)
	if database == "" {
		database = "apihub_agents_backend"
	}
	s.systemInfoMap[POSTGRESQL_DB_NAME] = database
}

func (s systemInfoServiceImpl) GetPGDB() string {
	return s.systemInfoMap[POSTGRESQL_DB_NAME].(string)
}

func (s systemInfoServiceImpl) setPGUser() {
	user := os.Getenv(POSTGRESQL_USERNAME)
	if user == "" {
		user = "apihub_agents_backend"
	}
	s.systemInfoMap[POSTGRESQL_USERNAME] = user
}

func (s systemInfoServiceImpl) GetPGUser() string {
	return s.systemInfoMap[POSTGRESQL_USERNAME].(string)
}

func (s systemInfoServiceImpl) setPGPassword() {
	s.systemInfoMap[POSTGRESQL_PASSWORD] = os.Getenv(POSTGRESQL_PASSWORD)
}

func (s systemInfoServiceImpl) GetPGPassword() string {
	return s.systemInfoMap[POSTGRESQL_PASSWORD].(string)
}

func (s systemInfoServiceImpl) setApihubUrl() {
	s.systemInfoMap[APIHUB_URL] = os.Getenv(APIHUB_URL)
	if s.systemInfoMap[APIHUB_URL] == "" {
		s.systemInfoMap[APIHUB_URL] = "http://localhost:8090"
	}
}

func (s systemInfoServiceImpl) GetApihubUrl() string {
	return s.systemInfoMap[APIHUB_URL].(string)
}

func (s systemInfoServiceImpl) setApihubAccessToken() {
	s.systemInfoMap[APIHUB_ACCESS_TOKEN] = os.Getenv(APIHUB_ACCESS_TOKEN)
}

func (s systemInfoServiceImpl) GetApihubAccessToken() string {
	return s.systemInfoMap[APIHUB_ACCESS_TOKEN].(string)
}

func (s systemInfoServiceImpl) setDefaultWorkspaceId() {
	s.systemInfoMap[DEFAULT_WORKSPACE_ID] = os.Getenv(DEFAULT_WORKSPACE_ID)
}

func (s systemInfoServiceImpl) GetDefaultWorkspaceId() string {
	return s.systemInfoMap[DEFAULT_WORKSPACE_ID].(string)
}

func (s systemInfoServiceImpl) setInsecureProxy() {
	envVal := os.Getenv(INSECURE_PROXY)
	insecureProxy, err := strconv.ParseBool(envVal)
	if err != nil {
		log.Infof("environment variable %v has invalid value, using false value instead", INSECURE_PROXY)
		insecureProxy = false

	}
	s.systemInfoMap[INSECURE_PROXY] = insecureProxy
}

func (s systemInfoServiceImpl) setSnapshotsCleanupSchedule() {
	schedule := os.Getenv(SNAPSHOTS_CLEANUP_SCHEDULE)
	if schedule == "" {
		schedule = "0 22 * * 0" // at 10:00 PM on Sunday
	}
	s.systemInfoMap[SNAPSHOTS_CLEANUP_SCHEDULE] = schedule
}

func (s systemInfoServiceImpl) GetSnapshotsCleanupSchedule() string {
	return s.systemInfoMap[SNAPSHOTS_CLEANUP_SCHEDULE].(string)
}

func (s systemInfoServiceImpl) setSnapshotsTTLDays() {
	envVal := os.Getenv(SNAPSHOTS_TTL_DAYS)
	if envVal == "" {
		envVal = "30" //1 month
	}
	val, err := strconv.Atoi(envVal)
	if err != nil {
		log.Errorf("failed to parse %v env value: %v. Value by default - 30", SNAPSHOTS_TTL_DAYS, err.Error())
		val = 30
	}
	s.systemInfoMap[SNAPSHOTS_TTL_DAYS] = val
}

func (s systemInfoServiceImpl) GetSnapshotsTTLDays() int {
	return s.systemInfoMap[SNAPSHOTS_TTL_DAYS].(int)
}

func (s systemInfoServiceImpl) InsecureProxyEnabled() bool {
	return s.systemInfoMap[INSECURE_PROXY].(bool)
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
