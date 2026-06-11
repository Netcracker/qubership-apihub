package security

import (
	goctx "context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/shaj13/go-guardian/v2/auth"
)

func NewApihubApiKeyStrategy(apihubApiKeyService service.ApihubApiKeyService) auth.Strategy {
	return &apihubApiKeyStrategyImpl{apihubApiKeyService: apihubApiKeyService}
}

type apihubApiKeyStrategyImpl struct {
	apihubApiKeyService service.ApihubApiKeyService
}

const ApiKeyHeader = "api-key"

func (a apihubApiKeyStrategyImpl) Authenticate(ctx goctx.Context, r *http.Request) (auth.Info, error) {
	apiKey := r.Header.Get(ApiKeyHeader)
	if apiKey == "" {
		return nil, fmt.Errorf("authentication failed: header '%v' is empty", ApiKeyHeader)
	}
	apiKeyRevoked, apiKeyView, err := a.apihubApiKeyService.GetApiKeyStatus(apiKey)
	if err != nil {
		return nil, err
	}
	if apiKeyView == nil {
		return nil, fmt.Errorf("authentication failed: '%v' doesn't exist or invalid", ApiKeyHeader)
	}
	if apiKeyRevoked {
		return nil, fmt.Errorf("authentication failed: %v has been revoked", ApiKeyHeader)
	}
	userExtensions := auth.Extensions{}
	userExtensions.Set(context.ApikeyIdExt, apiKeyView.Id)
	userExtensions.Set(context.ApikeyPackageIdExt, apiKeyView.PackageId)
	userExtensions.Set(context.ApikeyRoleExt, context.MergeApikeyRoles(apiKeyView.Roles))

	return auth.NewDefaultUser(apiKeyView.Name, apiKeyView.Id, []string{}, userExtensions), nil
}
