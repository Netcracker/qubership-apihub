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
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/buraksezer/olric"
	log "github.com/sirupsen/logrus"
)

func NewTokenExpirationHandler(intRepo repository.GitIntegrationRepository, op cache.OlricProvider, systemInfoService SystemInfoService) client.TokenExpirationHandler {
	handler := tokenExpirationHandlerImpl{
		intRepo:           intRepo,
		op:                op,
		isReadyWg:         sync.WaitGroup{},
		systemInfoService: systemInfoService,
		refreshMutex:      &sync.RWMutex{},
	}
	handler.isReadyWg.Add(1)
	utils.SafeAsync(func() {
		handler.initGCRevokedUsersDTopic()
	})
	return &handler
}

type tokenExpirationHandlerImpl struct {
	intRepo             repository.GitIntegrationRepository
	op                  cache.OlricProvider
	olricC              *olric.Olric
	gcRevokedUsersTopic *olric.DTopic
	isReadyWg           sync.WaitGroup
	systemInfoService   SystemInfoService
	refreshMutex        *sync.RWMutex
}

func (t *tokenExpirationHandlerImpl) TokenExpired(userId string, integrationType view.GitIntegrationType) (string, *time.Time, error) {
	userIntegration, err := t.intRepo.GetUserApiKey(integrationType, userId)
	if err != nil {
		return "", nil, err
	}
	if userIntegration == nil {
		return "", nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: fmt.Sprintf("Failed to refresh gitlab access token: integration %v not found for user %v", integrationType, userId),
		}
	}
	if userIntegration.RefreshToken == "" || userIntegration.RedirectUri == "" {
		userIntegration.IsRevoked = true
		_, err = t.intRepo.SaveUserApiKey(*userIntegration)
		if err != nil {
			return "", nil, err
		}
		err = t.PublishToGCRevokedUsersTopic(userId)
		if err != nil {
			return "", nil, err
		}
		return "", nil, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.IntegrationTokenRevoked,
			Message: exception.IntegrationTokenRevokedMsg,
			Params:  map[string]interface{}{"integration": integrationType},
		}
	}

	t.refreshMutex.Lock()
	defer t.refreshMutex.Unlock()

	client := makeHttpClient()

	data := url.Values{}
	data.Set("client_id", t.systemInfoService.GetClientID())
	data.Set("client_secret", t.systemInfoService.GetClientSecret())
	data.Set("redirect_uri", userIntegration.RedirectUri)
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", userIntegration.RefreshToken)
	encodedData := data.Encode()
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/oauth/token", t.systemInfoService.GetGitlabUrl()), strings.NewReader(encodedData))
	if err != nil {
		return "", nil, fmt.Errorf("failed to create http request: %v", err.Error())
	}
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Add("Content-Length", strconv.Itoa(len(data.Encode())))
	response, err := client.Do(req)
	if err != nil {
		return "", nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: fmt.Sprintf("Failed to refresh gitlab access token: gitlab refresh request failed: %v", err),
		}
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return "", nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: fmt.Sprintf("Failed to refresh gitlab access token: response code = %d, failed to read response body: %v", response.StatusCode, err),
		}
	}
	var oauthTokenResponse view.OAuthAccessResponse
	if err := json.Unmarshal(body, &oauthTokenResponse); err != nil {
		return "", nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: fmt.Sprintf("Failed to refresh gitlab access token: failed to unmarshal gitlab response: %v", err),
		}
	}

	if oauthTokenResponse.Error != "" || response.StatusCode != http.StatusOK {
		actualUserIntegration, err := t.intRepo.GetUserApiKey(integrationType, userId)
		if err != nil {
			return "", nil, err
		}
		if userIntegration == nil {
			return "", nil, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: fmt.Sprintf("Failed to refresh gitlab access token: integration %v not found for user %v", integrationType, userId),
			}
		}
		//check if refresh token has already been refreshed by other request
		if actualUserIntegration.RefreshToken != userIntegration.RefreshToken {
			return actualUserIntegration.AccessToken, &actualUserIntegration.ExpiresAt, nil
		}

		if actualUserIntegration.FailedRefreshAttempts >= failedRefreshThreshold {
			userIntegration.IsRevoked = true
			_, err = t.intRepo.SaveUserApiKey(*userIntegration)
			if err != nil {
				return "", nil, err
			}
			err = t.PublishToGCRevokedUsersTopic(userId)
			if err != nil {
				return "", nil, err
			}
			return "", nil, &exception.CustomError{
				Status:  http.StatusFailedDependency,
				Code:    exception.IntegrationTokenRevoked,
				Message: exception.IntegrationTokenRevokedMsg,
				Params:  map[string]interface{}{"integration": integrationType},
			}
		}
		err = t.intRepo.AddFailedRefreshAttempt(integrationType, userId)
		if err != nil {
			return "", nil, err
		}
		return "", nil, fmt.Errorf("gitlab returned error to refresh request: status code = %d, error = %s", response.StatusCode, oauthTokenResponse.Error)
	}
	userIntegration.RefreshToken = oauthTokenResponse.RefreshToken
	userIntegration.AccessToken = oauthTokenResponse.AccessToken
	userIntegration.ExpiresAt = view.GetTokenExpirationDate(oauthTokenResponse.ExpiresIn)
	userIntegration.FailedRefreshAttempts = 0

	_, err = t.intRepo.SaveUserApiKey(*userIntegration)
	if err != nil {
		return "", nil, err
	}

	//remove user from cache to update refreshed token
	err = t.PublishToGCRevokedUsersTopic(userId)
	if err != nil {
		return "", nil, err
	}
	return userIntegration.AccessToken, &userIntegration.ExpiresAt, nil
}

func (t *tokenExpirationHandlerImpl) initGCRevokedUsersDTopic() {
	var err error
	t.olricC = t.op.Get()
	topicName := GCRevokedUsersTopicName
	t.gcRevokedUsersTopic, err = t.olricC.NewDTopic(topicName, 10000, 1)
	if err != nil {
		log.Errorf("Failed to create DTopic: %s", err.Error())
	}
}

func (t *tokenExpirationHandlerImpl) PublishToGCRevokedUsersTopic(userId string) error {
	err := t.gcRevokedUsersTopic.Publish(userId)
	if err != nil {
		log.Errorf("Error while publishing the user git client data: %s", err)
		return err
	}
	return nil
}

func makeHttpClient() *http.Client {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}
	return &cl
}
