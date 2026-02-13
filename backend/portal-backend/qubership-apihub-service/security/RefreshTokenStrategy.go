package security

import (
	goctx "context"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	"github.com/shaj13/libcache"
	"net/http"
	"strconv"
	"time"
)

const (
	RefreshTokenCookieName  = "apihub-refresh-token"
	SetAccessTokenCookieExt = "setAccessTokenCookie"
)

func NewRefreshTokenStrategy(cache libcache.Cache, jwtValidator JWTValidator) auth.Strategy {
	return &refreshTokenStrategyImpl{
		cache:        cache,
		jwtValidator: jwtValidator,
	}
}

type refreshTokenStrategyImpl struct {
	cache        libcache.Cache
	jwtValidator JWTValidator
}

func (r refreshTokenStrategyImpl) Authenticate(ctx goctx.Context, req *http.Request) (auth.Info, error) {
	refreshTokenCookie, err := req.Cookie(RefreshTokenCookieName)
	if err != nil {
		// cookie not found
		return nil, nil
	}
	refreshToken := refreshTokenCookie.Value
	var info auth.Info
	if v, ok := r.cache.Load(refreshToken); ok {
		info, ok = v.(auth.Info)
		if !ok {
			return nil, auth.NewTypeError("authentication failed:", (*auth.Info)(nil), v)
		}
		tokenCreationTimestamp, _ := strconv.ParseInt(info.GetExtensions().Get(TokenIssuedAtExt), 0, 64)
		if r.jwtValidator.IsTokenRevoked(info.GetID(), tokenCreationTimestamp) {
			return nil, fmt.Errorf("authentication failed for %s: refresh token is revoked", info.GetID())
		}
	}
	if info == nil {
		var t time.Time
		var err error
		info, t, err = r.jwtValidator.ValidateToken(refreshToken)
		if err != nil {
			return nil, fmt.Errorf("authentication failed: %w", err)
		}
		r.cache.StoreWithTTL(refreshToken, info, time.Until(t))
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
	extensions.Set(context.SystemRoleExt, userInfo.GetExtensions().Get(context.SystemRoleExt))
	accessDuration := jwt.SetExpDuration(accessTokenDuration)

	accessToken, err := jwt.IssueAccessToken(user, keeper, accessDuration)
	if err != nil {
		return nil, err
	}

	extensions.Set(SetAccessTokenCookieExt, accessToken)

	return user, nil
}
