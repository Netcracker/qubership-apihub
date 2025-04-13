package security

import (
	"context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agent/client"

	"github.com/shaj13/go-guardian/v2/auth"
)

func NewApihubApiKeyStrategy(apihubClient client.ApihubClient) auth.Strategy {
	return &apihubApiKeyStrategyImpl{apihubClient: apihubClient}
}

type apihubApiKeyStrategyImpl struct {
	apihubClient client.ApihubClient
}

func (a apihubApiKeyStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	apiKey := r.Header.Get("api-key")
	if apiKey == "" {
		return nil, fmt.Errorf("authentication failed: %v is empty", "api-key")
	}

	valid, err := a.apihubClient.CheckApiKeyValid(apiKey)
	if err != nil {
		return nil, err
	}
	if valid {
		return auth.NewDefaultUser("", "api-key", []string{}, auth.Extensions{}), nil
	} else {
		return nil, nil
	}
}
