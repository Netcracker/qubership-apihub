package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/secctx"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	"github.com/buraksezer/olric"
	log "github.com/sirupsen/logrus"
)

type PublishEventListener interface {
	Start()
	listen(message olric.DTopicMessage)
}

func NewPublishEventListener(op client.OlricProvider, validationService ValidationService, membershipPollInterval time.Duration) PublishEventListener {
	pel := publishEventListenerImpl{
		op:                     op,
		validationService:      validationService,
		membershipPollInterval: membershipPollInterval,
		isReadyWg:              sync.WaitGroup{},
	}
	return &pel
}

type publishEventListenerImpl struct {
	op                     client.OlricProvider
	validationService      ValidationService
	membershipPollInterval time.Duration
	versionPublishedTopic  *olric.DTopic
	listenerID             uint64
	isReadyWg              sync.WaitGroup
}

func (p *publishEventListenerImpl) Start() {
	log.Infof("PublishEventListener: starting")
	p.isReadyWg.Add(1)
	utils.SafeAsync(func() {
		p.initVersionPublishedDTopic()
	})
	utils.SafeAsync(func() {
		log.Infof("PublishEventListener: watcher goroutine started, waiting for DTopic init to complete")
		p.isReadyWg.Wait()
		log.Infof("PublishEventListener: DTopic init complete, entering node-event watch loop")
		p.watchAndResubscribe()
	})
}

const VersionPublishedTopicName = "version-published"

func (p *publishEventListenerImpl) listen(message olric.DTopicMessage) {
	log.Infof("PublishEventListener.listen: raw message received (publishedAt=%d)", message.PublishedAt)
	str, ok := message.Message.(string)
	if !ok {
		log.Warnf("PublishEventListener.listen: unexpected event %+v, will not be processed", message.Message)
		return
	}
	log.Infof("PublishEventListener.listen: message payload received")

	var notification view.PublishNotification

	err := json.Unmarshal([]byte(str), &notification)
	if err != nil {
		log.Errorf("PublishEventListener.listen: error unmarshalling publish notification: %v", err)
		return
	}

	ctx := secctx.MakeSysadminContext(context.Background())

	version := fmt.Sprintf("%s@%d", notification.Version, notification.Revision)

	taskId, err := p.validationService.ValidateVersion(ctx, notification.PackageId, version, notification.EventId, false)
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
	log.Infof("PublishEventListener: creating DTopic %s", VersionPublishedTopicName)
	var err error
	p.versionPublishedTopic, err = p.op.Get().NewDTopic(VersionPublishedTopicName, 10000, olric.UnorderedDelivery)
	if err != nil {
		log.Errorf("Failed to create DTopic %s: %s", VersionPublishedTopicName, err.Error())
		p.isReadyWg.Done()
		return
	}
	log.Infof("PublishEventListener: DTopic %s created, adding listener", VersionPublishedTopicName)

	p.listenerID, err = p.versionPublishedTopic.AddListener(p.listen)
	if err != nil {
		log.Errorf("Failed to add listener to DTopic %s: %s", VersionPublishedTopicName, err.Error())
	} else {
		log.Infof("PublishEventListener: listener registered on DTopic %s (listenerID=%d)", VersionPublishedTopicName, p.listenerID)
	}

	p.isReadyWg.Done()
}

// watchAndResubscribe polls cluster membership because Olric overwrites the memberlist event delegate on start.
// A peer that rejoins gets a new member ID, so any ID absent from the previous snapshot means a join.
func (p *publishEventListenerImpl) watchAndResubscribe() {
	previous, err := p.op.ClusterMembers()
	if err != nil {
		log.Errorf("PublishEventListener: failed to read initial cluster membership: %v", err)
	} else {
		for _, m := range previous {
			log.Infof("PublishEventListener: initial cluster member %s (id=%d, startedAt=%s)", m.Name, m.ID, m.StartedAt().Format(time.RFC3339))
		}
	}

	ticker := time.NewTicker(p.membershipPollInterval)
	defer ticker.Stop()

	// departed remembers members that left, so a returning member with the same ID can be told apart from a restarted one.
	departed := make(map[uint64]client.ClusterMember)

	for range ticker.C {
		current, err := p.op.ClusterMembers()
		if err != nil {
			log.Errorf("PublishEventListener: failed to read cluster membership, will retry in %s: %v", p.membershipPollInterval, err)
			continue
		}
		if previous == nil {
			previous = current
			continue
		}

		joined, left := diffMembers(previous, current)
		previous = current

		for id, m := range left {
			departed[id] = m
			log.Warnf("PublishEventListener: peer %s left cluster (id=%d, startedAt=%s), topic %s delivery is interrupted until it rejoins",
				m.Name, m.ID, m.StartedAt().Format(time.RFC3339), VersionPublishedTopicName)
		}
		for id, m := range joined {
			kind := memberKindNewProcess
			if _, ok := departed[id]; ok {
				kind = memberKindSameProcess
				delete(departed, id)
			}
			log.Infof("PublishEventListener: peer %s joined cluster (id=%d, startedAt=%s, %s), re-subscribing to topic %s",
				m.Name, m.ID, m.StartedAt().Format(time.RFC3339), kind, VersionPublishedTopicName)
		}
		if len(joined) > 0 {
			p.resubscribe()
		}
	}
}

const (
	// The member returned with the ID it left with, so its process did not restart: a network interruption.
	memberKindSameProcess = "same process returned, network interruption"
	// The member has an ID not seen before, so its process was started again: restart, rolling update or scale-out.
	memberKindNewProcess = "new process, restart or scale-out"
)

// diffMembers returns members present only in current (joined) and only in previous (left).
func diffMembers(previous, current map[uint64]client.ClusterMember) (joined, left map[uint64]client.ClusterMember) {
	joined = make(map[uint64]client.ClusterMember)
	left = make(map[uint64]client.ClusterMember)
	for id, m := range current {
		if _, ok := previous[id]; !ok {
			joined[id] = m
		}
	}
	for id, m := range previous {
		if _, ok := current[id]; !ok {
			left[id] = m
		}
	}
	return joined, left
}

func (p *publishEventListenerImpl) resubscribe() {
	log.Infof("PublishEventListener: resubscribe started (currentListenerID=%d)", p.listenerID)
	if p.versionPublishedTopic != nil && p.listenerID != 0 {
		log.Infof("PublishEventListener: removing stale listener (listenerID=%d)", p.listenerID)
		if err := p.versionPublishedTopic.RemoveListener(p.listenerID); err != nil {
			log.Warnf("PublishEventListener: failed to remove stale listener from topic %s: %v", VersionPublishedTopicName, err)
		} else {
			log.Infof("PublishEventListener: stale listener removed (listenerID=%d)", p.listenerID)
		}
	}

	log.Infof("PublishEventListener: recreating DTopic %s", VersionPublishedTopicName)
	var err error
	p.versionPublishedTopic, err = p.op.Get().NewDTopic(VersionPublishedTopicName, 10000, olric.UnorderedDelivery)
	if err != nil {
		log.Errorf("PublishEventListener: failed to recreate DTopic %s on peer join: %v", VersionPublishedTopicName, err)
		p.listenerID = 0
		return
	}
	log.Infof("PublishEventListener: DTopic %s recreated, re-adding listener", VersionPublishedTopicName)

	p.listenerID, err = p.versionPublishedTopic.AddListener(p.listen)
	if err != nil {
		log.Errorf("PublishEventListener: failed to re-add listener to DTopic %s on peer join: %v", VersionPublishedTopicName, err)
	} else {
		log.Infof("PublishEventListener: listener re-registered on DTopic %s (listenerID=%d)", VersionPublishedTopicName, p.listenerID)
	}
}
