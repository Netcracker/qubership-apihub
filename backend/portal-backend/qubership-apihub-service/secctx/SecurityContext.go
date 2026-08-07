package secctx

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/shaj13/go-guardian/v2/auth"
)

const (
	contextName = "secCtx"

	SystemRoleExt      = "systemRole"
	ApikeyRoleExt      = "apikeyRole"
	ApikeyPackageIdExt = "apikeyPackageId"
	TokenExpiresAtExt  = "expiresAt"
)

func MakeUserContext(r *http.Request) context.Context {
	return MakeUserContextFrom(r.Context(), r)
}

func MakeUserContextFrom(ctx context.Context, r *http.Request) context.Context {
	user := auth.UserFromCtx(ctx)
	userId := user.GetID()

	systemRole := user.GetExtensions().Get(SystemRoleExt)
	apiKeyRoles := user.GetExtensions().Values(ApikeyRoleExt)
	apiKeyPackageId := user.GetExtensions().Get(ApikeyPackageIdExt)
	tokenExpirationTimestamp, _ := strconv.ParseInt(user.GetExtensions().Get(TokenExpiresAtExt), 0, 64)

	token := getAccessToken(r)
	apiKey := getApihubApiKey(r)
	pat := getPersonalAccessToken(r)

	return context.WithValue(ctx, contextName, securityContextImpl{
		userId:                   userId,
		token:                    token,
		tokenExpirationTimestamp: tokenExpirationTimestamp,
		personalAccessToken:      pat,
		apiKey:                   apiKey,
		apiKeyPackageId:          apiKeyPackageId,
		apiKeyRoles:              apiKeyRoles,
		systemRole:               systemRole,
		isSystem:                 false,
	})
}

func MakeSystemContext(ctx context.Context) context.Context {
	return context.WithValue(ctx, contextName, securityContextImpl{userId: "system", isSystem: true})
}

// Detach returns a context that keeps the security data and other values of ctx but drops its
// deadline and cancellation. Use it for background work started from a request (via SafeAsync)
// that must outlive the response: the request-timeout middleware cancels the request context once
// the handler returns, which would otherwise abort the detached work.
func Detach(ctx context.Context) context.Context {
	return context.WithoutCancel(ctx)
}

func CreateFromId(ctx context.Context, userId string) context.Context {
	return context.WithValue(ctx, contextName, securityContextImpl{userId: userId})
}

type securityContextImpl struct {
	userId                   string
	token                    string
	tokenExpirationTimestamp int64
	personalAccessToken      string
	apiKey                   string
	apiKeyPackageId          string
	apiKeyRoles              []string
	systemRole               string
	isSystem                 bool
}

func getAccessToken(r *http.Request) string {
	if token := getTokenFromAuthHeader(r); token != "" {
		return token
	}
	return getTokenFromCookie(r)
}

func getTokenFromAuthHeader(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return ""
	}
	return strings.TrimSpace(authHeader[7:])
}

func getTokenFromCookie(r *http.Request) string {
	accessTokenCookie, err := r.Cookie("apihub-access-token")
	if err != nil {
		return ""
	}

	return accessTokenCookie.Value
}

func getApihubApiKey(r *http.Request) string {
	return r.Header.Get("api-key")
}

func getPersonalAccessToken(r *http.Request) string {
	return r.Header.Get("X-Personal-Access-Token")
}

func GetUserId(ctx context.Context) string {
	val := ctx.Value("secCtx")
	if val == nil {
		return ""
	}
	return val.(securityContextImpl).userId
}

func GetUserToken(ctx context.Context) string {
	val := ctx.Value("secCtx")
	if val == nil {
		return ""
	}
	return val.(securityContextImpl).token
}

func GetTokenExpirationTimestamp(ctx context.Context) int64 {
	val := ctx.Value("secCtx")
	if val == nil {
		return 0
	}
	return val.(securityContextImpl).tokenExpirationTimestamp
}

func GetPersonalAccessToken(ctx context.Context) string {
	val := ctx.Value("secCtx")
	if val == nil {
		return ""
	}
	return val.(securityContextImpl).personalAccessToken
}

func GetApiKey(ctx context.Context) string {
	val := ctx.Value("secCtx")
	if val == nil {
		return ""
	}
	return val.(securityContextImpl).apiKey
}

func GetApiKeyPackageId(ctx context.Context) string {
	val := ctx.Value("secCtx")
	if val == nil {
		return ""
	}
	return val.(securityContextImpl).apiKeyPackageId
}

func GetApiKeyRoles(ctx context.Context) []string {
	val := ctx.Value("secCtx")
	if val == nil {
		return []string{}
	}
	roles := val.(securityContextImpl).apiKeyRoles
	if roles == nil {
		return []string{}
	}
	return roles
}

func GetUserSystemRole(ctx context.Context) string {
	val := ctx.Value("secCtx")
	if val == nil {
		return ""
	}
	return val.(securityContextImpl).systemRole
}

func IsSysadm(ctx context.Context) bool {
	val := ctx.Value("secCtx")
	if val == nil {
		return false
	}
	apikeyRoles := val.(securityContextImpl).apiKeyRoles
	if utils.SliceContains(apikeyRoles, view.SysadmRole) {
		return true
	}
	systemRole := val.(securityContextImpl).systemRole
	return systemRole == view.SysadmRole
}
