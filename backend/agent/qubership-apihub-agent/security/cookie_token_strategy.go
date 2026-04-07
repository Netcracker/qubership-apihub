package security

import (
	"context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/view"
	"github.com/shaj13/go-guardian/v2/auth"

	"gopkg.in/square/go-jose.v2/jwt"
)

func NewCookieTokenStrategy(apihubClient client.ApihubClient) auth.Strategy {
	return &cookieTokenStrategyImpl{apihubClient: apihubClient}
}

type cookieTokenStrategyImpl struct {
	apihubClient client.ApihubClient
}

func (a cookieTokenStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	cookie, err := r.Cookie(view.AccessTokenCookieName)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: access token cookie not found")
	}

	// TODO: check the value before the request?

	success, err := a.apihubClient.CheckAuthToken(ctx, cookie.Value)
	if err != nil {
		return nil, err
	}
	if success {
		jt, err := jwt.ParseSigned(cookie.Value)
		if err != nil {
			return nil, fmt.Errorf("token parse error: %w", err)
		}
		userInfo := auth.NewDefaultUser("", "", []string{}, auth.Extensions{})
		if err := jt.UnsafeClaimsWithoutVerification(userInfo); err != nil {
			return nil, fmt.Errorf("claims extraction error: %w", err)
		}
		return userInfo, nil
	} else {
		return nil, fmt.Errorf("authentication failed, token from cookie is incorrect")
	}
}
