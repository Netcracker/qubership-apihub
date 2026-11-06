package secctx

import (
	"context"
	"net/http"
	"sync"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/shaj13/go-guardian/v2/auth"
)

const (
	SystemRoleExt = "systemRole"
	AnonymousExt  = "anonymous"
	ApiKeyIdExt   = "apikeyId"

	AnonymousPrincipalName = "anonymous"
)

type secCtxKey struct{}

type securityContextImpl struct {
	userId      string
	isAnonymous bool
	isSysadm    bool
	credential  client.Credential
	// packageAdmin caches package permission checks for the lifetime of one request context.
	packageAdmin *packageAdminCache
}

type packageAdminCache struct {
	mu sync.Mutex
	m  map[string]bool
}

func newPackageAdminCache() *packageAdminCache { return &packageAdminCache{m: map[string]bool{}} }

// MakeUserContext builds the request context from the go-guardian user set by the security middleware.
func MakeUserContext(r *http.Request) context.Context {
	user := auth.User(r)
	if user == nil {
		return context.WithValue(r.Context(), secCtxKey{}, securityContextImpl{isAnonymous: true})
	}
	ext := user.GetExtensions()
	sc := securityContextImpl{userId: user.GetID(), isAnonymous: ext.Has(AnonymousExt), packageAdmin: newPackageAdminCache()}
	if !sc.isAnonymous {
		sc.credential = client.CredentialFromRequest(r)
	}
	for _, role := range ext.Values(SystemRoleExt) {
		if role == view.SysadmRole {
			sc.isSysadm = true
		}
	}
	return context.WithValue(r.Context(), secCtxKey{}, sc)
}

// MakeSystemContext is used by the CLI import: a sysadmin without credentials.
func MakeSystemContext(ctx context.Context, userId string) context.Context {
	return context.WithValue(ctx, secCtxKey{}, securityContextImpl{userId: userId, isSysadm: true, packageAdmin: newPackageAdminCache()})
}

func get(ctx context.Context) securityContextImpl {
	if v, ok := ctx.Value(secCtxKey{}).(securityContextImpl); ok {
		return v
	}
	return securityContextImpl{isAnonymous: true}
}

func IsAnonymous(ctx context.Context) bool { return get(ctx).isAnonymous }
func IsSysadm(ctx context.Context) bool    { return get(ctx).isSysadm }
func GetUserId(ctx context.Context) string { return get(ctx).userId }

// GetCredential returns what to forward to APIHUB on behalf of the caller; nil for anonymous.
func GetCredential(ctx context.Context) client.Credential { return get(ctx).credential }

// PrincipalKey identifies the caller for short-lived caches: "anon" or a hash of the credential.
func PrincipalKey(ctx context.Context) string {
	c := get(ctx).credential
	if c == nil {
		return "anon"
	}
	return c.Key()
}

// CachedPackageAdmin returns the result of an earlier package permission check made within the same request.
func CachedPackageAdmin(ctx context.Context, packageId string) (allowed bool, known bool) {
	c := get(ctx).packageAdmin
	if c == nil {
		return false, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	allowed, known = c.m[packageId]
	return allowed, known
}

// SetPackageAdmin records the result of a package permission check for the rest of the request.
func SetPackageAdmin(ctx context.Context, packageId string, allowed bool) {
	c := get(ctx).packageAdmin
	if c == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[packageId] = allowed
}

// IsPackageAdmin reports whether the caller is a sysadmin or has already passed the package permission check
// for packageId in this request.
func IsPackageAdmin(ctx context.Context, packageId string) bool {
	if IsSysadm(ctx) {
		return true
	}
	if packageId == "" {
		return false
	}
	allowed, _ := CachedPackageAdmin(ctx, packageId)
	return allowed
}
