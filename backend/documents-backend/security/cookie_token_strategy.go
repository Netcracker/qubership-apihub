package security

import (
	"errors"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/shaj13/go-guardian/v2/auth"
)

func NewCookieTokenStrategy(publicKeyProvider PublicKeyProvider) auth.Strategy {
	extractToken := func(r *http.Request) (string, error) {
		cookie, err := r.Cookie(view.AccessTokenCookieName)
		if err != nil || cookie.Value == "" {
			return "", errors.New("access token cookie not found")
		}
		return cookie.Value, nil
	}
	return baseJWTStrategyImpl{publicKeyProvider: publicKeyProvider, extractToken: extractToken, now: time.Now}
}
