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
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/buraksezer/olric"
	"github.com/shaj13/libcache"
	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type GitClientProvider interface {
	GetUserClient(integration view.GitIntegrationType, userId string) (client.GitClient, error)
	GetUserClientWithNewKey(integration view.GitIntegrationType, userId string, token string) (client.GitClient, error)
	GetConfiguration(integration view.GitIntegrationType) (*client.GitClientConfiguration, error)
	UpdateUserCache(integration view.GitIntegrationType, userId string, expiresAt time.Time) error
}

func NewGitClientProvider(configs []client.GitClientConfiguration, repo repository.GitIntegrationRepository,
	tokenRevocationHandler client.TokenRevocationHandler, tokenExpirationHandler client.TokenExpirationHandler, op cache.OlricProvider) (GitClientProvider, error) {

	cache := libcache.LRU.New(1000)
	cache.SetTTL(time.Minute * 60)
	cache.RegisterOnExpired(func(key, _ interface{}) {
		cache.Delete(key)
	})

	provider := gitClientProviderImpl{
		op: op,
	}
	provider.repo = repo
	provider.gitlabClientUserCache = cache
	provider.tokenRevocationHandler = tokenRevocationHandler
	provider.tokenExpirationHandler = tokenExpirationHandler

	for _, config := range configs {
		switch config.Integration {
		case view.GitlabIntegration:
			provider.gitlabConfiguration = config
			break
		default:
			return nil, fmt.Errorf("unknown integration type: %s, unable to create client provider", config.Integration)
		}
	}
	utils.SafeAsync(func() {
		provider.deleteGCRevokedUsersFromCache()
	})
	return &provider, nil
}

// todo probably need to rename this topic
const GCRevokedUsersTopicName = "git-client-revoked-users"

func (p *gitClientProviderImpl) deleteGCRevokedUsersFromCache() {
	var err error
	p.olricC = p.op.Get()
	topicName := GCRevokedUsersTopicName
	p.gcRevokedUsersTopic, err = p.olricC.NewDTopic(topicName, 10000, 1)
	if err != nil {
		log.Errorf("Failed to create DTopic: %s", err.Error())
	}
	p.gcRevokedUsersTopic.AddListener(func(topic olric.DTopicMessage) {
		p.userGCMutex.Lock()
		defer p.userGCMutex.Unlock()

		userId := fmt.Sprintf("%v", topic.Message)
		p.gitlabClientUserCache.Delete(userId)
	})
}

type gitClientProviderImpl struct {
	repo                   repository.GitIntegrationRepository
	gitlabConfiguration    client.GitClientConfiguration
	gitlabClientUserCache  libcache.Cache
	tokenRevocationHandler client.TokenRevocationHandler
	tokenExpirationHandler client.TokenExpirationHandler
	op                     cache.OlricProvider
	olricC                 *olric.Olric
	gcRevokedUsersTopic    *olric.DTopic
	userGCMutex            sync.RWMutex
}

func (p *gitClientProviderImpl) GetUserClient(integration view.GitIntegrationType, userId string) (client.GitClient, error) {
	//todo check if project's integration type is supported on project creation
	if integration != view.GitlabIntegration {
		return nil, fmt.Errorf("unsupported integration type: %s", integration)
	}

	var err error

	entity, err := p.repo.GetUserApiKey(integration, userId)
	if err != nil {
		return nil, fmt.Errorf("unable to get api key for user %s and integration %s: %v", userId, integration, err.Error())
	}
	if entity == nil || entity.AccessToken == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ApiKeyNotFound,
			Message: exception.ApiKeyNotFoundMsg,
			Params:  map[string]interface{}{"user": userId, "integration": integration},
		}
	}

	var cl *client.GitClient
	if element, exists := p.gitlabClientUserCache.Peek(userId); exists {
		cl = element.(*client.GitClient)
	}
	if !entity.ExpiresAt.IsZero() {
		// we have a time limited token, need to check if it's close to expire or expired
		if time.Until(entity.ExpiresAt) < (5 * time.Minute) {
			// it's time to refresh the token
			var refreshError error
			var updatedToken string
			var updatedExpiresAt *time.Time
			updatedToken, updatedExpiresAt, refreshError = p.tokenExpirationHandler.TokenExpired(entity.UserId, entity.Integration)
			if refreshError != nil {
				if time.Until(entity.ExpiresAt) < 0 {
					// the token is not valid anymore, we can't create the client
					return nil, refreshError
				} else {
					if cl != nil {
						// we should treat the err as warning if the token is still valid and we have cache
						log.Warnf("GetUserClient: failed to refresh expiring gitlab token (but client cache is still valid): %v", refreshError)
						return *cl, nil
					} else {
						// we have no cache, but the token should still be valid, so we can create the client using existing token and expiresAt
						updatedToken = entity.AccessToken
						updatedExpiresAt = &entity.ExpiresAt
						log.Warnf("GetUserClient: failed to refresh expiring gitlab token for user %s (and no client cached): %v", entity.UserId, refreshError)
					}
				}
			}
			newGitClient, err := client.NewGitlabOauthClient(p.gitlabConfiguration.BaseUrl, updatedToken, userId, p.tokenRevocationHandler, p.tokenExpirationHandler)
			if err != nil {
				return nil, fmt.Errorf("failed to init gitlab client: %v", err)
			}
			cl = &newGitClient
			if updatedExpiresAt == nil || updatedExpiresAt.IsZero() {
				p.gitlabClientUserCache.Store(userId, cl)
			} else {
				p.gitlabClientUserCache.StoreWithTTL(userId, cl, time.Until(*updatedExpiresAt))
			}
			return newGitClient, nil
		}
	}

	if cl == nil {
		newGitClient, err := client.NewGitlabOauthClient(p.gitlabConfiguration.BaseUrl, entity.AccessToken, userId, p.tokenRevocationHandler, p.tokenExpirationHandler)
		if err != nil {
			return nil, fmt.Errorf("failed to init gitlab client: %v", err)
		}
		cl = &newGitClient
		if entity.ExpiresAt.IsZero() {
			p.gitlabClientUserCache.Store(userId, cl)
		} else {
			p.gitlabClientUserCache.StoreWithTTL(userId, cl, time.Until(entity.ExpiresAt))
		}
	}
	return *cl, nil
}

// GetUserClientWithNewKey In this case integration entity doesn't exist yet
func (p *gitClientProviderImpl) GetUserClientWithNewKey(integration view.GitIntegrationType, userId string, token string) (client.GitClient, error) {
	if integration != view.GitlabIntegration {
		return nil, fmt.Errorf("unsupported integration type: %s", integration)
	}

	cl, err := client.NewGitlabOauthClient(p.gitlabConfiguration.BaseUrl, token, userId, p.tokenRevocationHandler, p.tokenExpirationHandler)
	if err != nil {
		return nil, err
	}
	p.gitlabClientUserCache.Store(userId, &cl)
	return cl, nil
}

func (p *gitClientProviderImpl) GetConfiguration(integration view.GitIntegrationType) (*client.GitClientConfiguration, error) {
	switch integration {
	case view.GitlabIntegration:
		return &p.gitlabConfiguration, nil
	default:
		return nil, fmt.Errorf("unknown integration type: %s, unable to get configuration", integration)
	}
}

func (p *gitClientProviderImpl) UpdateUserCache(integration view.GitIntegrationType, userId string, expiresAt time.Time) error {
	var err error

	entity, err := p.repo.GetUserApiKey(integration, userId)
	if err != nil {
		return fmt.Errorf("unable to get api key for user %s and integration %s: %v", userId, integration, err.Error())
	}
	if entity == nil || entity.AccessToken == "" {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ApiKeyNotFound,
			Message: exception.ApiKeyNotFoundMsg,
			Params:  map[string]interface{}{"user": userId, "integration": integration},
		}
	}

	cl, err := client.NewGitlabOauthClient(p.gitlabConfiguration.BaseUrl, entity.AccessToken, userId, p.tokenRevocationHandler, p.tokenExpirationHandler)
	if err != nil {
		return err
	}
	p.gitlabClientUserCache.StoreWithTTL(userId, &cl, time.Until(expiresAt))
	return nil
}
