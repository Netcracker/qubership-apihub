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
	"encoding/json"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	"time"

	"sync"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/buraksezer/olric"
	log "github.com/sirupsen/logrus"
)

func NewPublishNotificationService(op cache.OlricProvider) PublishNotificationService {
	trh := publishNotificationServiceImpl{
		op:        op,
		isReadyWg: sync.WaitGroup{},
	}
	trh.isReadyWg.Add(1)
	utils.SafeAsync(func() {
		trh.initVersionPublishedDTopic()
	})
	return &trh
}

type PublishNotificationService interface {
	SendNotification(packageId string, version string, revision int) error
}

type publishNotificationServiceImpl struct {
	op                    cache.OlricProvider
	olricC                *olric.Olric
	versionPublishedTopic *olric.DTopic
	isReadyWg             sync.WaitGroup
}

const VersionPublishedTopicName = "version-published"

func (t *publishNotificationServiceImpl) SendNotification(packageId string, version string, revision int) error {
	t.isReadyWg.Wait()

	if t.versionPublishedTopic == nil {
		return fmt.Errorf("failed to publish message to %s DTopic since it's not initialized", VersionPublishedTopicName)
	}

	msg := view.PublishNotification{
		EventId:   uuid.NewString(),
		PackageId: packageId,
		Version:   version,
		Revision:  revision,
	}

	jsonMsg, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	err = t.versionPublishedTopic.Publish(string(jsonMsg))
	if err != nil {
		log.Errorf("Failed to send 'version published' event: %s", err)
		return err
	}
	return nil
}

func (t *publishNotificationServiceImpl) initVersionPublishedDTopic() {
	var err error
	for attempt := 1; attempt < 4; attempt++ {
		t.olricC = t.op.Get()
		topicName := VersionPublishedTopicName
		t.versionPublishedTopic, err = t.olricC.NewDTopic(topicName, 10000, olric.UnorderedDelivery)
		if err != nil {
			log.Errorf("Failed to create DTopic %s (attempt %d): %s", VersionPublishedTopicName, attempt, err.Error())
			time.Sleep(10 * time.Second)
			continue
		}
		break
	}
	t.isReadyWg.Done()
}
