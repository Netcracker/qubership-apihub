package security

import (
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"

	"github.com/shaj13/go-guardian/v2/auth"
)

func NewCookieTokenStrategy(apihubClient client.ApihubClient) auth.Strategy {
	extractAccessTokenFromCookie := func(r *http.Request) (string, error) {
		cookie, err := r.Cookie(view.AccessTokenCookieName)
		if err != nil {
			return "", fmt.Errorf("access token cookie not found")
		}
		return cookie.Value, nil
	}
	return &baseJWTStrategyImpl{apihubClient: apihubClient, extractToken: extractAccessTokenFromCookie}
}
