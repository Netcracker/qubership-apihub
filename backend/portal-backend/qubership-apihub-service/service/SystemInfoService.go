// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"encoding/base64"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

const (
	JWT_PRIVATE_KEY                        = "JWT_PRIVATE_KEY"
	ARTIFACT_DESCRIPTOR_VERSION            = "ARTIFACT_DESCRIPTOR_VERSION"
	BASE_PATH                              = "BASE_PATH"
	PRODUCTION_MODE                        = "PRODUCTION_MODE"
	LOG_LEVEL                              = "LOG_LEVEL"
	GITLAB_URL                             = "GITLAB_URL"
	DIFF_SERVICE_URL                       = "DIFF_SERVICE_URL"
	LISTEN_ADDRESS                         = "LISTEN_ADDRESS"
	ORIGIN_ALLOWED                         = "ORIGIN_ALLOWED"
	APIHUB_POSTGRESQL_HOST                 = "APIHUB_POSTGRESQL_HOST"
	APIHUB_POSTGRESQL_PORT                 = "APIHUB_POSTGRESQL_PORT"
	APIHUB_POSTGRESQL_DB_NAME              = "APIHUB_POSTGRESQL_DB_NAME"
	APIHUB_POSTGRESQL_USERNAME             = "APIHUB_POSTGRESQL_USERNAME"
	APIHUB_POSTGRESQL_PASSWORD             = "APIHUB_POSTGRESQL_PASSWORD"
	PG_SSL_MODE                            = "PG_SSL_MODE"
	CLIENT_ID                              = "CLIENT_ID"
	CLIENT_SECRET                          = "CLIENT_SECRET"
	APIHUB_URL                             = "APIHUB_URL"
	PUBLISH_ARCHIVE_SIZE_LIMIT_MB          = "PUBLISH_ARCHIVE_SIZE_LIMIT_MB"
	PUBLISH_FILE_SIZE_LIMIT_MB             = "PUBLISH_FILE_SIZE_LIMIT_MB"
	BRANCH_CONTENT_SIZE_LIMIT_MB           = "BRANCH_CONTENT_SIZE_LIMIT_MB"
	RELEASE_VERSION_PATTERN                = "RELEASE_VERSION_PATTERN"
	SAML_CRT                               = "SAML_CRT"
	SAML_KEY                               = "SAML_KEY"
	ADFS_METADATA_URL                      = "ADFS_METADATA_URL"
	LDAP_USER                              = "LDAP_USER"
	LDAP_USER_PASSWORD                     = "LDAP_USER_PASSWORD"
	LDAP_SERVER                            = "LDAP_SERVER"
	LDAP_BASE_DN                           = "LDAP_BASE_DN"
	LDAP_ORGANIZATION_UNIT                 = "LDAP_ORGANIZATION_UNIT"
	LDAP_SEARCH_BASE                       = "LDAP_SEARCH_BASE"
	SYSTEM_NOTIFICATION                    = "SYSTEM_NOTIFICATION" //TODO: replace with db impl
	BUILDS_CLEANUP_SCHEDULE                = "BUILDS_CLEANUP_SCHEDULE"
	INSECURE_PROXY                         = "INSECURE_PROXY"
	METRICS_GETTER_SCHEDULE                = "METRICS_GETTER_SCHEDULE"
	MONITORING_ENABLED                     = "MONITORING_ENABLED"
	STORAGE_SERVER_USERNAME                = "STORAGE_SERVER_USERNAME"
	STORAGE_SERVER_PASSWORD                = "STORAGE_SERVER_PASSWORD"
	STORAGE_SERVER_CRT                     = "STORAGE_SERVER_CRT"
	STORAGE_SERVER_URL                     = "STORAGE_SERVER_URL"
	STORAGE_SERVER_BUCKET_NAME             = "STORAGE_SERVER_BUCKET_NAME"
	STORAGE_SERVER_ACTIVE                  = "STORAGE_SERVER_ACTIVE"
	STORAGE_SERVER_STORE_ONLY_BUILD_RESULT = "STORAGE_SERVER_STORE_ONLY_BUILD_RESULT"
	EXTERNAL_LINKS                         = "EXTERNAL_LINKS"
	DEFAULT_WORKSPACE_ID                   = "DEFAULT_WORKSPACE_ID"
	CUSTOM_PATH_PREFIXES                   = "CUSTOM_PATH_PREFIXES"
	ALLOWED_HOSTS                          = "ALLOWED_HOSTS"
	APIHUB_ADMIN_EMAIL                     = "APIHUB_ADMIN_EMAIL"
	APIHUB_ADMIN_PASSWORD                  = "APIHUB_ADMIN_PASSWORD"
	APIHUB_SYSTEM_API_KEY                  = "APIHUB_ACCESS_TOKEN"
)

type SystemInfoService interface {
	GetSystemInfo() *view.SystemInfo
	Init() error
	GetBasePath() string
	GetJwtPrivateKey() []byte
	IsProductionMode() bool
	GetBackendVersion() string
	GetLogLevel() string
	GetGitlabUrl() string
	GetDiffServiceUrl() string
	GetListenAddress() string
	GetOriginAllowed() string
	GetPGHost() string
	GetPGPort() int
	GetPGDB() string
	GetPGUser() string
	GetPGPassword() string
	GetPGSSLMode() string
	GetClientID() string
	GetClientSecret() string
	GetAPIHubUrl() string
	GetPublishArchiveSizeLimitMB() int64
	GetPublishFileSizeLimitMB() int64
	GetBranchContentSizeLimitMB() int64
	GetReleaseVersionPattern() string
	GetCredsFromEnv() *view.DbCredentials
	GetSamlCrt() string
	GetSamlKey() string
	GetADFSMetadataUrl() string
	GetLdapServer() string
	GetLdapUser() string
	GetLdapUserPassword() string
	GetLdapBaseDN() string
	GetLdapOrganizationUnit() string
	GetLdapSearchBase() string
	GetBuildsCleanupSchedule() string
	InsecureProxyEnabled() bool
	GetMetricsGetterSchedule() string
	MonitoringEnabled() bool
	GetMinioAccessKeyId() string
	GetMinioSecretAccessKey() string
	GetMinioCrt() string
	GetMinioEndpoint() string
	GetMinioBucketName() string
	IsMinioStorageActive() bool
	GetMinioStorageCreds() *view.MinioStorageCreds
	IsMinioStoreOnlyBuildResult() bool
	GetExternalLinks() []string
	GetDefaultWorkspaceId() string
	GetCustomPathPrefixes() []string
	GetAllowedHosts() []string
	GetZeroDayAdminCreds() (string, string, error)
	GetSystemApiKey() (string, error)
}

func (g systemInfoServiceImpl) GetCredsFromEnv() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     g.GetPGHost(),
		Port:     g.GetPGPort(),
		Database: g.GetPGDB(),
		Username: g.GetPGUser(),
		Password: g.GetPGPassword(),
		SSLMode:  g.GetPGSSLMode(),
	}
}

func (s systemInfoServiceImpl) GetMinioStorageCreds() *view.MinioStorageCreds {
	return &view.MinioStorageCreds{
		BucketName:           s.GetMinioBucketName(),
		IsActive:             s.IsMinioStorageActive(),
		Endpoint:             s.GetMinioEndpoint(),
		Crt:                  s.GetMinioCrt(),
		AccessKeyId:          s.GetMinioAccessKeyId(),
		SecretAccessKey:      s.GetMinioSecretAccessKey(),
		IsOnlyForBuildResult: s.IsMinioStoreOnlyBuildResult(),
	}
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

func (g systemInfoServiceImpl) GetSystemInfo() *view.SystemInfo {
	return &view.SystemInfo{
		BackendVersion: g.GetBackendVersion(),
		ProductionMode: g.IsProductionMode(),
		Notification:   g.getSystemNotification(),
		ExternalLinks:  g.GetExternalLinks(),
	}
}

func (g systemInfoServiceImpl) Init() error {
	err := g.setJwtPrivateKey()
	if err != nil {
		return err
	}
	g.setBasePath()
	if err = g.setProductionMode(); err != nil {
		return err
	}
	g.setBackendVersion()
	g.setLogLevel()
	g.setGitlabUrl()
	g.setDiffServiceUrl()
	g.setListenAddress()
	g.setOriginAllowed()
	g.setPGHost()
	if err = g.setPGPort(); err != nil {
		return err
	}
	g.setPGDB()
	g.setPGUser()
	g.setPGPassword()
	g.setPGSSLMode()
	g.setClientID()
	g.setClientSecret()
	g.setAPIHubUrl()
	g.setPublishArchiveSizeLimitMB()
	g.setPublishFileSizeLimitMB()
	g.setBranchContentSizeLimitMB()
	g.setReleaseVersionPattern()
	g.setSamlCrt()
	g.setSamlKey()
	g.setADFSMetadataUrl()
	g.setLdapServer()
	g.setLdapUser()
	g.setLdapUserPassword()
	g.setLdapBaseDN()
	g.setLdapOrganizationUnit()
	g.setLdapSearchBase()
	g.setSystemNotification()
	g.setBuildsCleanupSchedule()
	g.setInsecureProxy()
	g.setMetricsGetterSchedule()
	g.setMonitoringEnabled()
	g.setMinioAccessKeyId()
	g.setMinioSecretAccessKey()
	g.setMinioCrt()
	g.setMinioEndpoint()
	g.setMinioBucketName()
	g.setMinioStorageActive()
	g.setMinioOnlyForBuildResult()
	g.setExternalLinks()
	g.setDefaultWorkspaceId()
	g.setCustomPathPrefixes()
	g.setAllowedHosts()

	return nil
}

func (g systemInfoServiceImpl) setBasePath() {
	g.systemInfoMap[BASE_PATH] = os.Getenv(BASE_PATH)
	if g.systemInfoMap[BASE_PATH] == "" {
		g.systemInfoMap[BASE_PATH] = "."
	}
}

func (g systemInfoServiceImpl) setJwtPrivateKey() error {
	decodePrivateKey, err := base64.StdEncoding.DecodeString(os.Getenv(JWT_PRIVATE_KEY))
	if err != nil {
		return fmt.Errorf("can't decode env JWT_PRIVATE_KEY. Error - %s", err.Error())
	}
	if len(decodePrivateKey) == 0 {
		return fmt.Errorf("env JWT_PRIVATE_KEY is not set or empty")
	}
	g.systemInfoMap[JWT_PRIVATE_KEY] = decodePrivateKey
	return nil
}

func (g systemInfoServiceImpl) setProductionMode() error {
	envVal := os.Getenv(PRODUCTION_MODE)
	if envVal == "" {
		envVal = "false"
	}
	productionMode, err := strconv.ParseBool(envVal)
	if err != nil {
		return fmt.Errorf("failed to parse %v env value: %v", PRODUCTION_MODE, err.Error())
	}
	g.systemInfoMap[PRODUCTION_MODE] = productionMode
	return nil
}

func (g systemInfoServiceImpl) setBackendVersion() {
	version := os.Getenv(ARTIFACT_DESCRIPTOR_VERSION)
	if version == "" {
		version = "unknown"
	}
	g.systemInfoMap[ARTIFACT_DESCRIPTOR_VERSION] = version
}

func (g systemInfoServiceImpl) GetBasePath() string {
	return g.systemInfoMap[BASE_PATH].(string)
}

func (g systemInfoServiceImpl) GetJwtPrivateKey() []byte {
	return g.systemInfoMap[JWT_PRIVATE_KEY].([]byte)
}

func (g systemInfoServiceImpl) IsProductionMode() bool {
	return g.systemInfoMap[PRODUCTION_MODE].(bool)
}

func (g systemInfoServiceImpl) GetBackendVersion() string {
	return g.systemInfoMap[ARTIFACT_DESCRIPTOR_VERSION].(string)
}

func (g systemInfoServiceImpl) setLogLevel() {
	g.systemInfoMap[LOG_LEVEL] = os.Getenv(LOG_LEVEL)
}

func (g systemInfoServiceImpl) GetLogLevel() string {
	return g.systemInfoMap[LOG_LEVEL].(string)
}

func (g systemInfoServiceImpl) setGitlabUrl() {
	gitlabUrl := os.Getenv(GITLAB_URL)
	if gitlabUrl == "" {
		gitlabUrl = "https://git.domain.com"
	}
	g.systemInfoMap[GITLAB_URL] = gitlabUrl
}

func (g systemInfoServiceImpl) GetGitlabUrl() string {
	return g.systemInfoMap[GITLAB_URL].(string)
}

func (g systemInfoServiceImpl) setDiffServiceUrl() {
	nodeServiceUrl := os.Getenv(DIFF_SERVICE_URL)
	if nodeServiceUrl == "" {
		nodeServiceUrl = "http://localhost:3000"
	}
	g.systemInfoMap[DIFF_SERVICE_URL] = nodeServiceUrl
}

func (g systemInfoServiceImpl) GetDiffServiceUrl() string {
	return g.systemInfoMap[DIFF_SERVICE_URL].(string)
}

func (g systemInfoServiceImpl) setListenAddress() {
	listenAddr := os.Getenv(LISTEN_ADDRESS)
	if listenAddr == "" {
		listenAddr = ":8080"
	}
	g.systemInfoMap[LISTEN_ADDRESS] = listenAddr
}

func (g systemInfoServiceImpl) GetListenAddress() string {
	return g.systemInfoMap[LISTEN_ADDRESS].(string)
}

func (g systemInfoServiceImpl) setOriginAllowed() {
	g.systemInfoMap[ORIGIN_ALLOWED] = os.Getenv(ORIGIN_ALLOWED)
}

func (g systemInfoServiceImpl) GetOriginAllowed() string {
	return g.systemInfoMap[ORIGIN_ALLOWED].(string)
}

func (g systemInfoServiceImpl) setPGHost() {
	host := os.Getenv(APIHUB_POSTGRESQL_HOST)
	if host == "" {
		host = "localhost"
	}
	g.systemInfoMap[APIHUB_POSTGRESQL_HOST] = host
}

func (g systemInfoServiceImpl) GetPGHost() string {
	return g.systemInfoMap[APIHUB_POSTGRESQL_HOST].(string)
}

func (g systemInfoServiceImpl) setPGPort() error {
	portStr := os.Getenv(APIHUB_POSTGRESQL_PORT)
	var port int
	var err error
	if portStr == "" {
		port = 5432
	} else {
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return fmt.Errorf("failed to parse %v env value: %v", APIHUB_POSTGRESQL_PORT, err.Error())
		}
	}
	g.systemInfoMap[APIHUB_POSTGRESQL_PORT] = port
	return nil
}

func (g systemInfoServiceImpl) GetPGPort() int {
	return g.systemInfoMap[APIHUB_POSTGRESQL_PORT].(int)
}

func (g systemInfoServiceImpl) setPGDB() {
	database := os.Getenv(APIHUB_POSTGRESQL_DB_NAME)
	if database == "" {
		database = "apihub"
	}
	g.systemInfoMap[APIHUB_POSTGRESQL_DB_NAME] = database
}

func (g systemInfoServiceImpl) GetPGDB() string {
	return g.systemInfoMap[APIHUB_POSTGRESQL_DB_NAME].(string)
}

func (g systemInfoServiceImpl) setPGUser() {
	user := os.Getenv(APIHUB_POSTGRESQL_USERNAME)
	if user == "" {
		user = "apihub"
	}
	g.systemInfoMap[APIHUB_POSTGRESQL_USERNAME] = user
}

func (g systemInfoServiceImpl) GetPGUser() string {
	return g.systemInfoMap[APIHUB_POSTGRESQL_USERNAME].(string)
}

func (g systemInfoServiceImpl) setPGPassword() {
	password := os.Getenv(APIHUB_POSTGRESQL_PASSWORD)
	if password == "" {
		password = "apihub"
	}
	g.systemInfoMap[APIHUB_POSTGRESQL_PASSWORD] = password
}

func (g systemInfoServiceImpl) GetPGPassword() string {
	return g.systemInfoMap[APIHUB_POSTGRESQL_PASSWORD].(string)
}

func (g systemInfoServiceImpl) setPGSSLMode() {
	sslMode := os.Getenv(PG_SSL_MODE)
	if sslMode == "" {
		sslMode = "disable"
	}
	g.systemInfoMap[PG_SSL_MODE] = sslMode
}

func (g systemInfoServiceImpl) GetPGSSLMode() string {
	return g.systemInfoMap[PG_SSL_MODE].(string)
}

func (g systemInfoServiceImpl) setClientID() {
	g.systemInfoMap[CLIENT_ID] = os.Getenv(CLIENT_ID)
}

func (g systemInfoServiceImpl) GetClientID() string {
	return g.systemInfoMap[CLIENT_ID].(string)
}

func (g systemInfoServiceImpl) setClientSecret() {
	g.systemInfoMap[CLIENT_SECRET] = os.Getenv(CLIENT_SECRET)
}

func (g systemInfoServiceImpl) GetClientSecret() string {
	return g.systemInfoMap[CLIENT_SECRET].(string)
}

func (g systemInfoServiceImpl) setAPIHubUrl() {
	g.systemInfoMap[APIHUB_URL] = os.Getenv(APIHUB_URL)
}

func (g systemInfoServiceImpl) GetAPIHubUrl() string {
	return g.systemInfoMap[APIHUB_URL].(string)
}

func (g systemInfoServiceImpl) setPublishArchiveSizeLimitMB() {
	var bytesInMb int64 = 1048576
	publishArchiveSizeLimit, err := strconv.ParseInt(os.Getenv(PUBLISH_ARCHIVE_SIZE_LIMIT_MB), 0, 64)
	if err != nil || publishArchiveSizeLimit == 0 {
		publishArchiveSizeLimit = 50
		log.Warnf("PUBLISH_ARCHIVE_SIZE_LIMIT_MB has incorrect value, default=%d is going to be used", 50)
	}
	g.systemInfoMap[PUBLISH_ARCHIVE_SIZE_LIMIT_MB] = publishArchiveSizeLimit * bytesInMb
}

func (g systemInfoServiceImpl) GetPublishArchiveSizeLimitMB() int64 {
	return g.systemInfoMap[PUBLISH_ARCHIVE_SIZE_LIMIT_MB].(int64)
}

func (g systemInfoServiceImpl) setPublishFileSizeLimitMB() {
	var bytesInMb int64 = 1048576
	publishFileSizeLimit, err := strconv.ParseInt(os.Getenv(PUBLISH_FILE_SIZE_LIMIT_MB), 0, 64)
	if err != nil || publishFileSizeLimit == 0 {
		publishFileSizeLimit = 15 //15Mb
		log.Warnf("PUBLISH_FILE_SIZE_LIMIT_MB has incorrect value, default=%d is going to be used", 15)
	}
	publishFileSizeLimit = publishFileSizeLimit * bytesInMb
	g.systemInfoMap[PUBLISH_FILE_SIZE_LIMIT_MB] = publishFileSizeLimit
}

func (g systemInfoServiceImpl) setBranchContentSizeLimitMB() {
	var bytesInMb int64 = 1048576
	branchContentSizeLimit, err := strconv.ParseInt(os.Getenv(BRANCH_CONTENT_SIZE_LIMIT_MB), 0, 64)
	if err != nil || branchContentSizeLimit == 0 {
		branchContentSizeLimit = 50
		log.Warnf("BRANCH_CONTENT_SIZE_LIMIT_MB has incorrect value, default=%d is going to be used", 50)
	}
	g.systemInfoMap[BRANCH_CONTENT_SIZE_LIMIT_MB] = branchContentSizeLimit * bytesInMb
}

func (g systemInfoServiceImpl) GetBranchContentSizeLimitMB() int64 {
	return g.systemInfoMap[BRANCH_CONTENT_SIZE_LIMIT_MB].(int64)
}

func (g systemInfoServiceImpl) GetPublishFileSizeLimitMB() int64 {
	return g.systemInfoMap[PUBLISH_FILE_SIZE_LIMIT_MB].(int64)
}

func (g systemInfoServiceImpl) setReleaseVersionPattern() {
	pattern := os.Getenv(RELEASE_VERSION_PATTERN)
	if pattern == "" {
		pattern = `^[0-9]{4}[.]{1}[1-4]{1}$`
	}
	g.systemInfoMap[RELEASE_VERSION_PATTERN] = pattern
}

func (g systemInfoServiceImpl) GetReleaseVersionPattern() string {
	return g.systemInfoMap[RELEASE_VERSION_PATTERN].(string)
}

func (g systemInfoServiceImpl) setSamlCrt() {
	g.systemInfoMap[SAML_CRT] = os.Getenv(SAML_CRT)
}

func (g systemInfoServiceImpl) GetSamlCrt() string {
	return g.systemInfoMap[SAML_CRT].(string)
}

func (g systemInfoServiceImpl) setSamlKey() {
	g.systemInfoMap[SAML_KEY] = os.Getenv(SAML_KEY)
}

func (g systemInfoServiceImpl) GetSamlKey() string {
	return g.systemInfoMap[SAML_KEY].(string)
}

func (g systemInfoServiceImpl) setADFSMetadataUrl() {
	g.systemInfoMap[ADFS_METADATA_URL] = os.Getenv(ADFS_METADATA_URL)
}

func (g systemInfoServiceImpl) GetADFSMetadataUrl() string {
	return g.systemInfoMap[ADFS_METADATA_URL].(string)
}

func (g systemInfoServiceImpl) setLdapServer() {
	ldapServerUrl := os.Getenv(LDAP_SERVER)
	if ldapServerUrl == "" {
		log.Error("env LDAP_SERVER is not set or empty")
	}
	g.systemInfoMap[LDAP_SERVER] = os.Getenv(LDAP_SERVER)
}

func (g systemInfoServiceImpl) GetLdapServer() string {
	return g.systemInfoMap[LDAP_SERVER].(string)
}

func (g systemInfoServiceImpl) setLdapUser() {
	ldapUser := os.Getenv(LDAP_USER)
	if ldapUser == "" {
		log.Error("env LDAP_USER is not set or empty")
	}
	g.systemInfoMap[LDAP_USER] = os.Getenv(LDAP_USER)
}

func (g systemInfoServiceImpl) GetLdapUser() string {
	return g.systemInfoMap[LDAP_USER].(string)
}

func (g systemInfoServiceImpl) setLdapUserPassword() {
	ldapUserPassword := os.Getenv(LDAP_USER_PASSWORD)
	if ldapUserPassword == "" {
		log.Error("env LDAP_USER_PASSWORD is not set or empty")
	}
	g.systemInfoMap[LDAP_USER_PASSWORD] = os.Getenv(LDAP_USER_PASSWORD)
}

func (g systemInfoServiceImpl) GetLdapUserPassword() string {
	return g.systemInfoMap[LDAP_USER_PASSWORD].(string)
}

func (g systemInfoServiceImpl) setLdapBaseDN() {
	ldapBaseDn := os.Getenv(LDAP_BASE_DN)
	if ldapBaseDn == "" {
		log.Error("env LDAP_BASE_DN is not set or empty")
	}
	g.systemInfoMap[LDAP_BASE_DN] = ldapBaseDn
}

func (g systemInfoServiceImpl) setLdapOrganizationUnit() {
	ldapOU := os.Getenv(LDAP_ORGANIZATION_UNIT)
	if ldapOU == "" {
		log.Error("env LDAP_ORGANIZATION_UNIT is not set or empty")
	}
	g.systemInfoMap[LDAP_ORGANIZATION_UNIT] = ldapOU
}

func (g systemInfoServiceImpl) setLdapSearchBase() {
	ldapSearchBase := os.Getenv(LDAP_SEARCH_BASE)
	if ldapSearchBase == "" {
		log.Error("env LDAP_SEARCH_BASE is not set or empty")
	}
	g.systemInfoMap[LDAP_SEARCH_BASE] = ldapSearchBase
}

func (g systemInfoServiceImpl) GetLdapBaseDN() string {
	return g.systemInfoMap[LDAP_BASE_DN].(string)
}

func (g systemInfoServiceImpl) GetLdapOrganizationUnit() string {
	return g.systemInfoMap[LDAP_ORGANIZATION_UNIT].(string)
}

func (g systemInfoServiceImpl) GetLdapSearchBase() string {
	return g.systemInfoMap[LDAP_SEARCH_BASE].(string)
}

func (g systemInfoServiceImpl) setSystemNotification() {
	g.systemInfoMap[SYSTEM_NOTIFICATION] = os.Getenv(SYSTEM_NOTIFICATION)
}

func (g systemInfoServiceImpl) getSystemNotification() string {
	return g.systemInfoMap[SYSTEM_NOTIFICATION].(string)
}

func (g systemInfoServiceImpl) GetBuildsCleanupSchedule() string {
	return g.systemInfoMap[BUILDS_CLEANUP_SCHEDULE].(string)
}

func (g systemInfoServiceImpl) setBuildsCleanupSchedule() {
	g.systemInfoMap[BUILDS_CLEANUP_SCHEDULE] = "0 1 * * 0" // at 01:00 AM on Sunday
}

func (g systemInfoServiceImpl) setInsecureProxy() {
	envVal := os.Getenv(INSECURE_PROXY)
	insecureProxy, err := strconv.ParseBool(envVal)
	if err != nil {
		log.Infof("environment variable %v has invalid value, using false value instead", INSECURE_PROXY)
		insecureProxy = false
	}
	g.systemInfoMap[INSECURE_PROXY] = insecureProxy
}

func (s systemInfoServiceImpl) InsecureProxyEnabled() bool {
	return s.systemInfoMap[INSECURE_PROXY].(bool)
}

func (g systemInfoServiceImpl) GetMetricsGetterSchedule() string {
	return g.systemInfoMap[METRICS_GETTER_SCHEDULE].(string)
}

func (g systemInfoServiceImpl) setMetricsGetterSchedule() {
	g.systemInfoMap[METRICS_GETTER_SCHEDULE] = "* * * * *" // every minute
}

func (g systemInfoServiceImpl) setMonitoringEnabled() {
	envVal := os.Getenv(MONITORING_ENABLED)
	monitoringEnabled, err := strconv.ParseBool(envVal)
	if err != nil {
		log.Infof("environment variable %v has invalid value, using false value instead", MONITORING_ENABLED)
		monitoringEnabled = false
	}
	g.systemInfoMap[MONITORING_ENABLED] = monitoringEnabled
}

func (s systemInfoServiceImpl) MonitoringEnabled() bool {
	return s.systemInfoMap[MONITORING_ENABLED].(bool)
}

func (g systemInfoServiceImpl) GetMinioAccessKeyId() string {
	return g.systemInfoMap[STORAGE_SERVER_USERNAME].(string)
}

func (g systemInfoServiceImpl) setMinioAccessKeyId() {
	g.systemInfoMap[STORAGE_SERVER_USERNAME] = os.Getenv(STORAGE_SERVER_USERNAME)
}

func (g systemInfoServiceImpl) GetMinioSecretAccessKey() string {
	return g.systemInfoMap[STORAGE_SERVER_PASSWORD].(string)
}

func (g systemInfoServiceImpl) setMinioSecretAccessKey() {
	g.systemInfoMap[STORAGE_SERVER_PASSWORD] = os.Getenv(STORAGE_SERVER_PASSWORD)
}

func (g systemInfoServiceImpl) GetMinioCrt() string {
	return g.systemInfoMap[STORAGE_SERVER_CRT].(string)
}

func (g systemInfoServiceImpl) setMinioCrt() {
	g.systemInfoMap[STORAGE_SERVER_CRT] = os.Getenv(STORAGE_SERVER_CRT)
}

func (g systemInfoServiceImpl) GetMinioEndpoint() string {
	return g.systemInfoMap[STORAGE_SERVER_URL].(string)
}

func (g systemInfoServiceImpl) setMinioEndpoint() {
	g.systemInfoMap[STORAGE_SERVER_URL] = os.Getenv(STORAGE_SERVER_URL)
}

func (g systemInfoServiceImpl) GetMinioBucketName() string {
	return g.systemInfoMap[STORAGE_SERVER_BUCKET_NAME].(string)
}

func (g systemInfoServiceImpl) setMinioBucketName() {
	g.systemInfoMap[STORAGE_SERVER_BUCKET_NAME] = os.Getenv(STORAGE_SERVER_BUCKET_NAME)
}

func (g systemInfoServiceImpl) setMinioStorageActive() {
	envVal := os.Getenv(STORAGE_SERVER_ACTIVE)
	if envVal == "" {
		envVal = "false"
	}
	val, err := strconv.ParseBool(envVal)
	if err != nil {
		log.Errorf("failed to parse %v env value: %v. Value by default - false", STORAGE_SERVER_ACTIVE, err.Error())
		val = false
	}
	g.systemInfoMap[STORAGE_SERVER_ACTIVE] = val
}

func (g systemInfoServiceImpl) IsMinioStorageActive() bool {
	return g.systemInfoMap[STORAGE_SERVER_ACTIVE].(bool)
}

func (g systemInfoServiceImpl) IsMinioStoreOnlyBuildResult() bool {
	return g.systemInfoMap[STORAGE_SERVER_STORE_ONLY_BUILD_RESULT].(bool)
}

func (g systemInfoServiceImpl) setMinioOnlyForBuildResult() {
	envVal := os.Getenv(STORAGE_SERVER_STORE_ONLY_BUILD_RESULT)
	if envVal == "" {
		envVal = "false"
	}
	val, err := strconv.ParseBool(envVal)
	if err != nil {
		log.Errorf("failed to parse %v env value: %v. Value by default - false", STORAGE_SERVER_STORE_ONLY_BUILD_RESULT, err.Error())
		val = false
	}
	if !g.IsMinioStorageActive() && val == true {
		val = false
		log.Warnf("%s was set to false because %s had been set to false", STORAGE_SERVER_STORE_ONLY_BUILD_RESULT, STORAGE_SERVER_ACTIVE)
	}
	g.systemInfoMap[STORAGE_SERVER_STORE_ONLY_BUILD_RESULT] = val
}

func (g systemInfoServiceImpl) GetExternalLinks() []string {
	return g.systemInfoMap[EXTERNAL_LINKS].([]string)
}

func (g systemInfoServiceImpl) setExternalLinks() {
	externalLinksStr := os.Getenv(EXTERNAL_LINKS)
	if externalLinksStr != "" {
		g.systemInfoMap[EXTERNAL_LINKS] = strings.Split(externalLinksStr, ",")
	} else {
		g.systemInfoMap[EXTERNAL_LINKS] = []string{}
	}
}

func (g systemInfoServiceImpl) GetDefaultWorkspaceId() string {
	return g.systemInfoMap[DEFAULT_WORKSPACE_ID].(string)
}

func (g systemInfoServiceImpl) setDefaultWorkspaceId() {
	g.systemInfoMap[DEFAULT_WORKSPACE_ID] = os.Getenv(DEFAULT_WORKSPACE_ID)
}

func (g systemInfoServiceImpl) setCustomPathPrefixes() {
	prefixes := make([]string, 0)
	prefixesStr := os.Getenv("CUSTOM_PATH_PREFIXES")
	if prefixesStr != "" {
		prefixes = strings.Split(prefixesStr, ",")
	}
	g.systemInfoMap[CUSTOM_PATH_PREFIXES] = prefixes
}

func (g systemInfoServiceImpl) GetCustomPathPrefixes() []string {
	return g.systemInfoMap[CUSTOM_PATH_PREFIXES].([]string)
}

func (g systemInfoServiceImpl) setAllowedHosts() {
	hosts := make([]string, 0)
	hostsStr := os.Getenv("ALLOWED_HOSTS")
	if hostsStr != "" {
		hosts = strings.Split(hostsStr, ",")
	}
	g.systemInfoMap[ALLOWED_HOSTS] = hosts
}

func (g systemInfoServiceImpl) GetAllowedHosts() []string {
	return g.systemInfoMap[ALLOWED_HOSTS].([]string)
}

func (g systemInfoServiceImpl) GetZeroDayAdminCreds() (string, string, error) {
	email := os.Getenv(APIHUB_ADMIN_EMAIL)
	password := os.Getenv(APIHUB_ADMIN_PASSWORD)
	if email == "" || password == "" {
		return "", "", fmt.Errorf("some zero day admin envs('%s' or '%s') are empty or not set", APIHUB_ADMIN_EMAIL, APIHUB_ADMIN_PASSWORD)
	}
	return email, password, nil
}

func (g systemInfoServiceImpl) GetSystemApiKey() (string, error) {
	apiKey := os.Getenv(APIHUB_SYSTEM_API_KEY)
	if apiKey == "" {
		return "", fmt.Errorf("system api key env '%s' is empty or not set", APIHUB_SYSTEM_API_KEY)
	}
	return apiKey, nil
}
