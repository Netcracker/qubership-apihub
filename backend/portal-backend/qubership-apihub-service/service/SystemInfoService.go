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
	"fmt"
	"os"
	"reflect"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/config"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

const (
	GIT_BRANCH           = "GIT_BRANCH"
	GIT_HASH             = "GIT_HASH"
	APIHUB_CONFIG_FOLDER = "APIHUB_CONFIG_FOLDER"

	LocalIDPId = "local-idp"
	bytesInMb  = 1048576
)

type SystemInfoService interface {
	GetSystemInfo() *view.SystemInfo
	Init() error
	GetBasePath() string
	GetJwtPrivateKey() []byte
	IsProductionMode() bool
	GetBackendVersion() string
	GetGitlabUrl() string
	GetListenAddress() string
	GetAllowedOrigins() []string
	GetPGHost() string
	GetPGPort() int
	GetPGDB() string
	GetPGUser() string
	GetPGPassword() string
	GetClientID() string
	GetClientSecret() string
	GetAPIHubUrl() string
	GetPublishArchiveSizeLimitMB() int64
	GetPublishFileSizeLimitMB() int64
	GetBranchContentSizeLimitMB() int64
	GetReleaseVersionPattern() string
	GetCredsFromEnv() *view.DbCredentials
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
	GetAllowedHosts() []string
	GetZeroDayAdminCreds() (string, string)
	GetSystemApiKey() string
	GetEditorDisabled() bool
	FailBuildOnBrokenRefs() bool
	GetAccessTokenDurationSec() int
	GetRefreshTokenDurationSec() int
	IsLegacySAML() bool
	GetAuthConfig() idp.AuthConfig
	GetOlricConfig() config.OlricConfig
	GetConfigFolder() string
	GetInstanceId() string
	GetRevisionsCleanupSchedule() string
	GetRevisionsCleanupDeleteLastRevision() bool
	GetRevisionsCleanupDeleteReleaseRevisions() bool
	GetRevisionsTTLDays() int
	GetComparisonCleanupSchedule() string
	GetComparisonCleanupTimeout() int
	GetComparisonsTTLDays() int
	GetSoftDeletedDataCleanupSchedule() string
	GetSoftDeletedDataCleanupTimeout() int
	GetSoftDeletedDataTTLDays() int
}

func (g *systemInfoServiceImpl) GetCredsFromEnv() *view.DbCredentials {
	return &view.DbCredentials{
		Host:     g.GetPGHost(),
		Port:     g.GetPGPort(),
		Database: g.GetPGDB(),
		Username: g.GetPGUser(),
		Password: g.GetPGPassword(),
	}
}

func (s *systemInfoServiceImpl) GetMinioStorageCreds() *view.MinioStorageCreds {
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
	s := &systemInfoServiceImpl{}
	if err := s.Init(); err != nil {
		log.Error("Failed to read system info: " + err.Error())
		return nil, err
	}
	return s, nil
}

type systemInfoServiceImpl struct {
	config     config.Config
	authConfig idp.AuthConfig
}

func (g *systemInfoServiceImpl) GetSystemInfo() *view.SystemInfo {
	return &view.SystemInfo{
		BackendVersion: g.GetBackendVersion(),
		ProductionMode: g.IsProductionMode(),
		Notification:   g.getSystemNotification(),
		ExternalLinks:  g.GetExternalLinks(),
	}
}

func (g *systemInfoServiceImpl) Init() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(g.GetConfigFolder())
	g.setDefaults()

	if err := viper.ReadInConfig(); err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}
	opts := viper.DecodeHook(base64EncodedStringDecodeHook())
	if err := viper.Unmarshal(&g.config, opts); err != nil {
		return fmt.Errorf("failed to unmarshal config: %w", err)
	}
	g.postProcessConfig()

	utils.PrintConfig(g.config)

	if err := utils.ValidateConfig(g.config); err != nil {
		return err
	}

	authConfig, err := g.buildAuthConfig()
	if err != nil {
		return err
	}
	g.authConfig = authConfig

	return nil
}

func base64EncodedStringDecodeHook() mapstructure.DecodeHookFunc {
	return func(f reflect.Type, t reflect.Type, data interface{}) (interface{}, error) {
		if f.Kind() != reflect.String {
			return data, nil
		}
		if t != reflect.TypeOf(config.Base64DecodedString{}) {
			return data, nil
		}

		d := new(config.Base64DecodedString)
		err := d.UnmarshalText([]byte(data.(string)))
		if err != nil {
			return nil, err
		}
		return *d, nil
	}
}

func (g *systemInfoServiceImpl) setDefaults() {
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.name", "apihub")
	viper.SetDefault("database.username", "apihub")
	viper.SetDefault("database.password", "apihub")
	viper.SetDefault("security.productionMode", true)
	viper.SetDefault("security.jwt.accessTokenDurationSec", 1800)
	viper.SetDefault("security.jwt.refreshTokenDurationSec", 43200)
	viper.SetDefault("security.insecureProxy", false)
	viper.SetDefault("security.allowedHostsForProxy", []string{})
	viper.SetDefault("security.allowedOrigins", []string{})
	viper.SetDefault("security.legacySaml", true)
	viper.SetDefault("security.autoLogin", false)
	viper.SetDefault("technicalParameters.basePath", ".")
	viper.SetDefault("technicalParameters.listenAddress", ":8080")
	viper.SetDefault("technicalParameters.metricsGetterSchedule", "* * * * *") // every minute
	viper.SetDefault("businessParameters.publishArchiveSizeLimitMb", 50)
	viper.SetDefault("businessParameters.publishFileSizeLimitMb", 15)
	viper.SetDefault("businessParameters.branchContentSizeLimitMb", 50)
	viper.SetDefault("businessParameters.releaseVersionPattern", ".*")
	viper.SetDefault("businessParameters.externalLinks", []string{})
	viper.SetDefault("businessParameters.failBuildOnBrokenRefs", true)
	viper.SetDefault("monitoring.enabled", false)
	viper.SetDefault("s3Storage.enabled", false)
	viper.SetDefault("s3Storage.storeOnlyBuildResult", false)
	viper.SetDefault("editor.disabled", true)
	viper.SetDefault("olric.discoveryMode", "local")
	viper.SetDefault("olric.replicaCount", 1)
	viper.SetDefault("cleanup.builds.schedule", "0 1 * * 0")     // at 01:00 AM on Sunday
	viper.SetDefault("cleanup.revisions.schedule", "0 21 * * 0") // at 9:00 PM on Sunday
	viper.SetDefault("cleanup.revisions.deleteLastRevision", false)
	viper.SetDefault("cleanup.revisions.deleteReleaseRevisions", false)
	viper.SetDefault("cleanup.revisions.ttlDays", 365)
	viper.SetDefault("cleanup.comparisons.schedule", "0 5 * * 0") //at 5:00 AM on Sunday
	viper.SetDefault("cleanup.comparisons.timeoutMinutes", 720)   //12 hours
	viper.SetDefault("cleanup.comparisons.ttlDays", 30)
	viper.SetDefault("cleanup.softDeletedData.schedule", "0 22 * * 5") //at 10 PM on Friday
	viper.SetDefault("cleanup.softDeletedData.timeoutMinutes", 1200)   //20 hours
	viper.SetDefault("cleanup.softDeletedData.ttlDays", 730)           // 2 years
}

func (g *systemInfoServiceImpl) GetConfigFolder() string {
	folder := os.Getenv(APIHUB_CONFIG_FOLDER)
	if folder == "" {
		log.Warn("APIHUB_CONFIG_FOLDER is not set, using default value: '.'")
		folder = "."
	}
	return folder
}

func (g *systemInfoServiceImpl) postProcessConfig() {
	g.setBackendVersion()
	g.setInstanceId()

	//TODO: do we really need to log errors about empty LDAP params or printing of the full config is enough?
	if g.config.Security.Ldap.Server == "" {
		log.Error("config value 'security.ldap.server' is not set or empty")
	}
	if g.config.Security.Ldap.User == "" {
		log.Error("config value 'security.ldap.user' is not set or empty")
	}
	if g.config.Security.Ldap.Password == "" {
		log.Error("config value 'security.ldap.password' is not set or empty")
	}
	if g.config.Security.Ldap.BaseDN == "" {
		log.Error("config value 'security.ldap.baseDN' is not set or empty")
	}
	if g.config.Security.Ldap.OrganizationUnit == "" {
		log.Error("config value 'security.ldap.organizationUnit' is not set or empty")
	}
	if g.config.Security.Ldap.SearchBase == "" {
		log.Error("config value 'security.ldap.searchBase' is not set or empty")
	}
}
func (g *systemInfoServiceImpl) setBackendVersion() {
	gitBranch := os.Getenv(GIT_BRANCH)
	gitHash := os.Getenv(GIT_HASH)

	if gitBranch == "" && gitHash == "" {
		g.config.TechnicalParameters.BackendVersion = "unknown"
	} else {
		g.config.TechnicalParameters.BackendVersion = gitBranch + "." + gitHash
	}
}

func (g *systemInfoServiceImpl) setInstanceId() {
	instanceId := uuid.New().String()
	log.Infof("Instance ID: %s", instanceId)
	g.config.TechnicalParameters.InstanceId = instanceId
}

func (g *systemInfoServiceImpl) GetBasePath() string {
	return g.config.TechnicalParameters.BasePath
}

func (g *systemInfoServiceImpl) GetJwtPrivateKey() []byte {
	return g.config.Security.Jwt.PrivateKey
}

func (g *systemInfoServiceImpl) IsProductionMode() bool {
	return g.config.Security.ProductionMode
}

func (g *systemInfoServiceImpl) GetBackendVersion() string {
	return g.config.TechnicalParameters.BackendVersion
}

func (g *systemInfoServiceImpl) GetGitlabUrl() string {
	return g.config.Editor.GitlabUrl
}

func (g *systemInfoServiceImpl) GetListenAddress() string {
	return g.config.TechnicalParameters.ListenAddress
}

func (g *systemInfoServiceImpl) GetAllowedOrigins() []string {
	return g.config.Security.AllowedOrigins
}

func (g *systemInfoServiceImpl) GetPGHost() string {
	return g.config.Database.Host
}

func (g *systemInfoServiceImpl) GetPGPort() int {
	return g.config.Database.Port
}

func (g *systemInfoServiceImpl) GetPGDB() string {
	return g.config.Database.Name
}

func (g *systemInfoServiceImpl) GetPGUser() string {
	return g.config.Database.Username
}

func (g *systemInfoServiceImpl) GetPGPassword() string {
	return g.config.Database.Password
}

func (g *systemInfoServiceImpl) GetClientID() string {
	return g.config.Editor.ClientId
}

func (g *systemInfoServiceImpl) GetClientSecret() string {
	return g.config.Editor.ClientSecret
}

func (g *systemInfoServiceImpl) GetAPIHubUrl() string {
	return g.config.Security.ApihubExternalUrl
}

func (g *systemInfoServiceImpl) GetPublishArchiveSizeLimitMB() int64 {
	return int64(g.config.BusinessParameters.PublishArchiveSizeLimitMb * bytesInMb)
}

func (g *systemInfoServiceImpl) GetBranchContentSizeLimitMB() int64 {
	return int64(g.config.BusinessParameters.BranchContentSizeLimitMb * bytesInMb)
}

func (g *systemInfoServiceImpl) GetPublishFileSizeLimitMB() int64 {
	return int64(g.config.BusinessParameters.PublishFileSizeLimitMb * bytesInMb)
}

func (g *systemInfoServiceImpl) GetReleaseVersionPattern() string {
	return g.config.BusinessParameters.ReleaseVersionPattern
}

func (g *systemInfoServiceImpl) GetLdapServer() string {
	return g.config.Security.Ldap.Server
}

func (g *systemInfoServiceImpl) GetLdapUser() string {
	return g.config.Security.Ldap.User
}

func (g *systemInfoServiceImpl) GetLdapUserPassword() string {
	return g.config.Security.Ldap.Password
}

func (g *systemInfoServiceImpl) GetLdapBaseDN() string {
	return g.config.Security.Ldap.BaseDN
}

func (g *systemInfoServiceImpl) GetLdapOrganizationUnit() string {
	return g.config.Security.Ldap.OrganizationUnit
}

func (g *systemInfoServiceImpl) GetLdapSearchBase() string {
	return g.config.Security.Ldap.SearchBase
}

func (g *systemInfoServiceImpl) getSystemNotification() string {
	return g.config.BusinessParameters.SystemNotification
}

func (g *systemInfoServiceImpl) GetBuildsCleanupSchedule() string {
	return g.config.Cleanup.Builds.Schedule
}

func (s *systemInfoServiceImpl) InsecureProxyEnabled() bool {
	return s.config.Security.InsecureProxy
}

func (g *systemInfoServiceImpl) GetMetricsGetterSchedule() string {
	return g.config.TechnicalParameters.MetricsGetterSchedule
}

func (s *systemInfoServiceImpl) MonitoringEnabled() bool {
	return s.config.Monitoring.Enabled
}

func (g *systemInfoServiceImpl) GetMinioAccessKeyId() string {
	return g.config.S3Storage.Username
}

func (g *systemInfoServiceImpl) GetMinioSecretAccessKey() string {
	return g.config.S3Storage.Password
}

func (g *systemInfoServiceImpl) GetMinioCrt() string {
	return g.config.S3Storage.Crt
}

func (g *systemInfoServiceImpl) GetMinioEndpoint() string {
	return g.config.S3Storage.Url
}

func (g *systemInfoServiceImpl) GetMinioBucketName() string {
	return g.config.S3Storage.BucketName
}

func (g *systemInfoServiceImpl) IsMinioStorageActive() bool {
	return g.config.S3Storage.Enabled
}

func (g *systemInfoServiceImpl) IsMinioStoreOnlyBuildResult() bool {
	return g.config.S3Storage.StoreOnlyBuildResult
}

func (g *systemInfoServiceImpl) GetExternalLinks() []string {
	return g.config.BusinessParameters.ExternalLinks
}

func (g *systemInfoServiceImpl) GetDefaultWorkspaceId() string {
	return g.config.BusinessParameters.DefaultWorkspaceId
}

func (g *systemInfoServiceImpl) GetAllowedHosts() []string {
	return g.config.Security.AllowedHostsForProxy
}

func (g *systemInfoServiceImpl) GetZeroDayAdminCreds() (string, string) {
	return g.config.ZeroDayConfiguration.AdminEmail, g.config.ZeroDayConfiguration.AdminPassword
}

func (g *systemInfoServiceImpl) GetSystemApiKey() string {
	return g.config.ZeroDayConfiguration.AccessToken
}

func (g *systemInfoServiceImpl) GetEditorDisabled() bool {
	return g.config.Editor.Disabled
}

func (g *systemInfoServiceImpl) FailBuildOnBrokenRefs() bool {
	return g.config.BusinessParameters.FailBuildOnBrokenRefs
}

func (g *systemInfoServiceImpl) GetAccessTokenDurationSec() int {
	return g.config.Security.Jwt.AccessTokenDurationSec
}

func (g *systemInfoServiceImpl) GetRefreshTokenDurationSec() int {
	return g.config.Security.Jwt.RefreshTokenDurationSec
}

func (g *systemInfoServiceImpl) IsLegacySAML() bool {
	return g.config.Security.LegacySaml
}

func (g *systemInfoServiceImpl) GetAuthConfig() idp.AuthConfig {
	return g.authConfig
}

func (g *systemInfoServiceImpl) GetOlricConfig() config.OlricConfig {
	return g.config.Olric
}

// all IDP initialization should be done in this method only
func (g *systemInfoServiceImpl) buildAuthConfig() (idp.AuthConfig, error) {
	var authConfig idp.AuthConfig
	firstSAMLProvider := true
	for _, provider := range g.config.Security.ExternalIdentityProviders {
		switch provider.Protocol {
		case idp.AuthProtocolSAML:
			samlConfig := provider.SamlConfiguration
			loginStartEndpoint := "/api/v1/login/sso/" + provider.Id
			//TODO: remove after IDP reconfiguration
			if firstSAMLProvider && g.IsLegacySAML() {
				loginStartEndpoint = "/login/sso/saml"
				firstSAMLProvider = false
			}
			externalIDP := idp.IDP{
				Id:                 provider.Id,
				IdpType:            idp.IDPTypeExternal,
				DisplayName:        provider.DisplayName,
				ImageSvg:           provider.ImageSvg,
				LoginStartEndpoint: loginStartEndpoint,
				Protocol:           idp.AuthProtocolSAML,
				SAMLConfiguration: &idp.SAMLConfiguration{
					Certificate:    samlConfig.Certificate,
					PrivateKey:     samlConfig.PrivateKey,
					IDPMetadataURL: samlConfig.MetadataUrl,
					RootURL:        g.config.Security.ApihubExternalUrl,
				},
			}
			authConfig.Providers = append(authConfig.Providers, externalIDP)
		case idp.AuthProtocolOIDC:
			oidcConfig := provider.OidcConfiguration
			externalIDP := idp.IDP{
				Id:                 provider.Id,
				IdpType:            idp.IDPTypeExternal,
				DisplayName:        provider.DisplayName,
				ImageSvg:           provider.ImageSvg,
				LoginStartEndpoint: "/api/v1/login/sso/" + provider.Id,
				Protocol:           idp.AuthProtocolOIDC,
				OIDCConfiguration: &idp.OIDCConfiguration{
					ClientID:     oidcConfig.ClientId,
					ClientSecret: oidcConfig.ClientSecret,
					RootURL:      g.config.Security.ApihubExternalUrl,
					RedirectPath: "/api/v1/oidc/" + provider.Id + "/callback",
					ProviderURL:  oidcConfig.ProviderUrl,
					Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
				},
			}
			authConfig.Providers = append(authConfig.Providers, externalIDP)
		}
	}
	if !g.IsProductionMode() {
		localIDP := idp.IDP{
			Id:                   LocalIDPId,
			IdpType:              idp.IDPTypeInternal,
			DisplayName:          "Local IDP",
			ImageSvg:             "",
			LoginStartEndpoint:   "/api/v3/auth/local",
			RefreshTokenEndpoint: "/api/v3/auth/local/refresh",
		}
		authConfig.Providers = append(authConfig.Providers, localIDP)
	}

	if len(authConfig.Providers) == 0 {
		return authConfig, fmt.Errorf("no identity providers configured, at least one provider must exist")
	}

	authConfig.AutoLogin = g.config.Security.AutoLogin

	if authConfig.AutoLogin {
		if len(authConfig.Providers) > 1 {
			return authConfig, fmt.Errorf("auto-login cannot be enabled when multiple identity providers are configured")
		}

		if len(authConfig.Providers) == 1 && authConfig.Providers[0].IdpType == idp.IDPTypeInternal {
			return authConfig, fmt.Errorf("auto-login cannot be enabled when only internal identity provider is configured")
		}
	}

	return authConfig, nil
}

func (g *systemInfoServiceImpl) GetRevisionsCleanupSchedule() string {
	return g.config.Cleanup.Revisions.Schedule
}

func (g *systemInfoServiceImpl) GetRevisionsCleanupDeleteLastRevision() bool {
	return g.config.Cleanup.Revisions.DeleteLastRevision
}

func (g *systemInfoServiceImpl) GetRevisionsCleanupDeleteReleaseRevisions() bool {
	return g.config.Cleanup.Revisions.DeleteReleaseRevisions
}

func (g *systemInfoServiceImpl) GetRevisionsTTLDays() int {
	return g.config.Cleanup.Revisions.TTLDays
}

func (g *systemInfoServiceImpl) GetInstanceId() string {
	return g.config.TechnicalParameters.InstanceId
}

func (g *systemInfoServiceImpl) GetComparisonCleanupSchedule() string {
	return g.config.Cleanup.Comparisons.Schedule
}

func (g *systemInfoServiceImpl) GetComparisonCleanupTimeout() int {
	return g.config.Cleanup.Comparisons.TimeoutMinutes
}

func (g *systemInfoServiceImpl) GetComparisonsTTLDays() int {
	return g.config.Cleanup.Comparisons.TTLDays
}

func (g *systemInfoServiceImpl) GetSoftDeletedDataCleanupSchedule() string {
	return g.config.Cleanup.SoftDeletedData.Schedule
}

func (g *systemInfoServiceImpl) GetSoftDeletedDataCleanupTimeout() int {
	return g.config.Cleanup.SoftDeletedData.TimeoutMinutes
}

func (g *systemInfoServiceImpl) GetSoftDeletedDataTTLDays() int {
	return g.config.Cleanup.SoftDeletedData.TTLDays
}
