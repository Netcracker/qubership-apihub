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

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/shaj13/go-guardian/v2/auth"
	"gopkg.in/square/go-jose.v2/jwt"
)

type tokenExtractorFunc func(r *http.Request) (string, error)

type baseJWTStrategyImpl struct {
	apihubClient client.ApihubClient
	extractToken tokenExtractorFunc
}

func (b baseJWTStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	token, err := b.extractToken(r)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: access token not found")
	}

	success, err := b.apihubClient.CheckAuthToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if success {
		jt, err := jwt.ParseSigned(token)
		if err != nil {
			return nil, fmt.Errorf("token parse error: %w", err)
		}
		userInfo := auth.NewDefaultUser("", "", []string{}, auth.Extensions{})
		if err := jt.UnsafeClaimsWithoutVerification(userInfo); err != nil {
			return nil, fmt.Errorf("claims extraction error: %w", err)
		}
		return userInfo, nil
	} else {
		return nil, fmt.Errorf("authentication failed, token from cookie is incorrect")
	}
}
