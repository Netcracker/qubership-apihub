package security

import (
	"crypto/x509"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/controller"
	"github.com/Netcracker/qubership-apihub-agent/responder"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	"github.com/shaj13/go-guardian/v2/auth/strategies/token"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"
)

type Authenticator struct {
	responder     responder.Responder
	strategy      union.Union
	proxyStrategy union.Union
}

func NewAuthenticator(apihubClient client.ApihubClient, resp responder.Responder) (Authenticator, error) {
	if apihubClient == nil {
		return Authenticator{}, fmt.Errorf("apihubClient is nil")
	}

	rsaPublicKeyView, err := apihubClient.GetRsaPublicKey(secctx.CreateSystemContext())
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

	jwtStrategy := jwt.New(cache, keeper)
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apihubClient)
	cookieTokenStrategy := NewCookieTokenStrategy(apihubClient)
	patStrategy := NewApihubPATStrategy(apihubClient)

	strategy := union.New(jwtStrategy, apihubApiKeyStrategy, cookieTokenStrategy, patStrategy)

	customApihubApiKeyStrategy := NewCustomApihubApiKeyStrategy(apihubClient, controller.CustomApiKeyHeader)
	customJwtStrategy := jwt.New(cache, keeper, token.SetParser(token.XHeaderParser(controller.CustomJwtAuthHeader)))
	proxyStrategy := union.New(customJwtStrategy, customApihubApiKeyStrategy, cookieTokenStrategy)

	return Authenticator{
		responder:     resp,
		strategy:      strategy,
		proxyStrategy: proxyStrategy,
	}, nil
}
