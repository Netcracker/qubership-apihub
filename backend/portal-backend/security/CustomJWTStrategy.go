package security

import (
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/token"
	"github.com/shaj13/libcache"
	"net/http"
)

const CustomJwtAuthHeader = "X-Apihub-Authorization"

func NewCustomJWTStrategy(cache libcache.Cache, jwtValidator JWTValidator) auth.Strategy {
	parser := token.XHeaderParser(CustomJwtAuthHeader)
	extractToken := func(r *http.Request) (string, error) {
		return parser.Token(r)
	}
	return NewBaseJWTStrategy(cache, jwtValidator, extractToken)
}
