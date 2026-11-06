package security

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/shaj13/go-guardian/v2/auth"
)

// NewApihubApiKeyStrategy validates the api-key header against APIHUB (GET /api/v2/auth/apiKey).
// An api-key is accepted only when it carries the System administrator role; a package-scoped key is never a
// plain user of this service, so it is rejected with 401.
func NewApihubApiKeyStrategy(apihubClient client.ApihubClient) auth.Strategy {
	return &apihubApiKeyStrategyImpl{apihubClient: apihubClient}
}

type apihubApiKeyStrategyImpl struct {
	apihubClient client.ApihubClient
}

func (a apihubApiKeyStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	apiKeyHeader := r.Header.Get(view.ApiKeyHeader)
	if apiKeyHeader == "" {
		return nil, fmt.Errorf("authentication failed: %v is empty", view.ApiKeyHeader)
	}
	apiKey, err := a.apihubClient.GetApiKeyByKey(ctx, apiKeyHeader)
	if err != nil {
		if errors.Is(err, client.ErrUnauthorized) {
			return nil, errors.New("authentication failed: api-key is not valid")
		}
		return nil, fmt.Errorf("authentication failed: api-key validation error: %w", err)
	}
	if apiKey == nil || apiKey.Revoked {
		return nil, errors.New("authentication failed: api-key is not valid")
	}
	userExtensions := auth.Extensions{}
	sysadm := false
	for _, role := range apiKey.Roles {
		userExtensions.Add(secctx.SystemRoleExt, role)
		if role == view.SysadmRole {
			sysadm = true
		}
	}
	if !sysadm {
		return nil, errors.New("authentication failed: api-key does not have the System administrator role")
	}
	userExtensions.Set(secctx.ApiKeyIdExt, apiKey.Id)
	return auth.NewDefaultUser(apiKey.Name, "apikey:"+apiKey.Id, []string{}, userExtensions), nil
}
