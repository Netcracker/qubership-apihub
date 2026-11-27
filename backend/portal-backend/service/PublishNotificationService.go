package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
	"github.com/google/uuid"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/cache"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/utils"

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
	utils.SafeAsync(func() {
		trh.watchClusterMembers()
	})
	return &trh
}

const membershipPollInterval = 5 * time.Second

// subscriberPodMarker identifies subscriber (api-linter-service) pods in logs only; it does not change behavior.
const subscriberPodMarker = "linter"

// watchClusterMembers polls cluster membership and logs joins and leaves with pod info,
// so it is visible whether subscriber pods are present when topic delivery stops working.
func (t *publishNotificationServiceImpl) watchClusterMembers() {
	<-t.ready

	previous, err := t.op.ClusterMembers()
	if err != nil {
		log.Errorf("PublishNotificationService: failed to read initial cluster membership: %v", err)
	} else {
		log.Infof("PublishNotificationService: initial cluster membership, %d member(s): %s", len(previous), describeMembers(previous))
	}

	ticker := time.NewTicker(membershipPollInterval)
	defer ticker.Stop()
	for range ticker.C {
		current, err := t.op.ClusterMembers()
		if err != nil {
			log.Errorf("PublishNotificationService: failed to read cluster membership, will retry in %s: %v", membershipPollInterval, err)
			continue
		}
		if previous == nil {
			previous = current
			continue
		}

		changed := false
		for id, m := range previous {
			if _, ok := current[id]; !ok {
				changed = true
				log.Warnf("PublishNotificationService: %s left cluster (%s); events for topic %s will not reach it until it rejoins",
					memberRole(m), m.String(), VersionPublishedTopicName)
			}
		}
		for id, m := range current {
			if _, ok := previous[id]; !ok {
				changed = true
				log.Infof("PublishNotificationService: %s joined cluster (%s)", memberRole(m), m.String())
			}
		}
		if changed {
			subscribers := 0
			for _, m := range current {
				if isSubscriber(m) {
					subscribers++
				}
			}
			log.Infof("PublishNotificationService: cluster membership changed, %d member(s), %d subscriber pod(s) present: %s",
				len(current), subscribers, describeMembers(current))
			if subscribers == 0 {
				log.Warnf("PublishNotificationService: no subscriber pod (name containing %q) is in the cluster, topic %s events will not be consumed",
					subscriberPodMarker, VersionPublishedTopicName)
			}
		}
		previous = current
	}
}

func isSubscriber(m cache.ClusterMember) bool {
	return strings.Contains(m.PodName(), subscriberPodMarker)
}

func memberRole(m cache.ClusterMember) string {
	if isSubscriber(m) {
		return "subscriber pod " + m.PodName()
	}
	return "pod " + m.PodName()
}

func describeMembers(members map[uint64]cache.ClusterMember) string {
	items := make([]string, 0, len(members))
	for _, m := range members {
		items = append(items, "{"+m.String()+"}")
	}
	sort.Strings(items)
	return strings.Join(items, " ")
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
