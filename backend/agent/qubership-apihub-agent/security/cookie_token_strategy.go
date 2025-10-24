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
	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/view"
	"github.com/shaj13/go-guardian/v2/auth"
	"net/http"
)

func NewCookieTokenStrategy(apihubClient client.ApihubClient) auth.Strategy {
	return &cookieTokenStrategyImpl{apihubClient: apihubClient}
}

type cookieTokenStrategyImpl struct {
	apihubClient client.ApihubClient
}

func (a cookieTokenStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	cookie, err := r.Cookie(view.AccessTokenCookieName)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: access token cookie not found")
	}

	// TODO: check the value before the request?

	success, err := a.apihubClient.CheckAuthToken(ctx, cookie.Value)
	if err != nil {
		return nil, err
	}
	if success {
		return auth.NewDefaultUser("", "", []string{}, auth.Extensions{}), nil
	} else {
		return nil, fmt.Errorf("authentication failed, token from cookie is incorrect")
	}
}
