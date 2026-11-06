package view

import "encoding/json"

// DTOs for the parts of APIHUB responses this service relies on.

const SysadmRole = "System administrator"

// ManagePackagePermission is the APIHUB package permission required to edit package settings
// (PATCH /api/v2/packages/{packageId}); it also grants administration of the package's guides here.
const ManagePackagePermission = "create_and_update_package"

// ApihubPackage is the part of GET /api/v2/packages/{packageId} used here: the caller's permissions on the package.
type ApihubPackage struct {
	PackageId   string   `json:"packageId"`
	Permissions []string `json:"permissions"`
}

const AccessTokenCookieName = "apihub-access-token"
const ApiKeyHeader = "api-key"

type ApihubApiKey struct {
	Id        string   `json:"id"`
	PackageId string   `json:"packageId"`
	Name      string   `json:"name"`
	Revoked   bool     `json:"revoked"`
	Roles     []string `json:"roles"`
}

type ApihubSystemConfiguration struct {
	Extensions      []ApihubExtension   `json:"extensions"`
	AnonymousAccess AnonymousAccessFlag `json:"anonymousAccess"`
}

// AnonymousAccessFlag accepts both `"anonymousAccess": true` and `"anonymousAccess": {"enabled": true}`.
type AnonymousAccessFlag bool

func (f *AnonymousAccessFlag) UnmarshalJSON(data []byte) error {
	var b bool
	if err := json.Unmarshal(data, &b); err == nil {
		*f = AnonymousAccessFlag(b)
		return nil
	}
	var obj struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.Unmarshal(data, &obj); err != nil {
		return err
	}
	*f = AnonymousAccessFlag(obj.Enabled)
	return nil
}

type ApihubExtension struct {
	Name       string `json:"name"`
	BaseUrl    string `json:"baseUrl"`
	PathPrefix string `json:"pathPrefix"`
}

type ApihubVersion struct {
	PackageId string `json:"packageId"`
	Version   string `json:"version"`
	Status    string `json:"status"`
}

type ApihubVersionListItem struct {
	Version   string `json:"version"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

type ApihubVersions struct {
	Versions []ApihubVersionListItem `json:"versions"`
}

type ApihubDocument struct {
	Slug     string `json:"slug"`
	Title    string `json:"title"`
	Type     string `json:"type"`
	Format   string `json:"format,omitempty"`
	Filename string `json:"filename,omitempty"`
}

type ApihubDocuments struct {
	Documents []ApihubDocument `json:"documents"`
}

const ApihubMarkdownType = "markdown"
