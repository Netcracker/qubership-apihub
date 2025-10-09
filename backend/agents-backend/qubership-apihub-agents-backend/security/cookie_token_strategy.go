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
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"

	"github.com/shaj13/go-guardian/v2/auth"
)

func NewCookieTokenStrategy(apihubClient client.ApihubClient) auth.Strategy {
	extractAccessTokenFromCookie := func(r *http.Request) (string, error) {
		cookie, err := r.Cookie(view.AccessTokenCookieName)
		if err != nil {
			return "", fmt.Errorf("access token cookie not found")
		}
		return cookie.Value, nil
	}
	return &baseJWTStrategyImpl{apihubClient: apihubClient, extractToken: extractAccessTokenFromCookie}
}
