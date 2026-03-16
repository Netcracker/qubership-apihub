package security

import (
	goctx "context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/libcache"
)

const accessTokenCachePrefix = "acc:"

type tokenExtractorFunc func(r *http.Request) (string, error)

type baseJWTStrategyImpl struct {
	cache        libcache.Cache
	jwtValidator JWTValidator
	extractToken tokenExtractorFunc
}

func NewBaseJWTStrategy(cache libcache.Cache, jwtValidator JWTValidator, extractToken tokenExtractorFunc) auth.Strategy {
	return &baseJWTStrategyImpl{
		cache:        cache,
		jwtValidator: jwtValidator,
		extractToken: extractToken,
	}
}

func (b baseJWTStrategyImpl) Authenticate(ctx goctx.Context, r *http.Request) (auth.Info, error) {
	token, err := b.extractToken(r)
	if err != nil {
		return nil, err
	}

	cacheKey := accessTokenCachePrefix + token
	var info auth.Info
	if v, ok := b.cache.Load(cacheKey); ok {
		info, ok = v.(auth.Info)
		if !ok {
			return nil, auth.NewTypeError("authentication failed:", (*auth.Info)(nil), v)
		}
		tokenCreationTimestamp, _ := strconv.ParseInt(info.GetExtensions().Get(TokenIssuedAtExt), 0, 64)
		if b.jwtValidator.IsTokenRevoked(info.GetID(), tokenCreationTimestamp) {
			return nil, fmt.Errorf("authentication failed: access token is revoked")
		}
	} else {
		var expirationTime time.Time
		info, expirationTime, err = b.jwtValidator.ValidateToken(token, AccessTokenType)
		if err != nil {
			return nil, fmt.Errorf("authentication failed: %w", err)
		}
		b.cache.StoreWithTTL(cacheKey, info, time.Until(expirationTime))
	}

	return info, nil
}
