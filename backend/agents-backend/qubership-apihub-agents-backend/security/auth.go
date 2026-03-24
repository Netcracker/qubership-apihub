package security

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"
)

var strategy union.Union
var proxyStrategy auth.Strategy

const CustomJwtAuthHeader = "X-Apihub-Authorization"

func SetupGoGuardian(apihubClient client.ApihubClient) error {
	if apihubClient == nil {
		return fmt.Errorf("apihubClient is nil")
	}

	bearerTokenStrategy := NewBearerTokenStrategy(apihubClient)
	cookieTokenStrategy := NewCookieTokenStrategy(apihubClient)
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apihubClient)
	patStrategy := NewApihubPATStrategy(apihubClient)
	strategy = union.New(bearerTokenStrategy, cookieTokenStrategy, apihubApiKeyStrategy, patStrategy)

	customJwtStrategy := NewCustomJWTStrategy(apihubClient)
	proxyStrategy = union.New(customJwtStrategy, cookieTokenStrategy)
	return nil
}
