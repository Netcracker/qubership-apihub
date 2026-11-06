package testsupport

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/shaj13/go-guardian/v2/auth"
	"gopkg.in/square/go-jose.v2"
	"gopkg.in/square/go-jose.v2/jwt"
)

// FakeApihub is an httptest server imitating the APIHUB endpoints this service calls.
type FakeApihub struct {
	Server *httptest.Server
	Key    *rsa.PrivateKey

	mu              sync.Mutex
	AnonymousAccess bool
	// Packages: packageId -> version -> documentSlug -> markdown body.
	Packages map[string]map[string]map[string]string
	// PrivatePackages are readable only with a credential.
	PrivatePackages map[string]bool
	// ApiKeys: key -> roles.
	ApiKeys map[string][]string
	// Requests records every incoming request for assertions.
	Requests []*http.Request
	// RawCalls counts GET .../files/{slug}/raw calls.
	RawCalls int
	// Permissions: userId (token subject) -> packageId -> permissions returned by GET /api/v2/packages/{id}.
	Permissions map[string]map[string][]string
	// PackageCalls counts GET /api/v2/packages/{id} calls.
	PackageCalls int
}

func NewFakeApihub(t *testing.T) *FakeApihub {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	f := &FakeApihub{Key: key, Packages: map[string]map[string]map[string]string{}, PrivatePackages: map[string]bool{}, ApiKeys: map[string][]string{}, Permissions: map[string]map[string][]string{}}
	f.Server = httptest.NewServer(http.HandlerFunc(f.handle))
	t.Cleanup(f.Server.Close)
	return f
}

func (f *FakeApihub) URL() string { return f.Server.URL }

// RotateKey replaces the signing key (simulates an APIHUB restart with a new key).
func (f *FakeApihub) RotateKey(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	f.mu.Lock()
	f.Key = key
	f.mu.Unlock()
}

// Token issues a token the way APIHUB/go-guardian does: standard claims + the DefaultUser struct.
func (f *FakeApihub) Token(t *testing.T, userId, systemRole string, ttl time.Duration) string {
	return f.TokenWithKey(t, f.Key, userId, systemRole, ttl)
}

func (f *FakeApihub) TokenWithKey(t *testing.T, key *rsa.PrivateKey, userId, systemRole string, ttl time.Duration) string {
	t.Helper()
	ext := auth.Extensions{}
	if systemRole != "" {
		ext.Set("systemRole", systemRole)
	}
	user := auth.DefaultUser{Name: userId, ID: userId, Groups: []string{}, Extensions: ext}
	now := time.Now().UTC()
	claims := jwt.Claims{Subject: userId, Audience: jwt.Audience{""}, IssuedAt: jwt.NewNumericDate(now), NotBefore: jwt.NewNumericDate(now), Expiry: jwt.NewNumericDate(now.Add(ttl))}
	opt := (&jose.SignerOptions{}).WithType("JWT").WithHeader("kid", "secret-id")
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: key}, opt)
	if err != nil {
		t.Fatal(err)
	}
	tok, err := jwt.Signed(signer).Claims(claims).Claims(user).CompactSerialize()
	if err != nil {
		t.Fatal(err)
	}
	return tok
}

// HS256Token builds a token with a symmetric alg to prove the alg check works.
func (f *FakeApihub) HS256Token(t *testing.T, userId string) string {
	t.Helper()
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.HS256, Key: []byte("0123456789abcdef0123456789abcdef")}, nil)
	if err != nil {
		t.Fatal(err)
	}
	claims := jwt.Claims{Subject: userId, Expiry: jwt.NewNumericDate(time.Now().Add(time.Hour))}
	tok, err := jwt.Signed(signer).Claims(claims).CompactSerialize()
	if err != nil {
		t.Fatal(err)
	}
	return tok
}

func (f *FakeApihub) hasCredential(r *http.Request) bool {
	if r.Header.Get("Authorization") != "" || r.Header.Get("api-key") != "" {
		return true
	}
	if c, err := r.Cookie("apihub-access-token"); err == nil && c.Value != "" {
		return true
	}
	return false
}

func writeJson(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (f *FakeApihub) handle(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	f.Requests = append(f.Requests, r)
	f.mu.Unlock()
	p := r.URL.Path
	switch {
	case p == "/api/v2/auth/publicKey":
		f.mu.Lock()
		der := x509.MarshalPKCS1PublicKey(&f.Key.PublicKey)
		f.mu.Unlock()
		w.Header().Set("Content-Type", "application/octet-stream")
		_, _ = w.Write(der)
	case p == "/api/v2/system/configuration":
		f.mu.Lock()
		enabled := f.AnonymousAccess
		f.mu.Unlock()
		writeJson(w, 200, map[string]interface{}{"extensions": []interface{}{}, "anonymousAccess": map[string]bool{"enabled": enabled}})
	case p == "/api/v2/auth/apiKey":
		key := r.Header.Get("api-key")
		f.mu.Lock()
		roles, ok := f.ApiKeys[key]
		f.mu.Unlock()
		if !ok {
			writeJson(w, 404, map[string]interface{}{"status": 404, "code": "7", "message": "api key not found"})
			return
		}
		writeJson(w, 200, map[string]interface{}{"id": "key-" + key, "packageId": "*", "name": "ci", "revoked": false, "roles": roles})
	case strings.HasPrefix(p, "/api/v3/packages/") || strings.HasPrefix(p, "/api/v2/packages/"):
		f.handlePackages(w, r)
	default:
		writeJson(w, 404, map[string]interface{}{"status": 404, "message": "unknown endpoint " + p})
	}
}

func (f *FakeApihub) handlePackages(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/") // api v3 packages {id} versions {v} ...
	if len(parts) < 4 {
		writeJson(w, 404, nil)
		return
	}
	packageId := parts[3]
	f.mu.Lock()
	defer f.mu.Unlock()
	versions, exists := f.Packages[packageId]
	if !exists {
		writeJson(w, 404, map[string]interface{}{"status": 404, "message": "package not found"})
		return
	}
	if f.PrivatePackages[packageId] && !f.hasCredential(r) {
		writeJson(w, 401, map[string]interface{}{"status": 401, "message": "Unauthorized"})
		return
	}
	if len(parts) == 4 && parts[1] == "v2" {
		f.PackageCalls++
		perms := f.Permissions[subjectOf(r)][packageId]
		if perms == nil {
			perms = []string{"read"}
		}
		writeJson(w, 200, map[string]interface{}{"packageId": packageId, "permissions": perms})
		return
	}
	if len(parts) == 5 && parts[4] == "versions" {
		list := make([]map[string]interface{}, 0)
		for v := range versions {
			list = append(list, map[string]interface{}{"version": v, "status": "release", "createdAt": "2024-01-01T00:00:00Z"})
		}
		writeJson(w, 200, map[string]interface{}{"versions": list})
		return
	}
	if len(parts) < 6 {
		writeJson(w, 404, nil)
		return
	}
	version := parts[5]
	docs, ok := versions[version]
	if !ok {
		writeJson(w, 404, map[string]interface{}{"status": 404, "message": "version not found"})
		return
	}
	switch {
	case len(parts) == 6:
		writeJson(w, 200, map[string]interface{}{"packageId": packageId, "version": version, "status": "release"})
	case len(parts) == 7 && parts[6] == "documents":
		list := make([]map[string]interface{}, 0)
		for slug := range docs {
			list = append(list, map[string]interface{}{"slug": slug, "title": strings.ToUpper(slug), "type": "markdown", "filename": slug + ".md"})
		}
		list = append(list, map[string]interface{}{"slug": "openapi", "title": "OpenAPI", "type": "openapi-3-0", "filename": "openapi.yaml"})
		writeJson(w, 200, map[string]interface{}{"documents": list, "packages": map[string]interface{}{}})
	case len(parts) == 8 && parts[6] == "documents":
		if _, ok := docs[parts[7]]; !ok {
			writeJson(w, 404, map[string]interface{}{"status": 404, "message": "document not found"})
			return
		}
		writeJson(w, 200, map[string]interface{}{"slug": parts[7], "title": strings.ToUpper(parts[7]), "type": "markdown"})
	case len(parts) == 9 && parts[6] == "files" && parts[8] == "raw":
		body, ok := docs[parts[7]]
		if !ok {
			writeJson(w, 404, map[string]interface{}{"status": 404, "message": "file not found"})
			return
		}
		f.RawCalls++
		w.Header().Set("Content-Type", "text/markdown")
		_, _ = w.Write([]byte(body))
	default:
		writeJson(w, 404, nil)
	}
}

// LastRequestTo returns the most recent request whose path contains needle.
func (f *FakeApihub) LastRequestTo(needle string) *http.Request {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := len(f.Requests) - 1; i >= 0; i-- {
		if strings.Contains(f.Requests[i].URL.Path, needle) {
			return f.Requests[i]
		}
	}
	return nil
}

// subjectOf extracts the (unverified) token subject of the request; the fake trusts it for permission lookups.
func subjectOf(r *http.Request) string {
	tok := ""
	if h := r.Header.Get("Authorization"); strings.HasPrefix(strings.ToLower(h), "bearer ") {
		tok = strings.TrimSpace(h[7:])
	} else if c, err := r.Cookie("apihub-access-token"); err == nil {
		tok = c.Value
	}
	if tok == "" {
		return ""
	}
	parsed, err := jwt.ParseSigned(tok)
	if err != nil {
		return ""
	}
	var claims jwt.Claims
	if err := parsed.UnsafeClaimsWithoutVerification(&claims); err != nil {
		return ""
	}
	return claims.Subject
}
