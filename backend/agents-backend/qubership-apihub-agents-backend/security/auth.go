package security

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/responder"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
)

const CustomJwtAuthHeader = "X-Apihub-Authorization"

type AuthHandler struct {
	responder     *responder.Responder
	strategy      union.Union
	proxyStrategy auth.Strategy
}

func NewAuthHandler(apihubClient client.ApihubClient, r *responder.Responder) (*AuthHandler, error) {
	if apihubClient == nil {
		return nil, fmt.Errorf("apihubClient is nil")
	}

	bearerTokenStrategy := NewBearerTokenStrategy(apihubClient)
	cookieTokenStrategy := NewCookieTokenStrategy(apihubClient)
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apihubClient)
	patStrategy := NewApihubPATStrategy(apihubClient)
	strategy := union.New(bearerTokenStrategy, cookieTokenStrategy, apihubApiKeyStrategy, patStrategy)

	customJwtStrategy := NewCustomJWTStrategy(apihubClient)
	proxyStrategy := union.New(customJwtStrategy, cookieTokenStrategy)

	return &AuthHandler{
		responder:     r,
		strategy:      strategy,
		proxyStrategy: proxyStrategy,
	}, nil
}
