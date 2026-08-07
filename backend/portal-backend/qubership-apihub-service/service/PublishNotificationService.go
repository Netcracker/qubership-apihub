package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/buraksezer/olric"
	log "github.com/sirupsen/logrus"
)

func NewPublishNotificationService(op cache.OlricProvider) PublishNotificationService {
	trh := publishNotificationServiceImpl{
		op:    op,
		ready: make(chan struct{}),
	}
	utils.SafeAsync(func() {
		trh.initVersionPublishedDTopic()
	})
	return &trh
}

type PublishNotificationService interface {
	SendNotification(ctx context.Context, packageId string, version string, revision int) error
}

type publishNotificationServiceImpl struct {
	op                    cache.OlricProvider
	olricC                *olric.Olric
	versionPublishedTopic *olric.DTopic
	ready                 chan struct{}
}

const VersionPublishedTopicName = "version-published"

func (t *publishNotificationServiceImpl) SendNotification(ctx context.Context, packageId string, version string, revision int) error {
	select {
	case <-t.ready:
	case <-ctx.Done():
		return ctx.Err()
	}

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
	close(t.ready)
}
