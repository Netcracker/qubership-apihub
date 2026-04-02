package security

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/lru"
)

func TestBaseJWTStrategy_RejectsRefreshToken(t *testing.T) {
	k := generateTestKeeper(t)
	cache := libcache.LRU.New(100)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})
	strategy := NewBaseJWTStrategy(cache, validator, func(r *http.Request) (string, error) {
		cookie, _ := r.Cookie(AccessTokenCookieName)
		return cookie.Value, nil
	})

	refreshToken := issueTestToken(t, k, "user1", RefreshTokenType, 5*time.Minute)
	req, _ := http.NewRequestWithContext(context.Background(), "GET", "/", nil)
	req.AddCookie(&http.Cookie{
		Name:  AccessTokenCookieName,
		Value: refreshToken,
	})

	_, err := strategy.Authenticate(context.Background(), req)
	if err == nil {
		t.Fatal("expected error when using refresh token with BaseJWTStrategy, got nil")
	}
}

func TestBaseJWTStrategy_RejectsCachedRefreshToken(t *testing.T) {
	k := generateTestKeeper(t)
	keeper = k
	accessTokenDuration = 5 * time.Minute

	cache := libcache.LRU.New(100)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})

	refreshStrategy := NewRefreshTokenStrategy(cache, validator)
	accessStrategy := NewBaseJWTStrategy(cache, validator, func(r *http.Request) (string, error) {
		cookie, _ := r.Cookie(AccessTokenCookieName)
		return cookie.Value, nil
	})

	// First, authenticate a refresh token via RefreshTokenStrategy to cache it
	refreshToken := issueTestToken(t, k, "user1", RefreshTokenType, 5*time.Minute)
	refreshReq, _ := http.NewRequestWithContext(context.Background(), "GET", "/", nil)
	refreshReq.AddCookie(&http.Cookie{
		Name:  RefreshTokenCookieName,
		Value: refreshToken,
	})
	_, err := refreshStrategy.Authenticate(context.Background(), refreshReq)
	if err != nil {
		t.Fatalf("expected refresh strategy to succeed, got: %v", err)
	}

	accessReq, _ := http.NewRequestWithContext(context.Background(), "GET", "/", nil)
	accessReq.AddCookie(&http.Cookie{
		Name:  AccessTokenCookieName,
		Value: refreshToken,
	})

	_, err = accessStrategy.Authenticate(context.Background(), accessReq)
	if err == nil {
		t.Fatal("expected error when using cached refresh token with BaseJWTStrategy, got nil")
	}
}
