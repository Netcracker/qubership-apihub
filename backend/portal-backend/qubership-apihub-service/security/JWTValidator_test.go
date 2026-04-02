package security

import (
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
)

type mockTokenRevocationService struct {
	revokedUsers map[string]int64
}

func (m *mockTokenRevocationService) RevokeUserTokens(userId string) error {
	return nil
}

func (m *mockTokenRevocationService) IsTokenRevoked(userId string, tokenCreationTimestamp int64) bool {
	if revocationTime, ok := m.revokedUsers[userId]; ok {
		return tokenCreationTimestamp <= revocationTime
	}
	return false
}

func generateTestKeeper(t *testing.T) jwt.SecretsKeeper {
	t.Helper()
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("failed to generate RSA key: %v", err)
	}
	return jwt.StaticSecret{
		ID:        "test-kid",
		Secret:    privateKey,
		Algorithm: jwt.RS256,
	}
}

func issueTestToken(t *testing.T, k jwt.SecretsKeeper, userId string, tokenType string, duration time.Duration) string {
	t.Helper()
	user := auth.NewUserInfo("testuser", userId, []string{}, auth.Extensions{})
	if tokenType != "" {
		user.GetExtensions().Set(TokenTypeExt, tokenType)
	}
	token, err := jwt.IssueAccessToken(user, k, jwt.SetExpDuration(duration))
	if err != nil {
		t.Fatalf("failed to issue test token: %v", err)
	}
	return token
}

func TestValidateToken_AcceptsAccessToken(t *testing.T) {
	k := generateTestKeeper(t)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})
	token := issueTestToken(t, k, "user1", AccessTokenType, 5*time.Minute)

	info, expTime, err := validator.ValidateToken(token, AccessTokenType)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if info.GetID() != "user1" {
		t.Errorf("expected user ID 'user1', got '%s'", info.GetID())
	}
	if expTime.IsZero() {
		t.Error("expected non-zero expiration time")
	}
}

func TestValidateToken_AcceptsRefreshToken(t *testing.T) {
	k := generateTestKeeper(t)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})
	token := issueTestToken(t, k, "user1", RefreshTokenType, 5*time.Minute)

	info, _, err := validator.ValidateToken(token, RefreshTokenType)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if info.GetID() != "user1" {
		t.Errorf("expected user ID 'user1', got '%s'", info.GetID())
	}
}

func TestValidateToken_RejectsRefreshAsAccess(t *testing.T) {
	k := generateTestKeeper(t)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})
	token := issueTestToken(t, k, "user1", RefreshTokenType, 5*time.Minute)

	_, _, err := validator.ValidateToken(token, AccessTokenType)
	if err == nil {
		t.Fatal("expected error for refresh token validated as access, got nil")
	}
}

func TestValidateToken_RejectsAccessAsRefresh(t *testing.T) {
	k := generateTestKeeper(t)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})
	token := issueTestToken(t, k, "user1", AccessTokenType, 5*time.Minute)

	_, _, err := validator.ValidateToken(token, RefreshTokenType)
	if err == nil {
		t.Fatal("expected error for access token validated as refresh, got nil")
	}
}

func TestValidateToken_RejectsTokenWithoutType(t *testing.T) {
	k := generateTestKeeper(t)
	validator := NewJWTValidator(k, &mockTokenRevocationService{})
	token := issueTestToken(t, k, "user1", "", 5*time.Minute)

	_, _, err := validator.ValidateToken(token, AccessTokenType)
	if err == nil {
		t.Fatal("expected error for token without type, got nil")
	}
}

func TestValidateToken_RejectsRevokedToken(t *testing.T) {
	k := generateTestKeeper(t)
	revocationService := &mockTokenRevocationService{
		revokedUsers: map[string]int64{
			"user1": time.Now().Add(time.Minute).Unix(),
		},
	}
	validator := NewJWTValidator(k, revocationService)
	token := issueTestToken(t, k, "user1", AccessTokenType, 5*time.Minute)

	_, _, err := validator.ValidateToken(token, AccessTokenType)
	if err == nil {
		t.Fatal("expected error for revoked token, got nil")
	}
}
