package security_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/internal/testsupport"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/security"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

type probe struct {
	UserId    string `json:"userId"`
	Anonymous bool   `json:"anonymous"`
	Sysadm    bool   `json:"sysadm"`
}

func newAuthenticator(t *testing.T, fake *testsupport.FakeApihub) security.Authenticator {
	t.Helper()
	apihubClient := client.NewApihubClient(fake.URL(), 5*time.Second)
	publicKeyProvider := security.NewPublicKeyProvider(apihubClient)
	anonymousAccess := security.NewAnonymousAccessProvider(apihubClient, time.Millisecond)
	return security.NewAuthenticator(apihubClient, publicKeyProvider, anonymousAccess, responder.NewResponder(true))
}

func echo(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	_ = json.NewEncoder(w).Encode(probe{UserId: secctx.GetUserId(ctx), Anonymous: secctx.IsAnonymous(ctx), Sysadm: secctx.IsSysadm(ctx)})
}

func call(h http.HandlerFunc, mutate func(r *http.Request)) (*httptest.ResponseRecorder, probe) {
	r := httptest.NewRequest(http.MethodGet, "/api/v1/articles", nil)
	if mutate != nil {
		mutate(r)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var p probe
	_ = json.Unmarshal(w.Body.Bytes(), &p)
	return w, p
}

func bearer(tok string) func(r *http.Request) {
	return func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+tok) }
}

func cookie(tok string) func(r *http.Request) {
	return func(r *http.Request) { r.AddCookie(&http.Cookie{Name: view.AccessTokenCookieName, Value: tok}) }
}

func apiKey(key string) func(r *http.Request) {
	return func(r *http.Request) { r.Header.Set(view.ApiKeyHeader, key) }
}

func TestJwtValidBearerAndCookie(t *testing.T) {
	fake := testsupport.NewFakeApihub(t)
	h := newAuthenticator(t, fake).Secure(echo)

	w, p := call(h, bearer(fake.Token(t, "alice", "", time.Hour)))
	if w.Code != 200 || p.UserId != "alice" || p.Anonymous || p.Sysadm {
		t.Fatalf("bearer: code=%d probe=%+v", w.Code, p)
	}
	w, p = call(h, cookie(fake.Token(t, "bob", view.SysadmRole, time.Hour)))
	if w.Code != 200 || p.UserId != "bob" || !p.Sysadm {
		t.Fatalf("cookie sysadmin: code=%d probe=%+v", w.Code, p)
	}
}

func TestJwtExpiredWrongKeyAndWrongAlg(t *testing.T) {
	fake := testsupport.NewFakeApihub(t)
	h := newAuthenticator(t, fake).Secure(echo)

	if w, _ := call(h, bearer(fake.Token(t, "alice", "", -time.Minute))); w.Code != 401 {
		t.Fatalf("expired token: want 401, got %d %s", w.Code, w.Body.String())
	}
	other := testsupport.NewFakeApihub(t) // different key pair
	if w, _ := call(h, bearer(other.Token(t, "alice", "", time.Hour))); w.Code != 401 {
		t.Fatalf("wrong key: want 401, got %d", w.Code)
	}
	if w, _ := call(h, bearer(fake.HS256Token(t, "alice"))); w.Code != 401 {
		t.Fatalf("HS256: want 401, got %d", w.Code)
	}
	w, _ := call(h, bearer("not-a-jwt"))
	if w.Code != 401 {
		t.Fatalf("garbage: want 401, got %d", w.Code)
	}
	var body map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["code"] != "DOCS-1001" || body["status"].(float64) != 401 {
		t.Fatalf("error envelope: %v", body)
	}
}

func TestJwtKeyRotationIsPickedUp(t *testing.T) {
	fake := testsupport.NewFakeApihub(t)
	h := newAuthenticator(t, fake).Secure(echo)
	if w, _ := call(h, bearer(fake.Token(t, "alice", "", time.Hour))); w.Code != 200 {
		t.Fatalf("first token: %d", w.Code)
	}
	fake.RotateKey(t)
	if w, _ := call(h, bearer(fake.Token(t, "alice", "", time.Hour))); w.Code != 200 {
		t.Fatalf("token after rotation: want 200, got %d %s", w.Code, w.Body.String())
	}
}

func TestAnonymousGating(t *testing.T) {
	fake := testsupport.NewFakeApihub(t)
	fake.AnonymousAccess = true
	authenticator := newAuthenticator(t, fake)
	h := authenticator.SecureOrAnonymous(echo)

	w, p := call(h, nil)
	if w.Code != 200 || !p.Anonymous || p.UserId != "" {
		t.Fatalf("flag on, no creds: code=%d probe=%+v", w.Code, p)
	}
	// Invalid credentials are never downgraded to anonymous.
	if w, _ := call(h, bearer("garbage")); w.Code != 401 {
		t.Fatalf("flag on, invalid token: want 401, got %d", w.Code)
	}
	if w, _ := call(h, bearer(fake.Token(t, "x", "", -time.Hour))); w.Code != 401 {
		t.Fatalf("flag on, expired token: want 401, got %d", w.Code)
	}
	if w, p := call(h, bearer(fake.Token(t, "alice", "", time.Hour))); w.Code != 200 || p.Anonymous || p.UserId != "alice" {
		t.Fatalf("flag on, valid token: code=%d probe=%+v", w.Code, p)
	}

	fake.AnonymousAccess = false
	time.Sleep(2 * time.Millisecond) // provider TTL is 1ms in tests
	if w, _ := call(h, nil); w.Code != 401 {
		t.Fatalf("flag off, no creds: want 401, got %d", w.Code)
	}
	if w, _ := call(h, bearer(fake.Token(t, "alice", "", time.Hour))); w.Code != 200 {
		t.Fatalf("flag off, valid token: want 200, got %d", w.Code)
	}
	// Secure never admits anonymous regardless of the flag.
	fake.AnonymousAccess = true
	time.Sleep(2 * time.Millisecond)
	if w, _ := call(authenticator.Secure(echo), nil); w.Code != 401 {
		t.Fatalf("Secure without creds: want 401, got %d", w.Code)
	}
}

func TestApiKeyStrategy(t *testing.T) {
	fake := testsupport.NewFakeApihub(t)
	fake.ApiKeys["admin-key"] = []string{view.SysadmRole}
	fake.ApiKeys["pkg-key"] = []string{"Editor"}
	h := newAuthenticator(t, fake).Secure(echo)

	w, p := call(h, apiKey("admin-key"))
	if w.Code != 200 || !p.Sysadm || p.UserId != "apikey:key-admin-key" {
		t.Fatalf("admin api-key: code=%d probe=%+v", w.Code, p)
	}
	if w, _ := call(h, apiKey("pkg-key")); w.Code != 401 {
		t.Fatalf("package api-key must be rejected with 401, got %d", w.Code)
	}
	if w, _ := call(h, apiKey("unknown")); w.Code != 401 {
		t.Fatalf("unknown api-key: want 401, got %d", w.Code)
	}
	if req := fake.LastRequestTo("/api/v2/auth/apiKey"); req == nil || req.Header.Get("api-key") != "unknown" {
		t.Fatalf("api-key header not forwarded to APIHUB")
	}
}

func TestParsePublicKeyFormats(t *testing.T) {
	fake := testsupport.NewFakeApihub(t)
	apihubClient := client.NewApihubClient(fake.URL(), time.Second)
	raw, err := apihubClient.GetPublicKey(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	key, err := security.ParsePublicKey(raw)
	if err != nil || key.N.Cmp(fake.Key.PublicKey.N) != 0 {
		t.Fatalf("PKCS1 DER: %v", err)
	}
	if _, err := security.ParsePublicKey([]byte("junk")); err == nil {
		t.Fatal("junk must fail")
	}
}
