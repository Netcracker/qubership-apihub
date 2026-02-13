package cleanup

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
	"github.com/google/uuid"
)

const (
	sharedLockName       = "cleanup_job_lock"
	lockLeaseSeconds     = 120
	lockHeartbeatSeconds = 30

	maxErrorMessageLength = 1000
	updateContextTimeout  = 10 * time.Second
)

type JobRunner struct {
	cp                  db.ConnectionProvider
	migrationRepository mRepository.MigrationRunRepository
	lockService         service.LockService
	config              jobConfig
	processor           JobProcessor
}

func (r *JobRunner) Run() {
	jobId := uuid.New().String()
	deletedItems := 0

	vacuumTimeout := r.processor.GetVacuumTimeout()
	jobTimeout := r.config.timeout + vacuumTimeout
	jobCtx, jobCancel := context.WithTimeout(context.Background(), jobTimeout) //an extended timeout is required to hold the lock for the entire duration of the job; the configured timeout is used for the main stage of the job, and an additional timeout is applied for performing VACUUM FULL on the affected tables
	defer jobCancel()
	jobCtx = context.WithValue(jobCtx, "jobType", r.config.jobType)
	jobCtx = context.WithValue(jobCtx, "jobId", jobId)

	defer func() {
		if err := recover(); err != nil {
			errorMsg := fmt.Sprintf("cleanup job failed with panic: %v", err)
			logger.Errorf(jobCtx, "%s", errorMsg)
			finishedAt := time.Now()
			_ = r.processor.UpdateProgress(jobCtx, jobId, statusError, errorMsg, deletedItems, &finishedAt)
		}
	}()

	if r.isMigrationRunning(jobCtx) {
		return
	}

	logger.Infof(jobCtx, "Starting cleanup job, cleanup timeout %v", r.config.timeout)

	if !r.acquireLock(jobCtx, jobId, jobCancel) {
		return
	}
	defer r.releaseLock(jobCtx)

	deleteBefore := time.Now().AddDate(0, 0, -r.config.ttl)
	if err := r.processor.Initialize(jobCtx, jobId, r.config.instanceId, deleteBefore); err != nil {
		return
	}

	cleanupCtx := jobCtx
	var cleanupCancel context.CancelFunc
	if vacuumTimeout > 0 {
		cleanupCtx, cleanupCancel = context.WithTimeout(jobCtx, r.config.timeout)
		defer cleanupCancel()
	}

	processingErrors, isTimeout := r.executeProcessingPhase(cleanupCtx, jobId, deleteBefore, &deletedItems)

	if vacuumTimeout > 0 {
		vacuumErr, interruptedByTimeout := r.executeVacuumPhase(jobCtx, jobId, vacuumTimeout)
		if vacuumErr != nil {
			processingErrors = append(processingErrors)
			if interruptedByTimeout {
				isTimeout = true
			}
		}
	}

	r.finishCleanupRun(jobCtx, jobId, processingErrors, isTimeout, deletedItems)
}

func (r *JobRunner) isMigrationRunning(ctx context.Context) bool {
	startTime := time.Now().Round(time.Second)
	migrations, err := r.migrationRepository.GetRunningMigrations()
	if err != nil {
		logger.Error(ctx, "Failed to check for running migrations")
		return true
	}
	if len(migrations) != 0 {
		logger.Infof(ctx, "job was skipped at %s due to migration run", startTime)
		return true
	}
	return false
}

func (r *JobRunner) acquireLock(ctx context.Context, jobId string, cancel context.CancelFunc) bool {
	lockOptions := service.LockOptions{
		LeaseSeconds:             lockLeaseSeconds,
		HeartbeatIntervalSeconds: lockHeartbeatSeconds,
		NotifyOnLoss:             true,
	}

	acquired, lockLostCh, err := r.lockService.AcquireLock(ctx, sharedLockName, lockOptions)
	if err != nil {
		logger.Errorf(ctx, "Failed to acquire lock: %v", err)
		return false
	}

	if !acquired {
		logger.Info(ctx, "job skipped - lock is held by another instance or job")
		return false
	}

	if lockLostCh != nil {
		go func() {
			event, ok := <-lockLostCh
			if !ok {
				return
			}
			logger.Warnf(ctx, "Lock %s lost: %s. Canceling cleanup job", event.LockName, event.Reason)
			cancel()
		}()
	}

	return true
}

func (r *JobRunner) releaseLock(ctx context.Context) {
	select {
	case <-ctx.Done():
		if ctx.Err() == context.DeadlineExceeded {
			releaseCtx, releaseCancel := createContextForUpdate(ctx)
			defer releaseCancel()

			if err := r.lockService.ReleaseLock(releaseCtx, sharedLockName); err != nil {
				logger.Errorf(ctx, "Failed to release lock: %v", err)
			}
		} else {
			logger.Debug(ctx, "Lock for cleanup job was already lost, skipping release")
		}
	default:
		if err := r.lockService.ReleaseLock(ctx, sharedLockName); err != nil {
			logger.Errorf(ctx, "Failed to release lock: %v", err)
		}
	}
}

func (r *JobRunner) executeProcessingPhase(cleanupCtx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, bool) {
	isTimeout := false
	processingErrors, err := r.processor.Process(cleanupCtx, jobId, deleteBefore, deletedItems)
	if err != nil {
		logger.Warnf(cleanupCtx, "Cleanup phase finished with error: %v", err)
		processingErrors = append(processingErrors, fmt.Sprintf("cleanup stopped: %s", err.Error()))
		if cleanupCtx.Err() == context.DeadlineExceeded {
			isTimeout = true
		}
	}

	return processingErrors, isTimeout
}

func (r *JobRunner) executeVacuumPhase(jobCtx context.Context, jobId string, vacuumTimeout time.Duration) (error, bool) {
	vacuumCtx, vacuumCancel := context.WithTimeout(jobCtx, vacuumTimeout)
	defer vacuumCancel()

	logger.Debugf(jobCtx, "Starting vacuum phase with timeout %v", vacuumTimeout)
	vacuumErr := r.processor.PerformVacuum(vacuumCtx, jobId)
	if vacuumErr != nil {
		logger.Warnf(jobCtx, "Vacuum phase failed: %v", vacuumErr)
		if vacuumCtx.Err() == context.DeadlineExceeded {
			return vacuumErr, true
		}
		return vacuumErr, false
	} else {
		logger.Debug(jobCtx, "Vacuum phase completed successfully")
	}
	return nil, false
}

func (r *JobRunner) finishCleanupRun(ctx context.Context, jobId string, processingErrors []string, isTimeout bool, deletedItems int) {
	status := determineJobStatus(len(processingErrors) > 0, isTimeout)
	errorMessage := formatJobErrors(r.config.jobType, processingErrors)

	finishedAt := time.Now()
	if err := r.processor.UpdateProgress(ctx, jobId, status, errorMessage, deletedItems, &finishedAt); err != nil {
		logErrorMessage := formatErrorMessage(errorMessage)
		logger.Errorf(ctx, "Failed to save cleanup run state: %v, status: %s, errorMessage: %s, deletedItems: %d",
			err, status, logErrorMessage, deletedItems)
		return
	}

	logger.Infof(ctx, "job finished with status '%s'. Deleted %d items.", status, deletedItems)
}

func createContextForUpdate(parentCtx context.Context) (context.Context, context.CancelFunc) {
	if parentCtx.Err() != nil {
		return context.WithTimeout(context.Background(), updateContextTimeout)
	}
	return parentCtx, func() {}
}

func formatErrorMessage(errorMessage string) string {
	runes := []rune(errorMessage)
	if len(runes) > maxErrorMessageLength {
		return string(runes[:maxErrorMessageLength-3]) + "..."
	}
	return errorMessage
}

func determineJobStatus(hasErrors bool, isTimeout bool) jobStatus {
	if isTimeout {
		return statusTimeout
	}
	if hasErrors {
		return statusError
	}
	return statusComplete
}

func getContextCancellationMessage(ctx context.Context) string {
	if ctx.Err() == context.DeadlineExceeded {
		return "timeout"
	}
	return "distributed lock was lost"
}

func formatJobErrors(jobType jobType, errors []string) string {
	if len(errors) == 0 {
		return ""
	}
	return fmt.Sprintf("%s cleanup finished with errors: %s", jobType, strings.Join(errors, "; "))
}
