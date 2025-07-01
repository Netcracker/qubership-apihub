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
	"crypto/x509"
	"fmt"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/controller"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	"github.com/shaj13/go-guardian/v2/auth/strategies/token"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"

	"time"
)

var strategy union.Union
var customJwtStrategy auth.Strategy

var proxyAuthStrategy union.Union

func SetupGoGuardian(apihubClient client.ApihubClient) error {
	if apihubClient == nil {
		return fmt.Errorf("apihubClient is nil")
	}

	rsaPublicKeyView, err := apihubClient.GetRsaPublicKey(secctx.CreateSystemContext())
	if err != nil {
		return fmt.Errorf("rsa public key error - %s", err.Error())
	}
	if rsaPublicKeyView == nil {
		return fmt.Errorf("rsa public key is empty")
	}

	rsaPublicKey, err := x509.ParsePKCS1PublicKey(rsaPublicKeyView.Value)
	if err != nil {
		return fmt.Errorf("ParsePKCS1PublicKey has error - %s", err.Error())
	}

	keeper := jwt.StaticSecret{
		ID:        "secret-id",
		Secret:    rsaPublicKey,
		Algorithm: jwt.RS256,
	}

	cache := libcache.LRU.New(1000)
	cache.SetTTL(time.Minute * 60)
	cache.RegisterOnExpired(func(key, _ interface{}) {
		cache.Delete(key)
	})

	jwtStrategy := jwt.New(cache, keeper)
	apihubApiKeyStrategy := NewApihubApiKeyStrategy(apihubClient)
	cookieTokenStrategy := NewCookieTokenStrategy(apihubClient)

	strategy = union.New(jwtStrategy, apihubApiKeyStrategy, cookieTokenStrategy)

	customApihubApiKeyStrategy := NewCustomApihubApiKeyStrategy(apihubClient, controller.CustomApiKeyHeader)
	customJwtStrategy = jwt.New(cache, keeper, token.SetParser(token.XHeaderParser(controller.CustomJwtAuthHeader)))
	proxyAuthStrategy = union.New(customJwtStrategy, customApihubApiKeyStrategy, cookieTokenStrategy)
	return nil
}
