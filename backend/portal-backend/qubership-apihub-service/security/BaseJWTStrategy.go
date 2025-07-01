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
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/libcache"
	"net/http"
	"strconv"
	"time"
)

type tokenExtractorFunc func(r *http.Request) (string, error)

type baseJWTStrategyImpl struct {
	cache        libcache.Cache
	jwtValidator JWTValidator
	extractToken tokenExtractorFunc
}

func NewBaseJWTStrategy(cache libcache.Cache, jwtValidator JWTValidator, extractToken tokenExtractorFunc) auth.Strategy {
	return &baseJWTStrategyImpl{
		cache:        cache,
		jwtValidator: jwtValidator,
		extractToken: extractToken,
	}
}

func (b baseJWTStrategyImpl) Authenticate(ctx goctx.Context, r *http.Request) (auth.Info, error) {
	token, err := b.extractToken(r)
	if err != nil {
		return nil, err
	}

	if v, ok := b.cache.Load(token); ok {
		info, ok := v.(auth.Info)
		if !ok {
			return nil, auth.NewTypeError("authentication failed:", (*auth.Info)(nil), v)
		}
		tokenCreationTimestamp, _ := strconv.ParseInt(info.GetExtensions().Get(TokenIssuedAtExt), 0, 64)
		if b.jwtValidator.IsTokenRevoked(info.GetID(), tokenCreationTimestamp) {
			return nil, fmt.Errorf("authentication failed: access token is revoked")
		}
		return info, nil
	}

	info, expirationTime, err := b.jwtValidator.ValidateToken(token)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	b.cache.StoreWithTTL(token, info, time.Until(expirationTime))

	return info, nil
}
