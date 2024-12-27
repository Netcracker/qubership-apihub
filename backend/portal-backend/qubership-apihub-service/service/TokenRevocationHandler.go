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
	"net/http"
	"sync"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/buraksezer/olric"
	log "github.com/sirupsen/logrus"
)

func NewTokenRevocationHandler(intRepo repository.GitIntegrationRepository, op cache.OlricProvider) client.TokenRevocationHandler {
	trh := tokenRevocationHandlerImpl{
		intRepo:   intRepo,
		op:        op,
		isReadyWg: sync.WaitGroup{},
	}
	trh.isReadyWg.Add(1)
	utils.SafeAsync(func() {
		trh.initGCRevokedUsersDTopic()
	})
	return &trh
}

type tokenRevocationHandlerImpl struct {
	intRepo             repository.GitIntegrationRepository
	op                  cache.OlricProvider
	olricC              *olric.Olric
	gcRevokedUsersTopic *olric.DTopic
	isReadyWg           sync.WaitGroup
}

const failedRefreshThreshold = 5

func (t *tokenRevocationHandlerImpl) TokenRevoked(userId string, integrationType view.GitIntegrationType) error {
	key, err := t.intRepo.GetUserApiKey(integrationType, userId)
	if err != nil {
		return err
	}
	key.IsRevoked = true

	_, err = t.intRepo.SaveUserApiKey(*key)
	if err != nil {
		return err
	}

	err = t.PublishToGCRevokedUsersTopic(userId)
	if err != nil {
		return err
	}

	return &exception.CustomError{
		Status:  http.StatusFailedDependency,
		Code:    exception.IntegrationTokenRevoked,
		Message: exception.IntegrationTokenRevokedMsg,
		Params:  map[string]interface{}{"integration": integrationType},
	}
}

func (t *tokenRevocationHandlerImpl) AuthFailed(userId string, integrationType view.GitIntegrationType) error {
	key, err := t.intRepo.GetUserApiKey(integrationType, userId)
	if err != nil {
		return err
	}
	key.IsRevoked = true

	_, err = t.intRepo.SaveUserApiKey(*key)
	if err != nil {
		return err
	}

	err = t.PublishToGCRevokedUsersTopic(userId)
	if err != nil {
		return err
	}
	return &exception.CustomError{
		Status:  http.StatusFailedDependency,
		Code:    exception.IntegrationTokenAuthFailed,
		Message: exception.IntegrationTokenAuthFailedMsg,
	}
}

func (t *tokenRevocationHandlerImpl) initGCRevokedUsersDTopic() {
	var err error
	t.olricC = t.op.Get()
	topicName := GCRevokedUsersTopicName
	t.gcRevokedUsersTopic, err = t.olricC.NewDTopic(topicName, 10000, 1)
	if err != nil {
		log.Errorf("Failed to create DTopic: %s", err.Error())
	}
}

func (t *tokenRevocationHandlerImpl) PublishToGCRevokedUsersTopic(userId string) error {
	err := t.gcRevokedUsersTopic.Publish(userId)
	if err != nil {
		log.Errorf("Error while publishing the user git client data: %s", err)
		return err
	}
	return nil
}
