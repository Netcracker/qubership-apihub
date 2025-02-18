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
	goctx "context"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"

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
	packageId := getReqStringParam(r, "packageId")
	apiKeyRevoked, apiKeyView, err := a.apihubApiKeyService.GetApiKeyStatus(apiKey, packageId)
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
	userExtensions.Set(context.ApikeyPackageIdExt, apiKeyView.PackageId)
	userExtensions.Set(context.ApikeyRoleExt, context.MergeApikeyRoles(apiKeyView.Roles))
	return auth.NewDefaultUser(apiKeyView.Name, apiKeyView.Id, []string{}, userExtensions), nil
}

func getReqStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}
