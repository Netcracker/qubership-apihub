package security

import (
	"context"
	"crypto/x509"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/responder"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"
)

type Authenticator struct {
	responder      responder.Responder
	strategy       union.Union
	apiKeyStrategy auth.Strategy
}

func NewAuthenticator(apihubClient client.ApihubClient, r responder.Responder) (Authenticator, error) {
	if apihubClient == nil {
		return Authenticator{}, fmt.Errorf("apihubClient is nil")
	}

	ctx := secctx.MakeSysadminContext(context.Background())

	rsaPublicKeyView, err := apihubClient.GetRsaPublicKey(ctx)
	if err != nil {
		return Authenticator{}, fmt.Errorf("rsa public key error - %s", err.Error())
	}
	if rsaPublicKeyView == nil {
		return Authenticator{}, fmt.Errorf("rsa public key is empty")
	}

	rsaPublicKey, err := x509.ParsePKCS1PublicKey(rsaPublicKeyView.Value)
	if err != nil {
		return Authenticator{}, fmt.Errorf("ParsePKCS1PublicKey has error - %s", err.Error())
	}

	keeper := jwt.StaticSecret{
		ID:        "secret-id",
		Secret:    rsaPublicKey,
		Algorithm: jwt.RS256,
	}

	cache := libcache.LRU.New(1000)
	cache.SetTTL(time.Minute * 60)
	cache.RegisterOnExpired(func(key, _ interface{}) {
		cache.Delete(key)
	})

	jwtStrategy := jwt.New(cache, keeper) // TODO: replace with custom strategy to support logout
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apihubClient)
	cookieTokenStrategy := NewCookieTokenStrategy(apihubClient)
	patStrategy := NewApihubPATStrategy(apihubClient)
	strategy := union.New(jwtStrategy, apihubApiKeyStrategy, cookieTokenStrategy, patStrategy)

	return Authenticator{
		responder:      r,
		strategy:       strategy,
		apiKeyStrategy: apihubApiKeyStrategy,
	}, nil
}
