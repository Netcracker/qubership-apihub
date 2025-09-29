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
	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"net/http"

	"github.com/shaj13/go-guardian/v2/auth"
)

func NewApihubPATStrategy(apihubClient client.ApihubClient) auth.Strategy {
	return &apihubPATStrategyImpl{apihubClient: apihubClient}
}

type apihubPATStrategyImpl struct {
	apihubClient client.ApihubClient
}

const PATHeader = "X-Personal-Access-Token"

func (a apihubPATStrategyImpl) Authenticate(ctx goctx.Context, r *http.Request) (auth.Info, error) {
	pat := r.Header.Get(PATHeader)
	if pat == "" {
		return nil, fmt.Errorf("authentication failed: '%v' header is empty", PATHeader)
	}

	patResp, err := a.apihubClient.GetPatByPAT(ctx, pat)
	if err != nil {
		return nil, err
	}
	if patResp == nil {
		return nil, fmt.Errorf("authentication failed: personal access token not found")
	}

	userExtensions := auth.Extensions{}
	for _, sysRole := range patResp.SystemRoles {
		userExtensions.Add(secctx.SystemRoleExt, sysRole)
	}

	return auth.NewDefaultUser(patResp.User.Name, patResp.User.Id, []string{}, userExtensions), nil
}
