package security

import (
	"fmt"
	"strings"
	"time"

	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
)

const (
	EphemeralFileDownloadTokenType = "ephemeral-file-download"
	fileIDExt                      = "fileId"
)

func MintEphemeralFileToken(userID, fileID string, ttl time.Duration) (string, error) {
	if defaultJWTValidator == nil {
		return "", fmt.Errorf("security not initialized: JWT validator is nil")
	}
	user := auth.NewUserInfo("", userID, nil, auth.Extensions{})
	ext := user.GetExtensions()
	ext.Set(TokenTypeExt, EphemeralFileDownloadTokenType)
	ext.Set(fileIDExt, fileID)
	return jwt.IssueAccessToken(user, keeper, jwt.SetExpDuration(ttl))
}

func ValidateEphemeralFileToken(token string) (userID, fileID string, err error) {
	if defaultJWTValidator == nil {
		return "", "", fmt.Errorf("security not initialized")
	}
	info, exp, err := defaultJWTValidator.ValidateToken(token, EphemeralFileDownloadTokenType)
	if err != nil {
		return "", "", err
	}
	_ = exp
	fid := info.GetExtensions().Get(fileIDExt)
	if fid == "" {
		return "", "", fmt.Errorf("missing fileId claim")
	}
	return info.GetID(), fid, nil
}

// Avoid matching unrelated "exp" substrings (e.g. "expected").
func IsTokenExpiredError(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "expired") ||
		strings.Contains(s, "token is exp") ||
		strings.Contains(s, "exp claim")
}
