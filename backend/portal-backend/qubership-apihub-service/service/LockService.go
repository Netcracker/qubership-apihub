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
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	log "github.com/sirupsen/logrus"
)

const (
	defaultLeaseSeconds             = 60
	defaultHeartbeatIntervalSeconds = 20
	maxRetries                      = 3
)

type LockLostEvent struct {
	LockName   string
	InstanceId string
	Reason     string
}

type LockOptions struct {
	LeaseSeconds             int
	HeartbeatIntervalSeconds int
	NotifyOnLoss             bool
}

type LockService interface {
	AcquireLock(ctx context.Context, lockName string, options LockOptions) (bool, <-chan LockLostEvent, error)
	ReleaseLock(ctx context.Context, lockName string) error
}

type lockServiceImpl struct {
	lockRepo           repository.LockRepository
	instanceId         string
	mu                 sync.Mutex
	heartbeatCancelers map[string]context.CancelFunc
	lockLostChannels   map[string]chan LockLostEvent
}

func NewLockService(lockRepo repository.LockRepository, instanceId string) LockService {
	return &lockServiceImpl{
		lockRepo:           lockRepo,
		instanceId:         instanceId,
		heartbeatCancelers: make(map[string]context.CancelFunc),
		lockLostChannels:   make(map[string]chan LockLostEvent),
	}
}

func (s *lockServiceImpl) AcquireLock(ctx context.Context, lockName string, options LockOptions) (bool, <-chan LockLostEvent, error) {
	if ctx == nil {
		return false, nil, fmt.Errorf("context cannot be nil")
	}

	if lockName == "" {
		return false, nil, fmt.Errorf("lock name cannot be empty")
	}

	options = s.normalizeOptions(options)

	acquired, err := s.lockRepo.TryAcquireLock(ctx, lockName, s.instanceId, options.LeaseSeconds)
	if err != nil || !acquired {
		return acquired, nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if cancel, exists := s.heartbeatCancelers[lockName]; exists {
		cancel()
	}

	heartbeatCtx, cancel := context.WithCancel(ctx)
	s.heartbeatCancelers[lockName] = cancel

	var notifyChan chan LockLostEvent
	if options.NotifyOnLoss {
		notifyChan = make(chan LockLostEvent, 1)
		s.lockLostChannels[lockName] = notifyChan
	}

	utils.SafeAsync(func() {
		s.runHeartbeat(heartbeatCtx, lockName, options)
	})

	log.Debugf("Acquired lock %s with lease %ds and heartbeat %ds",
		lockName, options.LeaseSeconds, options.HeartbeatIntervalSeconds)
	return true, notifyChan, nil
}

func (s *lockServiceImpl) normalizeOptions(options LockOptions) LockOptions {
	if options.LeaseSeconds <= 0 {
		options.LeaseSeconds = defaultLeaseSeconds
	}
	if options.HeartbeatIntervalSeconds <= 0 {
		options.HeartbeatIntervalSeconds = defaultHeartbeatIntervalSeconds
	}

	if options.HeartbeatIntervalSeconds >= options.LeaseSeconds {
		options.HeartbeatIntervalSeconds = options.LeaseSeconds / 3
	}

	return options
}

func (s *lockServiceImpl) ReleaseLock(ctx context.Context, lockName string) error {
	if ctx == nil {
		return fmt.Errorf("context cannot be nil")
	}

	if lockName == "" {
		return fmt.Errorf("lock name cannot be empty")
	}

	s.cleanupLockResources(lockName)

	lockInfo, err := s.lockRepo.GetLockInfo(ctx, lockName)
	if err != nil {
		if err == repository.ErrLockNotFound {
			log.Debugf("Lock %s not found, considering it released", lockName)
			return nil
		}
		return fmt.Errorf("failed to get lock info: %w", err)
	}

	if lockInfo.InstanceId != s.instanceId {
		log.Debugf("Lock %s is owned by instance %s, not by %s",
			lockName, lockInfo.InstanceId, s.instanceId)
		return nil
	}

	return s.tryReleaseLock(ctx, lockName, lockInfo)
}

func (s *lockServiceImpl) cleanupLockResources(lockName string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if cancel, exists := s.heartbeatCancelers[lockName]; exists {
		cancel()
		delete(s.heartbeatCancelers, lockName)
	}

	if notifyChan, exists := s.lockLostChannels[lockName]; exists {
		close(notifyChan)
		delete(s.lockLostChannels, lockName)
	}
}

func (s *lockServiceImpl) tryReleaseLock(ctx context.Context, lockName string, lockInfo *entity.LockEntity) error {
	var err error
	for i := 0; i < maxRetries; i++ {
		err = s.lockRepo.ReleaseLock(ctx, lockName, s.instanceId, lockInfo.Version)
		if err == nil {
			log.Debugf("Released lock %s", lockName)
			return nil
		}

		if s.isNonRetryableError(err) {
			return err
		}

		log.Warnf("Failed to release lock %s (attempt %d/%d): %v",
			lockName, i+1, maxRetries, err)

		if err := s.waitWithBackoff(ctx, i); err != nil {
			return fmt.Errorf("failed to wait with backoff: %w", err)
		}
	}

	return fmt.Errorf("failed to release lock after %d attempts: %w", maxRetries, err)
}

func (s *lockServiceImpl) isNonRetryableError(err error) bool {
	return err == repository.ErrLockNotFound ||
		err == repository.ErrLockExpired ||
		err == repository.ErrVersionMismatch ||
		err == repository.ErrLockAlreadyAcquired
}

func (s *lockServiceImpl) waitWithBackoff(ctx context.Context, attempt int) error {
	backoff := 100 * time.Duration(attempt+1)
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(backoff * time.Millisecond):
		return nil
	}
}

func (s *lockServiceImpl) sendLockLostNotification(lockName string, reason string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	notifyChan, exists := s.lockLostChannels[lockName]
	if !exists {
		return
	}

	select {
	case notifyChan <- LockLostEvent{
		LockName:   lockName,
		InstanceId: s.instanceId,
		Reason:     reason,
	}:
		log.Debugf("Sent lock lost notification for %s: %s", lockName, reason)
	default:
		log.Warnf("Failed to send lock lost notification for %s: channel buffer full", lockName)
	}

	close(notifyChan)
	delete(s.lockLostChannels, lockName)
}

func (s *lockServiceImpl) runHeartbeat(ctx context.Context, lockName string, options LockOptions) {
	ticker := time.NewTicker(time.Duration(options.HeartbeatIntervalSeconds) * time.Second)
	defer ticker.Stop()

	defer func() {
		s.mu.Lock()
		if cancel, exists := s.heartbeatCancelers[lockName]; exists {
			cancel()
			delete(s.heartbeatCancelers, lockName)
		}
		s.mu.Unlock()
		log.Debugf("Heartbeat for lock %s stopped", lockName)
	}()

	for {
		select {
		case <-ctx.Done():
			log.Tracef("Stopping heartbeat for lock %s due to context cancellation", lockName)
			return

		case <-ticker.C:
			if err := s.performHeartbeat(ctx, lockName, options); err != nil {
				return
			}
		}
	}
}

func (s *lockServiceImpl) performHeartbeat(ctx context.Context, lockName string, options LockOptions) error {
	lockInfo, err := s.lockRepo.GetLockInfo(ctx, lockName)
	if err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		var reason string
		if err == repository.ErrLockNotFound {
			log.Debugf("Lock %s no longer exists, stopping heartbeat", lockName)
			reason = "lock no longer exists"
		} else {
			log.Errorf("Failed to get lock info for %s: %v", lockName, err)
			reason = "failed to get lock info: " + err.Error()
		}
		if options.NotifyOnLoss {
			s.sendLockLostNotification(lockName, reason)
		}
		return fmt.Errorf(reason)
	}

	if lockInfo != nil && lockInfo.InstanceId != s.instanceId {
		log.Debugf("Lock %s is now owned by instance %s, stopping our heartbeat",
			lockName, lockInfo.InstanceId)

		if options.NotifyOnLoss {
			s.sendLockLostNotification(lockName, "lock acquired by another instance")
		}
		return fmt.Errorf("lock acquired by another instance")
	}

	if lockInfo != nil {
		if err := s.refreshLock(ctx, lockInfo, options.LeaseSeconds); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}

			log.Errorf("Failed to refresh lock %s: %v", lockName, err)

			if options.NotifyOnLoss {
				s.sendLockLostNotification(lockName, "failed to refresh lock: "+err.Error())
			}
			return fmt.Errorf("failed to refresh lock: %w", err)
		}
		log.Tracef("Refreshed lock %s", lockName)
	}

	return nil
}

func (s *lockServiceImpl) refreshLock(ctx context.Context, lockInfo *entity.LockEntity, leaseSeconds int) error {
	if ctx == nil {
		return fmt.Errorf("context cannot be nil")
	}

	var err error
	for i := 0; i < maxRetries; i++ {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		err = s.lockRepo.RefreshLock(ctx, lockInfo.Name, s.instanceId, leaseSeconds, lockInfo.Version)
		if err == nil {
			return nil
		}

		if s.isNonRetryableError(err) {
			return err
		}

		log.Warnf("Failed to refresh lock %s (attempt %d/%d): %v",
			lockInfo.Name, i+1, maxRetries, err)

		if err = s.waitWithBackoff(ctx, i); err != nil {
			return fmt.Errorf("failed to wait with backoff: %w", err)
		}
	}

	return fmt.Errorf("failed to refresh lock after %d attempts: %w", maxRetries, err)
}
