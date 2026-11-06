package security

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/shaj13/go-guardian/v2/auth"
)

func NewBearerTokenStrategy(publicKeyProvider PublicKeyProvider) auth.Strategy {
	extractToken := func(r *http.Request) (string, error) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(strings.ToLower(h), "bearer ") {
			return "", errors.New("bearer token not found")
		}
		token := strings.TrimSpace(h[7:])
		if token == "" {
			return "", errors.New("bearer token is empty")
		}
		return token, nil
	}
	return baseJWTStrategyImpl{publicKeyProvider: publicKeyProvider, extractToken: extractToken, now: time.Now}
}
