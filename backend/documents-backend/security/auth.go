package security

import (
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
)

// Authenticator bundles the go-guardian strategies (bearer, cookie, api-key) and the APIHUB anonymous-access flag.
type Authenticator struct {
	responder        responder.Responder
	fullAuthStrategy union.Union
	anonymousAccess  AnonymousAccessProvider
}

func NewAuthenticator(apihubClient client.ApihubClient, publicKeyProvider PublicKeyProvider, anonymousAccess AnonymousAccessProvider, responder responder.Responder) Authenticator {
	return NewAuthenticatorWithStrategies(anonymousAccess, responder,
		NewBearerTokenStrategy(publicKeyProvider),
		NewCookieTokenStrategy(publicKeyProvider),
		NewApihubApiKeyStrategy(apihubClient),
	)
}

func NewAuthenticatorWithStrategies(anonymousAccess AnonymousAccessProvider, responder responder.Responder, strategies ...auth.Strategy) Authenticator {
	return Authenticator{responder: responder, fullAuthStrategy: union.New(strategies...), anonymousAccess: anonymousAccess}
}
