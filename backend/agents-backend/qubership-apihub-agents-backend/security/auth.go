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

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"
)

var strategy union.Union
var proxyStrategy auth.Strategy

const CustomJwtAuthHeader = "X-Apihub-Authorization"

func SetupGoGuardian(apihubClient client.ApihubClient) error {
	if apihubClient == nil {
		return fmt.Errorf("apihubClient is nil")
	}

	bearerTokenStrategy := NewBearerTokenStrategy(apihubClient)
	cookieTokenStrategy := NewCookieTokenStrategy(apihubClient)
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apihubClient)
	patStrategy := NewApihubPATStrategy(apihubClient)
	strategy = union.New(bearerTokenStrategy, cookieTokenStrategy, apihubApiKeyStrategy, patStrategy)

	customJwtStrategy := NewCustomJWTStrategy(apihubClient)
	proxyStrategy = union.New(customJwtStrategy, cookieTokenStrategy)
	return nil
}
