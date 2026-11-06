package security

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/shaj13/go-guardian/v2/auth"
	"gopkg.in/square/go-jose.v2"
	"gopkg.in/square/go-jose.v2/jwt"
)

type tokenExtractorFunc func(r *http.Request) (string, error)

// baseJWTStrategyImpl verifies an APIHUB-issued RS256 token locally against the APIHUB public key.
// Unlike agents-backend it does not call APIHUB per request: signature and exp are checked here.
type baseJWTStrategyImpl struct {
	publicKeyProvider PublicKeyProvider
	extractToken      tokenExtractorFunc
	now               func() time.Time
}

// APIHUB issues tokens through go-guardian's jwt.IssueAccessToken: standard claims plus the auth.DefaultUser struct
// marshalled as-is (fields "Name", "ID", "Groups", "Extensions"). Both are decoded from the same payload.
type tokenClaims struct {
	jwt.Claims
	user auth.DefaultUser
}

func (b baseJWTStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	token, err := b.extractToken(r)
	if err != nil {
		return nil, err
	}
	parsed, err := jwt.ParseSigned(token)
	if err != nil {
		return nil, fmt.Errorf("token parse error: %w", err)
	}
	if len(parsed.Headers) != 1 || parsed.Headers[0].Algorithm != string(jose.RS256) {
		return nil, errors.New("token must be signed with RS256")
	}
	claims, err := b.verify(ctx, parsed, false)
	if err != nil {
		return nil, err
	}
	if claims.Expiry == nil {
		return nil, errors.New("token has no exp claim")
	}
	if err := claims.Validate(jwt.Expected{Time: b.now()}); err != nil {
		return nil, fmt.Errorf("token is not valid: %w", err)
	}
	if claims.Subject == "" {
		return nil, errors.New("token has no sub claim")
	}
	ext := claims.user.Extensions
	if ext == nil {
		ext = auth.Extensions{}
	}
	return auth.NewDefaultUser(claims.user.Name, claims.Subject, claims.user.Groups, ext), nil
}

func (b baseJWTStrategyImpl) verify(ctx context.Context, parsed *jwt.JSONWebToken, refresh bool) (*tokenClaims, error) {
	key, err := b.publicKeyProvider.GetPublicKey(ctx, refresh)
	if err != nil {
		return nil, err
	}
	var claims tokenClaims
	err = parsed.Claims(key, &claims.Claims, &claims.user)
	if err == nil {
		return &claims, nil
	}
	if !refresh && errors.Is(err, jose.ErrCryptoFailure) {
		// APIHUB may have rotated its key: refetch once and retry.
		return b.verify(ctx, parsed, true)
	}
	return nil, fmt.Errorf("token signature is not valid: %w", err)
}
