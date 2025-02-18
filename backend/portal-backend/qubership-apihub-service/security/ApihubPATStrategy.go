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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/shaj13/go-guardian/v2/auth"
)

func NewApihubPATStrategy(svc service.PersonalAccessTokenService) auth.Strategy {
	return &apihubPATStrategyImpl{svc: svc}
}

type apihubPATStrategyImpl struct {
	svc service.PersonalAccessTokenService
}

const PATHeader = "X-Personal-Access-Token"

func (a apihubPATStrategyImpl) Authenticate(ctx goctx.Context, r *http.Request) (auth.Info, error) {
	pat := r.Header.Get(PATHeader)
	if pat == "" {
		return nil, fmt.Errorf("authentication failed: '%v' header is empty", PATHeader)
	}
	//TODO: some optimization wanted: this auth method is using 3 DB calls: get pat, get user, get system role

	token, user, err := a.svc.GetPATByToken(pat)
	if err != nil {
		return nil, err
	}
	if token == nil {
		return nil, fmt.Errorf("authentication failed: personal access token not found")
	}
	if token.Status != view.PersonaAccessTokenActive {
		return nil, fmt.Errorf("authentication failed: inactive personal access token")
	}
	if user == nil {
		return nil, fmt.Errorf("authentication failed: unable to retrieve user for PAT")
	}

	userExtensions := auth.Extensions{}
	systemRole, err := roleService.GetUserSystemRole(user.Id)
	if err != nil {
		return nil, fmt.Errorf("failed to check user system role: %v", err.Error())
	}
	if systemRole != "" {
		userExtensions.Set(context.SystemRoleExt, systemRole)
	}
	return auth.NewDefaultUser(user.Name, user.Id, []string{}, userExtensions), nil
}
