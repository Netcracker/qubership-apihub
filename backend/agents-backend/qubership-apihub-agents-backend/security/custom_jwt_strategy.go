package security

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/token"
)

func NewCustomJWTStrategy(apihubClient client.ApihubClient) auth.Strategy {
	parser := token.XHeaderParser(CustomJwtAuthHeader)
	extractToken := func(r *http.Request) (string, error) {
		return parser.Token(r)
	}
	return baseJWTStrategyImpl{apihubClient: apihubClient, extractToken: extractToken}
}
