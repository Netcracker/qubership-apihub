package security

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	"github.com/shaj13/libcache"
	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"
)

const LocalRefreshPath = "/api/v3/auth/local/refresh"
const gitIntegrationExt = "gitIntegration"

type UserView struct {
	AccessToken string    `json:"token"`
	RenewToken  string    `json:"renewToken"`
	User        view.User `json:"user"`
}

type Authenticator struct {
	responder            responder.Responder
	userService          service.UserService
	roleService          service.RoleService
	accessTokenDuration  time.Duration
	refreshTokenDuration time.Duration
	productionMode       bool
	jwtValidator         JWTValidator
	refreshTokenStrategy auth.Strategy
	fullAuthStrategy     union.Union
	userAuthStrategy     union.Union
	jwtAuthStrategy      union.Union
	proxyAuthStrategy    union.Union
	mcpAuthStrategy      union.Union
	publicKey            []byte
	keeper               jwt.SecretsKeeper
}

func NewAuthenticator(userService service.UserService, roleService service.RoleService, apiKeyService service.ApihubApiKeyService, patService service.PersonalAccessTokenService, systemInfoService service.SystemInfoService, tokenRevocationService service.TokenRevocationService, responder responder.Responder) (Authenticator, error) {
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apiKeyService)
	personalAccessTokenStrategy := NewApihubPATStrategy(patService)
	accessTokenDuration := time.Second * time.Duration(systemInfoService.GetAccessTokenDurationSec())
	refreshTokenDuration := time.Second * time.Duration(systemInfoService.GetRefreshTokenDurationSec())
	productionMode := systemInfoService.IsProductionMode()

	block, _ := pem.Decode(systemInfoService.GetJwtPrivateKey())
	pkcs8PrivateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return Authenticator{}, fmt.Errorf("can't parse pkcs1 private key. Error - %s", err.Error())
	}
	privateKey, ok := pkcs8PrivateKey.(*rsa.PrivateKey)
	if !ok {
		return Authenticator{}, fmt.Errorf("can't parse pkcs8 private key to rsa.PrivateKey. Error - %s", err.Error())
	}
	keySize := privateKey.N.BitLen()
	if keySize < 2048 || keySize > 4096 {
		return Authenticator{}, fmt.Errorf("RSA key length must be between 2048 and 4096 bits, got %d bits", keySize)
	}
	publicKey := x509.MarshalPKCS1PublicKey(&privateKey.PublicKey)

	keeper := jwt.StaticSecret{
		ID:        "secret-id",
		Secret:    privateKey,
		Algorithm: jwt.RS256,
	}

	cache := libcache.LRU.New(2000)
	cache.RegisterOnExpired(func(key, _ interface{}) {
		cache.Delete(key)
	})
	jwtValidator := NewJWTValidator(keeper, tokenRevocationService)
	bearerTokenStrategy := NewBearerTokenStrategy(cache, jwtValidator)
	cookieTokenStrategy := NewCookieTokenStrategy(cache, jwtValidator)
	refreshTokenStrategy := NewRefreshTokenStrategy(cache, jwtValidator, accessTokenDuration, keeper)
	fullAuthStrategy := union.New(bearerTokenStrategy, cookieTokenStrategy, apihubApiKeyStrategy, personalAccessTokenStrategy)
	userAuthStrategy := union.New(bearerTokenStrategy, cookieTokenStrategy, personalAccessTokenStrategy)
	jwtAuthStrategy := union.New(bearerTokenStrategy, cookieTokenStrategy)
	customJwtStrategy := NewCustomJWTStrategy(cache, jwtValidator)
	proxyAuthStrategy := union.New(customJwtStrategy, cookieTokenStrategy)
	mcpAuthStrategy := union.New(apihubApiKeyStrategy, personalAccessTokenStrategy)
	return Authenticator{
		responder:            responder,
		userService:          userService,
		roleService:          roleService,
		accessTokenDuration:  accessTokenDuration,
		refreshTokenDuration: refreshTokenDuration,
		productionMode:       productionMode,
		jwtValidator:         jwtValidator,
		refreshTokenStrategy: refreshTokenStrategy,
		fullAuthStrategy:     fullAuthStrategy,
		userAuthStrategy:     userAuthStrategy,
		jwtAuthStrategy:      jwtAuthStrategy,
		proxyAuthStrategy:    proxyAuthStrategy,
		mcpAuthStrategy:      mcpAuthStrategy,
		publicKey:            publicKey,
		keeper:               keeper,
	}, nil
}

func (a Authenticator) respondWithAuthFailedError(w http.ResponseWriter, r *http.Request, err error) {
	if cause := a.contextErrorCause(err); cause != nil {
		// A request that gave up while authenticating is not an authentication failure, and reporting it
		// as 401 sends the user off to fix credentials that can be perfectly valid.
		a.responder.RespondWithContextError(w, r, "Authentication aborted", cause, err)
		return
	}
	log.Tracef("Authentication failed: %+v", err)
	a.responder.RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusUnauthorized,
		Message: http.StatusText(http.StatusUnauthorized),
		Debug:   fmt.Sprintf("%v", err),
	})
}

func (a Authenticator) CreateLocalUserToken_deprecated(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, err := a.authenticateUser(ctx, r)
	if err != nil {
		a.respondWithAuthFailedError(w, r, err)
		return
	}
	userView, err := a.CreateTokenForUser_deprecated(ctx, *user)
	if err != nil {
		a.respondWithAuthFailedError(w, r, err)
		return
	}

	response, _ := json.Marshal(userView)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response)
}

func (a Authenticator) CreateTokenForUser_deprecated(ctx context.Context, dbUser view.User) (*UserView, error) {
	accessToken, refreshToken, err := a.issueTokenPair(ctx, dbUser, true)
	if err != nil {
		return nil, err
	}

	userView := UserView{AccessToken: accessToken, RenewToken: refreshToken, User: dbUser}
	return &userView, nil
}

func (a Authenticator) CreateLocalUserToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, err := a.authenticateUser(ctx, r)
	if err != nil {
		a.respondWithAuthFailedError(w, r, err)
		return
	}

	if err = a.SetAuthTokenCookies(ctx, w, user, LocalRefreshPath); err != nil {
		a.respondWithAuthFailedError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (a Authenticator) authenticateUser(ctx context.Context, r *http.Request) (*view.User, error) {
	email, password, ok := r.BasicAuth()
	if !ok {
		return nil, fmt.Errorf("user credentials are not provided")
	}
	user, err := a.userService.AuthenticateUser(ctx, email, password)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (a Authenticator) SetAuthTokenCookies(ctx context.Context, w http.ResponseWriter, user *view.User, refreshTokenPath string) error {
	accessToken, refreshToken, err := a.issueTokenPair(ctx, *user, false)
	if err != nil {
		return fmt.Errorf("failed to create token pair for user: %v", err.Error())
	}

	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookieName,
		Value:    accessToken,
		MaxAge:   int(a.accessTokenDuration.Seconds()),
		Secure:   a.productionMode,
		HttpOnly: true,
		Path:     "/",
	})
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    refreshToken,
		MaxAge:   int(a.refreshTokenDuration.Seconds()),
		Secure:   a.productionMode,
		HttpOnly: true,
		Path:     refreshTokenPath,
	})
	return nil
}

func (a Authenticator) issueTokenPair(ctx context.Context, dbUser view.User, withGitIntegration bool) (accessToken string, refreshToken string, err error) {
	user := auth.NewUserInfo(dbUser.Name, dbUser.Id, []string{}, auth.Extensions{})
	accessDuration := jwt.SetExpDuration(a.accessTokenDuration) // should be more than one minute!

	extensions := user.GetExtensions()
	systemRole, err := a.roleService.GetUserSystemRole(ctx, user.GetID())
	if err != nil {
		return "", "", fmt.Errorf("failed to check user system role: %v", err.Error())
	}
	if systemRole != "" {
		extensions.Set(secctx.SystemRoleExt, systemRole)
	}
	if withGitIntegration {
		extensions.Set(gitIntegrationExt, "false") //TODO: can we remove it ?
	}
	user.SetExtensions(extensions)

	extensions.Set(TokenTypeExt, AccessTokenType)
	accessToken, err = jwt.IssueAccessToken(user, a.keeper, accessDuration)
	if err != nil {
		return "", "", err
	}

	extensions.Set(TokenTypeExt, RefreshTokenType)
	refreshDuration := jwt.SetExpDuration(a.refreshTokenDuration)
	refreshToken, err = jwt.IssueAccessToken(user, a.keeper, refreshDuration)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func (a Authenticator) GetPublicKey() []byte {
	return a.publicKey
}
