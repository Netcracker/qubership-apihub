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

package service

import (
	"errors"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/buraksezer/olric"
	"github.com/shaj13/go-guardian/v2/auth/claims"
	log "github.com/sirupsen/logrus"
)

type TokenRevocationService interface {
	RevokeUserTokens(userId string) error
	IsTokenRevoked(userId string, tokenCreationTimestamp int64) bool
}

func NewTokenRevocationService(provider cache.OlricProvider, cacheTTLSec int) TokenRevocationService {
	tokenRevocationService := &tokenRevocationServiceImpl{
		olricProvider:             provider,
		userTokenRevocationsCache: nil,
		cacheTTL:                  time.Duration(cacheTTLSec) * time.Second,
		isReadyWg:                 sync.WaitGroup{},
	}
	tokenRevocationService.isReadyWg.Add(1)

	utils.SafeAsync(func() {
		tokenRevocationService.initWhenOlricReady()
	})
	return tokenRevocationService
}

type tokenRevocationServiceImpl struct {
	// TODO: need to sync the cache to DB periodically and read on startup if no Olric cluster
	olricProvider             cache.OlricProvider
	userTokenRevocationsCache *olric.DMap
	cacheTTL                  time.Duration
	isReadyWg                 sync.WaitGroup
}

func (l *tokenRevocationServiceImpl) initWhenOlricReady() {
	var err error
	hasErrors := false

	olricCache := l.olricProvider.Get()
	l.userTokenRevocationsCache, err = olricCache.NewDMap("UserTokenRevocations")
	if err != nil {
		log.Errorf("Failed to creare dmap UserTokenRevocations: %s", err.Error())
		hasErrors = true
	}

	if hasErrors {
		log.Infof("Failed to init TokenRevocationService, going to retry")
		time.Sleep(time.Second * 5)
		l.initWhenOlricReady()
		return
	}

	l.isReadyWg.Done()
	log.Infof("TokenRevocationService is ready")
}

func (l *tokenRevocationServiceImpl) RevokeUserTokens(userId string) error {
	l.isReadyWg.Wait()

	// We need to take into account that go-guardian adds leeway when issuing tokens to avoid a situation where freshly issued tokens are considered revoked
	currentTimestamp := time.Now().Add(-claims.DefaultLeeway).Unix()
	if err := l.userTokenRevocationsCache.PutEx(userId, currentTimestamp, l.cacheTTL); err != nil {
		return err
	}
	return nil
}

func (l *tokenRevocationServiceImpl) IsTokenRevoked(userId string, tokenCreationTimestamp int64) bool {
	if l.userTokenRevocationsCache == nil {
		return false
	}

	val, err := l.userTokenRevocationsCache.Get(userId)
	if err != nil {
		if errors.Is(err, olric.ErrKeyNotFound) {
			return false
		}
		log.Errorf("Error getting revocation timestamp: %v", err)
		return true
	}
	revocationTimestamp, _ := val.(int64)

	return tokenCreationTimestamp <= revocationTimestamp
}
