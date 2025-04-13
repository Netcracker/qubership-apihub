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
	"time"

	"github.com/Netcracker/qubership-apihub-agent/client"

	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/libcache"
)

func NewCustomApihubApiKeyStrategy(apihubClient client.ApihubClient, customHeader string) auth.Strategy {
	return &customApihubApiKeyStrategyImpl{
		apihubClient:      apihubClient,
		customHeader:      customHeader,
		validApiKeysCache: libcache.LRU.New(100),
	}
}

type customApihubApiKeyStrategyImpl struct {
	apihubClient      client.ApihubClient
	customHeader      string
	validApiKeysCache libcache.Cache
}

func (c customApihubApiKeyStrategyImpl) Authenticate(ctx context.Context, r *http.Request) (auth.Info, error) {
	var err error
	apiKey := r.Header.Get(c.customHeader)
	if apiKey == "" {
		return nil, fmt.Errorf("authentication failed: %v is empty", c.customHeader)
	}
	val, exists := c.validApiKeysCache.Peek(apiKey)
	var valid bool
	if !exists {
		valid, err = c.apihubClient.CheckApiKeyValid(apiKey)
		if err != nil {
			return nil, err
		}
		c.validApiKeysCache.StoreWithTTL(apiKey, valid, time.Hour*4)
	} else {
		valid = val.(bool)
	}
	if valid {
		return auth.NewDefaultUser("", "api-key", []string{}, auth.Extensions{}), nil
	} else {
		return nil, fmt.Errorf("authentication failed: %v is not valid", c.customHeader)
	}
}
