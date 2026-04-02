package security

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/lru"
)

func TestRefreshTokenStrategy_RejectsAccessToken(t *testing.T) {
	k := generateTestKeeper(t)
	keeper = k
	accessTokenDuration = 5 * time.Minute

	cache := libcache.LRU.New(100)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})
	strategy := NewRefreshTokenStrategy(cache, validator)

	accessToken := issueTestToken(t, k, "user1", AccessTokenType, 5*time.Minute)
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/", nil)
	req.AddCookie(&http.Cookie{
		Name:  RefreshTokenCookieName,
		Value: accessToken,
	})

	_, err := strategy.Authenticate(context.Background(), req)
	if err == nil {
		t.Fatal("expected error when using access token with RefreshTokenStrategy, got nil")
	}
}

func TestRefreshTokenStrategy_RejectsCachedAccessToken(t *testing.T) {
	k := generateTestKeeper(t)
	keeper = k
	accessTokenDuration = 5 * time.Minute

	cache := libcache.LRU.New(100)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})

	accessStrategy := NewBaseJWTStrategy(cache, validator, func(r *http.Request) (string, error) {
		cookie, _ := r.Cookie(AccessTokenCookieName)
		return cookie.Value, nil
	})
	refreshStrategy := NewRefreshTokenStrategy(cache, validator)

	// First, authenticate an access token via BaseJWTStrategy to cache it
	accessToken := issueTestToken(t, k, "user1", AccessTokenType, 5*time.Minute)
	accessReq, _ := http.NewRequestWithContext(context.Background(), "GET", "/", nil)
	accessReq.AddCookie(&http.Cookie{
		Name:  AccessTokenCookieName,
		Value: accessToken,
	})

	_, err := accessStrategy.Authenticate(context.Background(), accessReq)
	if err != nil {
		t.Fatalf("expected access strategy to succeed, got: %v", err)
	}

	refreshReq, _ := http.NewRequestWithContext(context.Background(), "GET", "/", nil)
	refreshReq.AddCookie(&http.Cookie{
		Name:  RefreshTokenCookieName,
		Value: accessToken,
	})

	_, err = refreshStrategy.Authenticate(context.Background(), refreshReq)
	if err == nil {
		t.Fatal("expected error when using cached access token with RefreshTokenStrategy, got nil")
	}
}
