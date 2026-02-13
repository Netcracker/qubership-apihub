package security

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"

	"time"
)

const LocalRefreshPath = "/api/v3/auth/local/refresh"

var fullAuthStrategy union.Union
var userAuthStrategy union.Union
var proxyAuthStrategy union.Union
var jwtAuthStrategy union.Union
var refreshTokenStrategy auth.Strategy
var apiKeyStrategy auth.Strategy

var keeper jwt.SecretsKeeper
var userService service.UserService
var roleService service.RoleService

var accessTokenDuration time.Duration
var refreshTokenDuration time.Duration
var productionMode bool

var publicKey []byte

const gitIntegrationExt = "gitIntegration"

func SetupGoGuardian(userServiceLocal service.UserService, roleServiceLocal service.RoleService, apiKeyService service.ApihubApiKeyService, patService service.PersonalAccessTokenService, systemInfoService service.SystemInfoService, tokenRevocationService service.TokenRevocationService) error {
	userService = userServiceLocal
	roleService = roleServiceLocal
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apiKeyService)
	personalAccessTokenStrategy := NewApihubPATStrategy(patService)
	accessTokenDuration = time.Second * time.Duration(systemInfoService.GetAccessTokenDurationSec())
	refreshTokenDuration = time.Second * time.Duration(systemInfoService.GetRefreshTokenDurationSec())
	productionMode = systemInfoService.IsProductionMode()

	block, _ := pem.Decode(systemInfoService.GetJwtPrivateKey())
	pkcs8PrivateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return fmt.Errorf("can't parse pkcs1 private key. Error - %s", err.Error())
	}
	privateKey, ok := pkcs8PrivateKey.(*rsa.PrivateKey)
	if !ok {
		return fmt.Errorf("can't parse pkcs8 private key to rsa.PrivateKey. Error - %s", err.Error())
	}
	keySize := privateKey.N.BitLen()
	if keySize < 2048 || keySize > 4096 {
		return fmt.Errorf("RSA key length must be between 2048 and 4096 bits, got %d bits", keySize)
	}
	publicKey = x509.MarshalPKCS1PublicKey(&privateKey.PublicKey)

	keeper = jwt.StaticSecret{
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
	refreshTokenStrategy = NewRefreshTokenStrategy(cache, jwtValidator)
	fullAuthStrategy = union.New(bearerTokenStrategy, cookieTokenStrategy, apihubApiKeyStrategy, personalAccessTokenStrategy)
	userAuthStrategy = union.New(bearerTokenStrategy, cookieTokenStrategy, personalAccessTokenStrategy)
	jwtAuthStrategy = union.New(bearerTokenStrategy, cookieTokenStrategy)
	customJwtStrategy := NewCustomJWTStrategy(cache, jwtValidator)
	proxyAuthStrategy = union.New(customJwtStrategy, cookieTokenStrategy)
	apiKeyStrategy = apihubApiKeyStrategy
	return nil
}

type UserView struct {
	AccessToken string    `json:"token"`
	RenewToken  string    `json:"renewToken"`
	User        view.User `json:"user"`
}

func CreateLocalUserToken_deprecated(w http.ResponseWriter, r *http.Request) {
	user, err := authenticateUser(r)
	if err != nil {
		respondWithAuthFailedError(w, err)
		return
	}
	userView, err := CreateTokenForUser_deprecated(*user)
	if err != nil {
		respondWithAuthFailedError(w, err)
		return
	}

	response, _ := json.Marshal(userView)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response)
}

func CreateTokenForUser_deprecated(dbUser view.User) (*UserView, error) {
	accessToken, refreshToken, err := issueTokenPair(dbUser, true)
	if err != nil {
		return nil, err
	}

	userView := UserView{AccessToken: accessToken, RenewToken: refreshToken, User: dbUser}
	return &userView, nil
}

func CreateLocalUserToken(w http.ResponseWriter, r *http.Request) {
	user, err := authenticateUser(r)
	if err != nil {
		respondWithAuthFailedError(w, err)
		return
	}

	if err = SetAuthTokenCookies(w, user, LocalRefreshPath); err != nil {
		respondWithAuthFailedError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func authenticateUser(r *http.Request) (*view.User, error) {
	email, password, ok := r.BasicAuth()
	if !ok {
		return nil, fmt.Errorf("user credentials are not provided")
	}
	user, err := userService.AuthenticateUser(email, password)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func SetAuthTokenCookies(w http.ResponseWriter, user *view.User, refreshTokenPath string) error {
	accessToken, refreshToken, err := issueTokenPair(*user, false)
	if err != nil {
		return fmt.Errorf("failed to create token pair for user: %v", err.Error())
	}

	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookieName,
		Value:    accessToken,
		MaxAge:   int(accessTokenDuration.Seconds()),
		Secure:   productionMode,
		HttpOnly: true,
		Path:     "/",
	})
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    refreshToken,
		MaxAge:   int(refreshTokenDuration.Seconds()),
		Secure:   productionMode,
		HttpOnly: true,
		Path:     refreshTokenPath,
	})
	return nil
}

func issueTokenPair(dbUser view.User, withGitIntegration bool) (accessToken string, refreshToken string, err error) {
	user := auth.NewUserInfo(dbUser.Name, dbUser.Id, []string{}, auth.Extensions{})
	accessDuration := jwt.SetExpDuration(accessTokenDuration) // should be more than one minute!

	extensions := user.GetExtensions()
	systemRole, err := roleService.GetUserSystemRole(user.GetID())
	if err != nil {
		return "", "", fmt.Errorf("failed to check user system role: %v", err.Error())
	}
	if systemRole != "" {
		extensions.Set(context.SystemRoleExt, systemRole)
	}
	if withGitIntegration {
		extensions.Set(gitIntegrationExt, "false") //TODO: can we remove it ?
	}
	user.SetExtensions(extensions)

	accessToken, err = jwt.IssueAccessToken(user, keeper, accessDuration)
	if err != nil {
		return "", "", err
	}

	refreshDuration := jwt.SetExpDuration(refreshTokenDuration)
	refreshToken, err = jwt.IssueAccessToken(user, keeper, refreshDuration)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func GetPublicKey() []byte {
	return publicKey
}
