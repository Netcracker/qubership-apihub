package security

import (
	goctx "context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	"github.com/shaj13/libcache"
)

const (
	RefreshTokenCookieName  = "apihub-refresh-token"
	SetAccessTokenCookieExt = "setAccessTokenCookie"
	refreshTokenCachePrefix = "ref:"
)

func NewRefreshTokenStrategy(cache libcache.Cache, jwtValidator JWTValidator, accessTokenDuration time.Duration, keeper jwt.SecretsKeeper) auth.Strategy {
	return &refreshTokenStrategyImpl{
		cache:               cache,
		jwtValidator:        jwtValidator,
		accessTokenDuration: accessTokenDuration,
		keeper:              keeper,
	}
}

type refreshTokenStrategyImpl struct {
	cache               libcache.Cache
	jwtValidator        JWTValidator
	accessTokenDuration time.Duration
	keeper              jwt.SecretsKeeper
}

func (r refreshTokenStrategyImpl) Authenticate(ctx goctx.Context, req *http.Request) (auth.Info, error) {
	refreshTokenCookie, err := req.Cookie(RefreshTokenCookieName)
	if err != nil {
		// cookie not found
		return nil, nil
	}
	refreshToken := refreshTokenCookie.Value
	cacheKey := refreshTokenCachePrefix + refreshToken
	var info auth.Info
	if v, ok := r.cache.Load(cacheKey); ok {
		info, ok = v.(auth.Info)
		if !ok {
			return nil, auth.NewTypeError("authentication failed:", (*auth.Info)(nil), v)
		}
		tokenCreationTimestamp, _ := strconv.ParseInt(info.GetExtensions().Get(TokenIssuedAtExt), 0, 64)
		revoked, err := r.jwtValidator.IsTokenRevoked(ctx, info.GetID(), tokenCreationTimestamp)
		if err != nil {
			return nil, fmt.Errorf("failed to check refresh token revocation for %s: %w", info.GetID(), err)
		}
		if revoked {
			return nil, fmt.Errorf("authentication failed for %s: refresh token is revoked", info.GetID())
		}
	}
	if info == nil {
		var t time.Time
		var err error
		info, t, err = r.jwtValidator.ValidateToken(ctx, refreshToken, RefreshTokenType)
		if err != nil {
			return nil, fmt.Errorf("authentication failed: %w", err)
		}
		r.cache.StoreWithTTL(cacheKey, info, time.Until(t))
	}

	userInfo, err := r.refreshAccessToken(info)
	if err != nil {
		return nil, fmt.Errorf("authentication failed for %s, failed to refresh access token: %w", info.GetID(), err)
	}

	return userInfo, nil
}

func (r refreshTokenStrategyImpl) refreshAccessToken(userInfo auth.Info) (auth.Info, error) {
	user := auth.NewUserInfo(userInfo.GetUserName(), userInfo.GetID(), []string{}, auth.Extensions{})
	extensions := user.GetExtensions()
	extensions.Set(secctx.SystemRoleExt, userInfo.GetExtensions().Get(secctx.SystemRoleExt))
	extensions.Set(TokenTypeExt, AccessTokenType)
	accessDuration := jwt.SetExpDuration(r.accessTokenDuration)

	accessToken, err := jwt.IssueAccessToken(user, r.keeper, accessDuration)
	if err != nil {
		return nil, err
	}

	extensions.Set(SetAccessTokenCookieExt, accessToken)

	return user, nil
}
