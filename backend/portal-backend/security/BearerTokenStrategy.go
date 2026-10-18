package security

import (
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/token"
	"github.com/shaj13/libcache"
	"net/http"
)

func NewBearerTokenStrategy(cache libcache.Cache, jwtValidator JWTValidator) auth.Strategy {
	parser := token.AuthorizationParser("Bearer")
	extractBearerToken := func(r *http.Request) (string, error) {
		return parser.Token(r)
	}
	return NewBaseJWTStrategy(cache, jwtValidator, extractBearerToken)
}
