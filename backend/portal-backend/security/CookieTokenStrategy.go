package security

import (
	"fmt"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/libcache"
	"net/http"
)

const AccessTokenCookieName = "apihub-access-token"

func NewCookieTokenStrategy(cache libcache.Cache, jwtValidator JWTValidator) auth.Strategy {
	extractAccessTokenFromCookie := func(r *http.Request) (string, error) {
		cookie, err := r.Cookie(AccessTokenCookieName)
		if err != nil {
			return "", fmt.Errorf("access token cookie not found")
		}
		return cookie.Value, nil
	}
	return NewBaseJWTStrategy(cache, jwtValidator, extractAccessTokenFromCookie)
}
