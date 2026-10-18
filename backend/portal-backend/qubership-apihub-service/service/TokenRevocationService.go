package service

import (
	"context"
	"errors"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/buraksezer/olric"
	"github.com/shaj13/go-guardian/v2/auth/claims"
	log "github.com/sirupsen/logrus"
)

type TokenRevocationService interface {
	RevokeUserTokens(ctx context.Context, userId string) error
	IsTokenRevoked(ctx context.Context, userId string, tokenCreationTimestamp int64) (bool, error)
}

func NewTokenRevocationService(provider cache.OlricProvider, cacheTTLSec int) TokenRevocationService {
	tokenRevocationService := &tokenRevocationServiceImpl{
		olricProvider:             provider,
		userTokenRevocationsCache: nil,
		cacheTTL:                  time.Duration(cacheTTLSec) * time.Second,
		ready:                     make(chan struct{}),
	}

	utils.SafeAsync(func() {
		tokenRevocationService.initWhenOlricReady()
	})
	return tokenRevocationService
}

type tokenRevocationServiceImpl struct {
	// TODO: need to sync the cache to DB periodically and read on startup if no Olric cluster
	olricProvider             cache.OlricProvider
	userTokenRevocationsCache *olric.DMap
	cacheTTL                  time.Duration
	ready                     chan struct{}
}

func (l *tokenRevocationServiceImpl) initWhenOlricReady() {
	var err error
	hasErrors := false

	olricCache := l.olricProvider.Get()
	l.userTokenRevocationsCache, err = olricCache.NewDMap("UserTokenRevocations")
	if err != nil {
		log.Errorf("Failed to creare dmap UserTokenRevocations: %s", err.Error())
		hasErrors = true
	}

	if hasErrors {
		log.Infof("Failed to init TokenRevocationService, going to retry")
		time.Sleep(time.Second * 5)
		l.initWhenOlricReady()
		return
	}

	close(l.ready)
	log.Infof("TokenRevocationService is ready")
}

func (l *tokenRevocationServiceImpl) RevokeUserTokens(ctx context.Context, userId string) error {
	select {
	case <-l.ready:
	case <-ctx.Done():
		return ctx.Err()
	}

	// We need to take into account that go-guardian adds leeway when issuing tokens to avoid a situation where freshly issued tokens are considered revoked
	currentTimestamp := time.Now().Add(-claims.DefaultLeeway).Unix()
	if err := l.userTokenRevocationsCache.PutEx(userId, currentTimestamp, l.cacheTTL); err != nil {
		return err
	}
	return nil
}

// IsTokenRevoked reports whether the token was revoked. A non-nil error means the check could not be
// performed because the caller's context is done; it is returned rather than reported as a revocation
// so that a timed-out request is not presented to the user as an authentication failure. Cache
// failures keep failing closed.
func (l *tokenRevocationServiceImpl) IsTokenRevoked(ctx context.Context, userId string, tokenCreationTimestamp int64) (bool, error) {
	if l.userTokenRevocationsCache == nil {
		return false, nil
	}

	if err := ctx.Err(); err != nil {
		return false, err
	}

	val, err := l.userTokenRevocationsCache.Get(userId)
	if err != nil {
		if errors.Is(err, olric.ErrKeyNotFound) {
			return false, nil
		}
		log.Errorf("Error getting revocation timestamp: %v", err)
		return true, nil
	}
	revocationTimestamp, _ := val.(int64)

	return tokenCreationTimestamp <= revocationTimestamp, nil
}
