package security

import (
	"context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/secctx"

	"github.com/shaj13/go-guardian/v2/auth"
)

func NewApihubApiKeyStrategy(apihubClient client.ApihubClient) auth.Strategy {
	return &apihubApiKeyStrategyImpl{apihubClient: apihubClient}
}

type apihubApiKeyStrategyImpl struct {
	apihubClient client.ApihubClient
}

func (a apihubApiKeyStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	apiKeyHeader := r.Header.Get("api-key")
	if apiKeyHeader == "" {
		return nil, fmt.Errorf("authentication failed: %v is empty", "api-key")
	}

	apiKey, err := a.apihubClient.GetApiKeyByKey(ctx, apiKeyHeader)
	if err != nil {
		return nil, err
	}
	if apiKey == nil || apiKey.Revoked {
		return nil, fmt.Errorf("authentication failed: %v is not valid", "api-key")
	}
	userExtensions := auth.Extensions{}
	for _, sysRole := range apiKey.Roles {
		userExtensions.Add(secctx.SystemRoleExt, sysRole)
	}

	return auth.NewDefaultUser(apiKey.Name, apiKey.Id, []string{}, userExtensions), nil
}
