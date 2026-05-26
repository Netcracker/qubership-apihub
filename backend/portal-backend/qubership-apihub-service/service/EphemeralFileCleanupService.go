package service

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

const (
	ephemeralFilesCleanupLockName = "ephemeral_files_cleanup"
	ephemeralFilesBatchSize       = 500
)

var errEphemeralFileCleanupLockBusy = errors.New("ephemeral file cleanup lock is held by another instance")

type EphemeralFileCleanupService interface {
	StartCleanupJob(schedule string, baseDir string) error
}

func NewEphemeralFileCleanupService(repo repository.EphemeralFileRepository, lockService LockService) EphemeralFileCleanupService {
	return &ephemeralFileCleanupServiceImpl{
		repo:        repo,
		lockService: lockService,
	}
}

type ephemeralFileCleanupServiceImpl struct {
	repo        repository.EphemeralFileRepository
	lockService LockService
	cron        *cron.Cron
	started     bool
}

func (s *ephemeralFileCleanupServiceImpl) StartCleanupJob(schedule string, baseDir string) error {
	if strings.TrimSpace(schedule) == "" {
		log.Info("[EphemeralFileCleanup] cleanup job not scheduled (empty schedule)")
		return nil
	}
	job := &ephemeralFilesCleanupJob{
		repo:        s.repo,
		lockService: s.lockService,
		baseDir:     baseDir,
	}
	return s.addJob(schedule, job, "ephemeral-files cleanup")
}

func (s *ephemeralFileCleanupServiceImpl) addJob(schedule string, job cron.Job, label string) error {
	if !s.started {
		s.cron = cron.New(cron.WithLocation(time.UTC))
		s.cron.Start()
		s.started = true
	}
	wrapped := cron.NewChain(cron.SkipIfStillRunning(cron.DefaultLogger)).Then(job)
	if _, err := s.cron.AddJob(schedule, wrapped); err != nil {
		log.Warnf("[EphemeralFileCleanup] %s job not scheduled (%s): %v", label, schedule, err)
		return err
	}
	log.Infof("[EphemeralFileCleanup] %s job scheduled with %s", label, schedule)
	return nil
}

// withEphemeralFileCleanupLock acquires the named distributed lock and runs body with a derived context.
// The body is responsible for honoring ctx cancellation.
func withEphemeralFileCleanupLock(parentCtx context.Context, ls LockService, lockName string, body func(ctx context.Context) error) error {
	const leaseSeconds = 120
	const heartbeatSeconds = 30
	opts := LockOptions{
		LeaseSeconds:             leaseSeconds,
		HeartbeatIntervalSeconds: heartbeatSeconds,
		NotifyOnLoss:             true,
	}
	acquired, lostCh, err := ls.AcquireLock(parentCtx, lockName, opts)
	if err != nil {
		return err
	}
	if !acquired {
		return errEphemeralFileCleanupLockBusy
	}
	bodyCtx, cancel := context.WithCancel(parentCtx)
	defer cancel()
	if lostCh != nil {
		go func() {
			ev, ok := <-lostCh
			if !ok {
				return
			}
			log.Warnf("[EphemeralFileCleanup] lock %s lost: %s", ev.LockName, ev.Reason)
			cancel()
		}()
	}
	defer func() {
		releaseCtx, releaseCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer releaseCancel()
		if rErr := ls.ReleaseLock(releaseCtx, lockName); rErr != nil {
			log.Warnf("[EphemeralFileCleanup] release lock %s: %v", lockName, rErr)
		}
	}()
	return body(bodyCtx)
}

// ephemeralFilesCleanupJob removes DB rows past expires_at and unlinks the matching FS file.
type ephemeralFilesCleanupJob struct {
	repo        repository.EphemeralFileRepository
	lockService LockService
	baseDir     string
}

func (j *ephemeralFilesCleanupJob) Run() {
	jobID := uuid.NewString()
	parent, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()
	err := withEphemeralFileCleanupLock(parent, j.lockService, ephemeralFilesCleanupLockName, func(ctx context.Context) error {
		var rmFs, rmDb, errs int
		for {
			if ctx.Err() != nil {
				break
			}
			rows, err := j.repo.ListExpired(ctx, ephemeralFilesBatchSize)
			if err != nil {
				return err
			}
			if len(rows) == 0 {
				break
			}
			for i := range rows {
				if ctx.Err() != nil {
					break
				}
				row := rows[i]
				if !isPathSafe(j.baseDir, row.StoragePath) {
					log.Warnf("[EphemeralFileCleanup] refusing to remove path outside base dir: %q", row.StoragePath)
				} else if row.StoragePath != "" {
					if err := os.Remove(row.StoragePath); err != nil && !os.IsNotExist(err) {
						errs++
						log.Warnf("[EphemeralFileCleanup] unlink %s: %v", row.StoragePath, err)
					} else {
						rmFs++
					}
				}
				if err := j.repo.DeleteByID(ctx, row.ID); err != nil {
					errs++
					log.Warnf("[EphemeralFileCleanup] delete row %s: %v", row.ID, err)
					continue
				}
				rmDb++
			}
			if len(rows) < ephemeralFilesBatchSize {
				break
			}
		}
		if rmDb > 0 {
			metrics.EphemeralFileCleanupDeleted.WithLabelValues("row").Add(float64(rmDb))
		}
		if rmFs > 0 {
			metrics.EphemeralFileCleanupDeleted.WithLabelValues("fs").Add(float64(rmFs))
		}
		log.Infof("[EphemeralFileCleanup] job %s done: removedFromDB=%d unlinked=%d errors=%d", jobID, rmDb, rmFs, errs)
		return nil
	})
	if err == errEphemeralFileCleanupLockBusy {
		log.Debugf("[EphemeralFileCleanup] job %s skipped (lock busy)", jobID)
		return
	}
	if err != nil {
		log.Warnf("[EphemeralFileCleanup] job %s error: %v", jobID, err)
	}
}

// isPathSafe ensures path is anchored under baseDir; empty baseDir disables the check.
// This is a defense-in-depth guard so that a corrupted DB row cannot trigger arbitrary FS removal.
func isPathSafe(baseDir, p string) bool {
	if strings.TrimSpace(baseDir) == "" {
		return true
	}
	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return false
	}
	absPath, err := filepath.Abs(p)
	if err != nil {
		return false
	}
	rel, err := filepath.Rel(absBase, absPath)
	if err != nil {
		return false
	}
	if strings.HasPrefix(rel, "..") {
		return false
	}
	return true
}
