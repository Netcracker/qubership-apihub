// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
