package client

import (
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// Credential is applied to outgoing APIHUB requests so that APIHUB authorizes the original caller itself.
// A nil Credential means anonymous.
type Credential interface {
	Apply(r *http.Request)
	// Key is a stable, non-reversible identifier used for per-principal caching.
	Key() string
}

// BearerCredential forwards an APIHUB access token in the Authorization header.
type BearerCredential string

func (b BearerCredential) Apply(r *http.Request) { r.Header.Set("Authorization", "Bearer "+string(b)) }
func (b BearerCredential) Key() string           { return "jwt:" + utils.Sha256Hex([]byte(b))[:16] }

// ApiKeyCredential forwards an APIHUB api-key header.
type ApiKeyCredential string

func (k ApiKeyCredential) Apply(r *http.Request) { r.Header.Set(view.ApiKeyHeader, string(k)) }
func (k ApiKeyCredential) Key() string           { return "apikey:" + utils.Sha256Hex([]byte(k))[:16] }

// CredentialFromRequest extracts the caller's credential for forwarding, or nil when there is none.
// Precedence matches APIHUB's own strategy order: bearer, cookie, api-key.
func CredentialFromRequest(r *http.Request) Credential {
	if h := r.Header.Get("Authorization"); strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return BearerCredential(strings.TrimSpace(h[7:]))
	}
	if c, err := r.Cookie(view.AccessTokenCookieName); err == nil && c.Value != "" {
		return BearerCredential(c.Value)
	}
	if k := r.Header.Get(view.ApiKeyHeader); k != "" {
		return ApiKeyCredential(k)
	}
	return nil
}
