package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

const (
	aiChatRetentionLockName = "ai_chat_retention_cleanup"

	aiChatCleanupLockLeaseSeconds     = 120
	aiChatCleanupLockHeartbeatSeconds = 30
)

var errAiChatLockBusy = errors.New("AI chat cleanup lock is held by another instance")

type AiChatCleanupService interface {
	StartChatRetentionJob(schedule string, retentionDays, pinnedForeverCount int) error
}

func NewAiChatCleanupService(repo repository.AiChatRepository, lockService LockService) AiChatCleanupService {
	return &aiChatCleanupServiceImpl{
		repo:        repo,
		lockService: lockService,
	}
}

type aiChatCleanupServiceImpl struct {
	repo        repository.AiChatRepository
	lockService LockService
	cron        *cron.Cron
	started     bool
}

func (s *aiChatCleanupServiceImpl) StartChatRetentionJob(schedule string, retentionDays, pinnedForeverCount int) error {
	if strings.TrimSpace(schedule) == "" {
		log.Info("[AiChatCleanup] chat retention job not scheduled (empty schedule)")
		return nil
	}
	job := &aiChatRetentionJob{
		repo:               s.repo,
		lockService:        s.lockService,
		retentionDays:      retentionDays,
		pinnedForeverCount: pinnedForeverCount,
	}
	return s.addJob(schedule, job, "ai-chat retention")
}

func (s *aiChatCleanupServiceImpl) addJob(schedule string, job cron.Job, label string) error {
	if !s.started {
		s.cron = cron.New(cron.WithLocation(time.UTC))
		s.cron.Start()
		s.started = true
	}
	wrapped := cron.NewChain(cron.SkipIfStillRunning(cron.DefaultLogger)).Then(job)
	if _, err := s.cron.AddJob(schedule, wrapped); err != nil {
		log.Warnf("[AiChatCleanup] %s job not scheduled (%s): %v", label, schedule, err)
		return err
	}
	log.Infof("[AiChatCleanup] %s job scheduled with %s", label, schedule)
	return nil
}

// withAiChatLock acquires the named distributed lock and runs body with a derived context.
// The body is responsible for honoring ctx cancellation.
func withAiChatLock(parentCtx context.Context, ls LockService, lockName string, body func(ctx context.Context) error) error {
	opts := LockOptions{
		LeaseSeconds:             aiChatCleanupLockLeaseSeconds,
		HeartbeatIntervalSeconds: aiChatCleanupLockHeartbeatSeconds,
		NotifyOnLoss:             true,
	}
	acquired, lostCh, err := ls.AcquireLock(parentCtx, lockName, opts)
	if err != nil {
		return err
	}
	if !acquired {
		return errAiChatLockBusy
	}
	bodyCtx, cancel := context.WithCancel(parentCtx)
	defer cancel()
	if lostCh != nil {
		go func() {
			ev, ok := <-lostCh
			if !ok {
				return
			}
			log.Warnf("[AiChatCleanup] lock %s lost: %s", ev.LockName, ev.Reason)
			cancel()
		}()
	}
	defer func() {
		releaseCtx, releaseCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer releaseCancel()
		if rErr := ls.ReleaseLock(releaseCtx, lockName); rErr != nil {
			log.Warnf("[AiChatCleanup] release lock %s: %v", lockName, rErr)
		}
	}()
	return body(bodyCtx)
}

// aiChatRetentionJob deletes expired non-pinned chats per user, while keeping the most recent
// pinnedForeverCount of them and never touching pinned ones.
type aiChatRetentionJob struct {
	repo               repository.AiChatRepository
	lockService        LockService
	retentionDays      int
	pinnedForeverCount int
}

func (j *aiChatRetentionJob) Run() {
	jobID := uuid.NewString()
	if j.retentionDays < 1 {
		log.Debugf("[AiChatCleanup] retention job %s skipped (retentionDays<1)", jobID)
		return
	}
	parent, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	err := withAiChatLock(parent, j.lockService, aiChatRetentionLockName, func(ctx context.Context) error {
		userIDs, err := j.repo.ListUserIDs(ctx)
		if err != nil {
			return err
		}
		var deletedTotal, processed, errs int
		for _, uid := range userIDs {
			if ctx.Err() != nil {
				break
			}
			n, err := j.repo.DeleteUserChatsByRetention(ctx, uid, j.retentionDays, j.pinnedForeverCount)
			if err != nil {
				errs++
				log.Warnf("[AiChatCleanup] retention failed for user %s: %v", uid, err)
				continue
			}
			processed++
			deletedTotal += n
		}
		if deletedTotal > 0 {
			metrics.AiChatCleanupDeleted.WithLabelValues("retention", "chat").Add(float64(deletedTotal))
		}
		log.Infof("[AiChatCleanup] retention job %s done: users=%d deleted=%d errors=%d", jobID, processed, deletedTotal, errs)
		return nil
	})
	if err == errAiChatLockBusy {
		log.Debugf("[AiChatCleanup] retention job %s skipped (lock busy)", jobID)
		return
	}
	if err != nil {
		log.Warnf("[AiChatCleanup] retention job %s error: %v", jobID, err)
	}
}
