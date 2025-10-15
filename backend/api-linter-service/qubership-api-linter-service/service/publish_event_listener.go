package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/buraksezer/olric"
	log "github.com/sirupsen/logrus"
	"sync"
)

type PublishEventListener interface {
	Start()
	listen(message olric.DTopicMessage)
}

func NewPublishEventListener(op client.OlricProvider, validationService ValidationService) PublishEventListener {
	pel := publishEventListenerImpl{
		op:                op,
		validationService: validationService,
		isReadyWg:         sync.WaitGroup{},
	}
	return &pel
}

type publishEventListenerImpl struct {
	op                    client.OlricProvider
	validationService     ValidationService
	versionPublishedTopic *olric.DTopic
	isReadyWg             sync.WaitGroup
}

func (p *publishEventListenerImpl) Start() {
	p.isReadyWg.Add(1)
	utils.SafeAsync(func() {
		p.initVersionPublishedDTopic()
	})
}

const VersionPublishedTopicName = "version-published"

func (p *publishEventListenerImpl) listen(message olric.DTopicMessage) {
	str, ok := message.Message.(string)
	if !ok {
		log.Warnf("PublishEventListener.listen: unexpected event %+v, will not be processed", message.Message)
		return
	}

	var notification view.PublishNotification

	err := json.Unmarshal([]byte(str), &notification)
	if err != nil {
		log.Errorf("PublishEventListener.listen: error unmarshalling publish notification: %v", err)
		return
	}

	ctx := secctx.MakeSysadminContext(context.Background())

	version := fmt.Sprintf("%s@%d", notification.Version, notification.Revision)

	taskId, err := p.validationService.ValidateVersion(ctx, notification.PackageId, version, notification.EventId)
	if err != nil {
		processed := false
		var customError *exception.CustomError
		if errors.As(err, &customError) {
			if customError.Code == exception.DuplicateEvent {
				log.Infof("PublishEventListener.listen: event with id=%s is already processed", notification.EventId)
				processed = true
			}
			if customError.Code == exception.LintNotSupported {
				log.Infof("PublishEventListener.listen: event with id=%s is for not supported package kind, skipping it", notification.EventId)
				processed = true
			}
		}
		if !processed {
			log.Errorf("PublishEventListener.listen: error in version %+v validation: %v", "", err)
		}
		return
	}
	log.Infof("Lint task with id=%s is created for event %+v", taskId, notification)
}

func (p *publishEventListenerImpl) initVersionPublishedDTopic() {
	var err error
	topicName := VersionPublishedTopicName
	p.versionPublishedTopic, err = p.op.Get().NewDTopic(topicName, 10000, olric.UnorderedDelivery)
	if err != nil {
		log.Errorf("Failed to create DTopic %s: %s", VersionPublishedTopicName, err.Error())
	}

	_, err = p.versionPublishedTopic.AddListener(p.listen)
	if err != nil {
		log.Errorf("Failed to add listener to DTopic %s: %s", VersionPublishedTopicName, err.Error())
	}

	p.isReadyWg.Done()
}
