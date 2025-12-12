package config

import (
	"encoding/base64"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp"
)

type Config struct {
	Database             DatabaseConfig
	Security             SecurityConfig
	ZeroDayConfiguration ZeroDayConfig
	TechnicalParameters  TechnicalParameters
	BusinessParameters   BusinessParameters
	Monitoring           MonitoringConfig
	S3Storage            S3Config
	Olric                OlricConfig
	Cleanup              CleanupConfig
	Extensions           []view.Extension
	Ai                   AIConfig
}

type DatabaseConfig struct {
	Host     string `validate:"required"`
	Port     int    `validate:"required"`
	Name     string `validate:"required"`
	Username string `validate:"required"`
	Password string `validate:"required" sensitive:"true"`
}

type SecurityConfig struct {
	ProductionMode            bool
	Jwt                       JwtConfig
	ApihubExternalUrl         string `validate:"required"`
	AllowedHostsForProxy      []string
	AllowedOrigins            []string
	AutoLogin                 bool
	LegacySaml                bool
	ExternalIdentityProviders []ExternalIdentityProviderConfig `validate:"dive"`
	Ldap                      LdapConfig
}

type JwtConfig struct {
	PrivateKey              Base64DecodedString `validate:"required,min=1" sensitive:"true"`
	AccessTokenDurationSec  int                 `validate:"gt=600"`
	RefreshTokenDurationSec int                 `validate:"gtfield=AccessTokenDurationSec"`
}

type ExternalIdentityProviderConfig struct {
	Id                string `validate:"required"`
	DisplayName       string
	ImageSvg          string
	Protocol          idp.AuthProtocol `validate:"required,oneof=SAML OIDC"`
	SamlConfiguration *SamlConfig      `validate:"required_if=Protocol SAML"`
	OidcConfiguration *OidcConfig      `validate:"required_if=Protocol OIDC"`
}

type SamlConfig struct {
	MetadataUrl string `validate:"required"`
	Certificate string `validate:"required" sensitive:"true"`
	PrivateKey  string `validate:"required" sensitive:"true"`
}

type OidcConfig struct {
	ProviderUrl  string `validate:"required"`
	ClientId     string `validate:"required"`
	ClientSecret string `validate:"required" sensitive:"true"`
}

type LdapConfig struct {
	Server           string
	User             string
	Password         string `sensitive:"true"`
	BaseDN           string
	OrganizationUnit string
	SearchBase       string
}

type ZeroDayConfig struct {
	AccessToken   string `validate:"required,min=30" sensitive:"true"`
	AdminEmail    string `validate:"required"`
	AdminPassword string `validate:"required" sensitive:"true"`
}

type TechnicalParameters struct {
	InstanceId            string
	BasePath              string
	BackendVersion        string
	ListenAddress         string `validate:"required"`
	MetricsGetterSchedule string
	ApiSpecDirectory      string
}

type BusinessParameters struct {
	ExternalLinks             []string
	DefaultWorkspaceId        string
	ReleaseVersionPattern     string
	PublishArchiveSizeLimitMb int    `validate:"gt=0,lte=8796093022207"` //validation was added based on security scan results to avoid integer overflow, 8796093022207 * 1048576 is safely below MaxInt64
	PublishFileSizeLimitMb    int    `validate:"gt=0,lte=8796093022207"` //validation was added based on security scan results to avoid integer overflow, 8796093022207 * 1048576 is safely below MaxInt64
	SystemNotification        string //TODO: replace with db impl
	FailBuildOnBrokenRefs     bool
}

type MonitoringConfig struct {
	Enabled bool
}

type S3Config struct {
	Enabled              bool
	Url                  string
	Username             string
	Password             string `sensitive:"true"`
	Crt                  string
	BucketName           string
	StoreOnlyBuildResult bool
}

type OlricConfig struct {
	DiscoveryMode string
	ReplicaCount  int
	Namespace     string
}

type CleanupConfig struct {
	Revisions        RevisionsCleanupConfig
	Comparisons      ComparisonsCleanupConfig
	SoftDeletedData  SoftDeletedDataCleanupConfig
	UnreferencedData UnreferencedDataCleanupConfig
	Builds           BuildsCleanupConfig
}

type AIConfig struct {
	MCP  MCPConfig
	Chat ChatConfig
}

type MCPConfig struct {
	Workspace string
}
type ChatConfig struct {
	OpenAI OpenAIConfig
}

type OpenAIConfig struct {
	ApiKey          string `sensitive:"true"`
	Model           string
	ProxyURL        string  // Optional base URL for OpenAI API requests (replaces https://api.openai.com/v1); Example: "https://llmproxy.localdomain.com" or "https://llmproxy.localdomain.com/v1"
	Temperature     float64 // Controls randomness of the model's output. Range: 0.0 to 2.0. Lower values = more focused, higher values = more random. Default: 1.0
	ReasoningEffort string  // Controls depth of reasoning for reasoning models (gpt-5, o-series). Values: "minimal", "low", "medium", "high". Default: "medium"
	Verbosity       string  // Controls verbosity and detail level of the model's response. Values: "low", "medium", "high". Default: "medium"
}

type RevisionsCleanupConfig struct {
	Schedule               string
	DeleteLastRevision     bool
	DeleteReleaseRevisions bool
	TTLDays                int
}

type ComparisonsCleanupConfig struct {
	Schedule       string
	TimeoutMinutes int
	TTLDays        int
}

type SoftDeletedDataCleanupConfig struct {
	Schedule       string
	TimeoutMinutes int
	TTLDays        int
}

type UnreferencedDataCleanupConfig struct {
	Schedule       string
	TimeoutMinutes int
}

type BuildsCleanupConfig struct {
	Schedule string
}

type Base64DecodedString []byte

func (d *Base64DecodedString) UnmarshalText(text []byte) error {
	decoded, err := base64.StdEncoding.DecodeString(string(text))
	if err != nil {
		return fmt.Errorf("can't decode base64 string. Error - %w", err)
	}
	*d = decoded
	return nil
}
