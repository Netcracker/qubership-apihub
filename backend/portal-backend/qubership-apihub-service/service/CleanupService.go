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
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

type cleanupJobType string
type jobStatus string

const (
	defaultCleanupJobTimeout = 48 * time.Hour
	cleanupJobTimeoutBuffer  = 1 * time.Hour
	maxErrorMessageLength    = 1000
	sharedLockName           = "cleanup_job_lock"

	jobTypeRevisions   cleanupJobType = "revisions"
	jobTypeComparisons cleanupJobType = "comparisons"
	jobTypeDeletedData cleanupJobType = "soft deleted data"

	statusRunning  jobStatus = "running"
	statusComplete jobStatus = "complete"
	statusError    jobStatus = "error"
	statusTimeout  jobStatus = "timeout"
)

type CleanupService interface {
	ClearTestData(testId string) error
	CreateRevisionsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, versionCleanupRepo repository.VersionCleanupRepository, lockService LockService, instanceId string, schedule string, deleteLastRevision bool, deleteReleaseRevision bool, ttl int) error
	CreateComparisonsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, comparisonCleanupRepo repository.ComparisonCleanupRepository, lockService LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error
	CreateSoftDeletedDataCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository, lockService LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error
}

func NewCleanupService(cp db.ConnectionProvider) CleanupService {
	return &cleanupServiceImpl{cp: cp, cron: cron.New()}
}

type cleanupServiceImpl struct {
	cp   db.ConnectionProvider
	cron *cron.Cron
}

func (c cleanupServiceImpl) ClearTestData(testId string) error {
	idFilter := "QS%-" + utils.LikeEscaped(testId) + "%"
	//clear tables: project, branch_draft_content, branch_draft_references, favorites, apihub_api_keys
	_, err := c.cp.GetConnection().Model(&entity.ProjectIntEntity{}).
		Where("id like ?", idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear tables: package_group
	_, err = c.cp.GetConnection().Model(&entity.PackageEntity{}).
		Where("id like ?", idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear tables: published_version, published_version_references, published_version_revision_content, published_sources
	_, err = c.cp.GetConnection().Model(&entity.PublishedVersionEntity{}).
		Where("package_id like ?", idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear table: published_sources
	_, err = c.cp.GetConnection().Model(&entity.PublishedSrcEntity{}).
		Where("package_id like ?", idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear table: published_sources_archives
	_, err = c.cp.GetConnection().Exec(`delete from published_sources_archives where checksum not in (select distinct archive_checksum from published_sources)`)
	if err != nil {
		return err
	}
	//clear table published_data
	_, err = c.cp.GetConnection().Model(&entity.PublishedContentDataEntity{}).
		Where("package_id like ?", idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear table shared_url_info
	_, err = c.cp.GetConnection().Model(&entity.SharedUrlInfoEntity{}).
		Where("package_id like ?", idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear table package_member_role
	_, err = c.cp.GetConnection().Model(&entity.PackageMemberRoleEntity{}).
		Where("user_id ilike ?", "%"+utils.LikeEscaped(testId)+"%").
		ForceDelete()
	if err != nil {
		return err
	}

	//clear personal access tokens
	_, err = c.cp.GetConnection().Model(&entity.PersonaAccessTokenEntity{}).
		Where("user_id ilike ?", "%"+utils.LikeEscaped(testId)+"%").
		ForceDelete()
	//clear table user_data
	_, err = c.cp.GetConnection().Model(&entity.UserEntity{}).
		Where("user_id ilike ?", "%"+utils.LikeEscaped(testId)+"%").
		ForceDelete()
	if err != nil {
		return err
	}
	//clear open_count tables
	_, err = c.cp.GetConnection().Exec(`delete from published_version_open_count where package_id ilike ?`, idFilter)
	if err != nil {
		return err
	}
	_, err = c.cp.GetConnection().Exec(`delete from published_document_open_count where package_id ilike ?`, idFilter)
	if err != nil {
		return err
	}
	_, err = c.cp.GetConnection().Exec(`delete from operation_open_count where package_id ilike ?`, idFilter)
	if err != nil {
		return err
	}
	//clear table version_comparison
	_, err = c.cp.GetConnection().Model(&entity.VersionComparisonEntity{}).
		Where("(package_id like ? or previous_package_id like ?)", idFilter, idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear table operation_comparison
	_, err = c.cp.GetConnection().Model(&entity.OperationComparisonEntity{}).
		Where("(package_id like ? or previous_package_id like ?)", idFilter, idFilter).
		ForceDelete()
	if err != nil {
		return err
	}
	//clear table apihub_api_keys
	_, err = c.cp.GetConnection().Model(&entity.ApihubApiKeyEntity{}).
		Where("package_id like ?", idFilter).
		ForceDelete()
	if err != nil {
		return err
	}

	// TODO: need to clear business metrics as well

	return nil
}

func (c cleanupServiceImpl) calculateCleanupJobTimeout(schedule string, jobType cleanupJobType) time.Duration {
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)

	sched, err := parser.Parse(schedule)
	if err != nil {
		log.Warnf("Failed to parse cron schedule '%s' for %s cleanup job: %v. Using default timeout.", schedule, jobType, err)
		return defaultCleanupJobTimeout
	}

	now := time.Now()
	next1 := sched.Next(now)
	next2 := sched.Next(next1)

	interval := next2.Sub(next1)
	if interval <= cleanupJobTimeoutBuffer {
		timeout := time.Duration(float64(interval) * 0.9)
		log.Warnf("Calculated interval from cron schedule '%s' for %s cleanup job is very short: %v. Using %v as timeout.",
			schedule, jobType, interval, timeout)
		return timeout
	}

	timeout := interval - cleanupJobTimeoutBuffer
	log.Infof("Calculated cleanup job timeout for %s cleanup job with schedule '%s': %v (interval: %v)",
		jobType, schedule, timeout, interval)
	return timeout
}

func (c cleanupServiceImpl) CreateRevisionsCleanupJob(publishedRepository repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, versionCleanupRepository repository.VersionCleanupRepository, lockService LockService, instanceId string, schedule string, deleteLastRevision bool, deleteReleaseRevision bool, ttl int) error {
	timeout := c.calculateCleanupJobTimeout(schedule, jobTypeRevisions)
	job := &revisionsCleanupJob{
		baseCleanupJob: baseCleanupJob{
			cp:                  c.cp,
			publishedRepository: publishedRepository,
			migrationRepository: migrationRepository,
			lockService:         lockService,
			instanceId:          instanceId,
			ttl:                 ttl,
			jobType:             jobTypeRevisions,
			timeout:             timeout,
		},
		versionCleanupRepository: versionCleanupRepository,
		deleteLastRevision:       deleteLastRevision,
		deleteReleaseRevision:    deleteReleaseRevision,
	}
	return c.addCleanupJob(job, schedule, jobTypeRevisions)
}

func (c cleanupServiceImpl) CreateComparisonsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, comparisonCleanupRepo repository.ComparisonCleanupRepository, lockService LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error {
	timeout := time.Duration(timeoutMinutes) * time.Minute
	job := &comparisonsCleanupJob{
		baseCleanupJob: baseCleanupJob{
			cp:                  c.cp,
			publishedRepository: publishedRepo,
			migrationRepository: migrationRepository,
			lockService:         lockService,
			instanceId:          instanceId,
			ttl:                 ttl,
			jobType:             jobTypeComparisons,
			timeout:             timeout,
		},
		comparisonCleanupRepo: comparisonCleanupRepo,
	}
	return c.addCleanupJob(job, schedule, jobTypeComparisons)
}

func (c cleanupServiceImpl) CreateSoftDeletedDataCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository, lockService LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error {
	timeout := time.Duration(timeoutMinutes) * time.Minute
	job := &softDeletedDataCleanupJob{
		baseCleanupJob: baseCleanupJob{
			cp:                  c.cp,
			publishedRepository: publishedRepo,
			migrationRepository: migrationRepository,
			lockService:         lockService,
			instanceId:          instanceId,
			ttl:                 ttl,
			jobType:             jobTypeDeletedData,
			timeout:             timeout,
		},
		deletedDataCleanupRepo: deletedDataCleanupRepo,
	}
	return c.addCleanupJob(job, schedule, jobTypeDeletedData)
}

func (c cleanupServiceImpl) addCleanupJob(job cron.Job, schedule string, jobType cleanupJobType) error {
	if len(c.cron.Entries()) == 0 {
		location, err := time.LoadLocation("")
		if err != nil {
			return err
		}
		c.cron = cron.New(cron.WithLocation(location))
		c.cron.Start()
	}
	wrappedJob := cron.NewChain(cron.SkipIfStillRunning(cron.DefaultLogger)).Then(job)
	_, err := c.cron.AddJob(schedule, wrappedJob)
	if err != nil {
		log.Warnf("%s cleanup job wasn't added for schedule - %s. With error - %s", jobType, schedule, err)
		return err
	}
	log.Infof("%s cleanup job was created with schedule - %s", jobType, schedule)

	return nil
}

type baseCleanupJob struct {
	cp                  db.ConnectionProvider
	publishedRepository repository.PublishedRepository
	migrationRepository mRepository.MigrationRunRepository
	lockService         LockService
	instanceId          string
	ttl                 int
	jobType             cleanupJobType
	timeout             time.Duration
}

func (j *baseCleanupJob) isMigrationRunning() bool {
	startTime := time.Now().Round(time.Second)
	log.Infof("Starting %s cleanup job at %s", j.jobType, startTime)
	migrations, err := j.migrationRepository.GetRunningMigrations()
	if err != nil {
		log.Errorf("Failed to check for running migrations for %s cleanup job", j.jobType)
		return true
	}
	if len(migrations) != 0 {
		log.Infof("%s cleanup was skipped at %s due to migration run", j.jobType, startTime)
		return true
	}
	return false
}

func (j *baseCleanupJob) acquireLock(ctx context.Context, jobId string, cancel context.CancelFunc) bool {
	lockOptions := LockOptions{
		LeaseSeconds:             120,
		HeartbeatIntervalSeconds: 30,
		NotifyOnLoss:             true,
	}

	acquired, lockLostCh, err := j.lockService.AcquireLock(ctx, sharedLockName, lockOptions)
	if err != nil {
		log.Errorf("Failed to acquire lock for %s cleanup: %v", j.jobType, err)
		return false
	}

	if !acquired {
		log.Infof("%s cleanup job %s skipped - lock is held by another instance or job", j.jobType, jobId)
		return false
	}

	if lockLostCh != nil {
		go func() {
			event, ok := <-lockLostCh
			if !ok {
				return
			}
			log.Warnf("Lock %s lost: %s. Canceling %s cleanup job", event.LockName, event.Reason, j.jobType)
			cancel()
		}()
	}

	return true
}

func (j *baseCleanupJob) releaseLock(ctx context.Context) {
	select {
	case <-ctx.Done():
		if ctx.Err() == context.DeadlineExceeded {
			releaseCtx, releaseCancel := j.createUpdateContext(ctx)
			defer releaseCancel()

			if err := j.lockService.ReleaseLock(releaseCtx, sharedLockName); err != nil {
				log.Errorf("Failed to release lock for %s cleanup: %v", j.jobType, err)
			}
		} else {
			log.Debugf("Lock for %s cleanup job was already lost, skipping release", j.jobType)
		}
	default:
		if err := j.lockService.ReleaseLock(ctx, sharedLockName); err != nil {
			log.Errorf("Failed to release lock for %s cleanup: %v", j.jobType, err)
		}
	}
}

func (j *baseCleanupJob) createUpdateContext(ctx context.Context) (context.Context, context.CancelFunc) {
	if ctx.Err() != nil {
		return context.WithTimeout(context.Background(), 10*time.Second)
	}
	return ctx, func() {}
}

type revisionsCleanupJob struct {
	baseCleanupJob
	versionCleanupRepository repository.VersionCleanupRepository
	deleteLastRevision       bool
	deleteReleaseRevision    bool
}

func (j *revisionsCleanupJob) Run() {
	jobId := uuid.New().String()
	deletedItems := 0

	ctx, cancel := context.WithTimeout(context.Background(), j.timeout)
	defer cancel()

	defer func() {
		if err := recover(); err != nil {
			errorMsg := fmt.Sprintf("Revisions cleanup job %s failed with panic: %v", jobId, err)
			log.Errorf("%s", errorMsg)
			finishedAt := time.Now()
			_ = j.updateCleanupRun(ctx, jobId, statusError, errorMsg, deletedItems, &finishedAt)
		}
	}()

	if j.isMigrationRunning() {
		return
	}

	log.Infof("Starting revisions cleanup job %s with TTL %d days, cleanup timeout %v", jobId, j.ttl, j.timeout)

	if !j.acquireLock(ctx, jobId, cancel) {
		return
	}
	defer j.releaseLock(ctx)

	deleteBefore := time.Now().AddDate(0, 0, -j.ttl)
	log.Debugf("[revisions cleanup] Will delete revisions older than %s (TTL: %d days)", deleteBefore, j.ttl)
	if err := j.initializeCleanupRun(ctx, jobId, deleteBefore); err != nil {
		return
	}

	isTimeout := false
	processingErrors, err := j.processPackages(ctx, jobId, deleteBefore, &deletedItems)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			isTimeout = true
			processingErrors = append(processingErrors, fmt.Sprintf("cleanup stopped: %s", err))
		} else {
			finishedAt := time.Now()
			_ = j.updateCleanupRun(ctx, jobId, statusError, err.Error(), deletedItems, &finishedAt)
			return
		}
	}

	j.finishCleanupRun(ctx, jobId, processingErrors, deletedItems, isTimeout)
}

func (j *revisionsCleanupJob) initializeCleanupRun(ctx context.Context, jobId string, deleteBefore time.Time) error {
	err := j.versionCleanupRepository.StoreVersionCleanupRun(ctx, entity.VersionCleanupEntity{
		RunId:        jobId,
		InstanceId:   j.instanceId,
		Status:       string(statusRunning),
		PackageId:    nil,
		DeleteBefore: deleteBefore,
	})
	if err != nil {
		log.Errorf("Failed to store revisions cleanup run: %v", err)
		return err
	}

	return nil
}

func (j *revisionsCleanupJob) processPackages(ctx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, error) {
	page, limit := 0, 100
	processingErrors := []string{}
	packageCount := 0
	lastUpdateCount := *deletedItems

	for {
		select {
		case <-ctx.Done():
			errorMessage := "distributed lock was lost"
			if ctx.Err() == context.DeadlineExceeded {
				errorMessage = "timeout"
			}
			log.Warnf("Revisions cleanup job %s interrupted - %s", jobId, errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		getPackageListReq := view.PackageListReq{
			Kind:         []string{entity.KIND_PACKAGE, entity.KIND_DASHBOARD},
			Limit:        limit,
			OnlyFavorite: false,
			OnlyShared:   false,
			Offset:       page * limit,
			ParentId:     "*",
		}

		packages, err := j.publishedRepository.GetFilteredPackagesWithOffset(ctx, getPackageListReq, "")
		if err != nil {
			log.Errorf("Failed to get packages for revisions cleanup %s: %s", jobId, err.Error())
			return nil, fmt.Errorf("failed to get packages: %s", err.Error())
		}

		if len(packages) == 0 {
			break
		}

		log.Debugf("[revisions cleanup] Processing page %d", page+1)

		for idx, pkg := range packages {
			select {
			case <-ctx.Done():
				errorMessage := "distributed lock was lost"
				if ctx.Err() == context.DeadlineExceeded {
					errorMessage = "timeout"
				}
				log.Warnf("Revisions cleanup job %s interrupted during package processing - %s", jobId, errorMessage)
				return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
			default:
			}

			log.Debugf("[revisions cleanup] Processing package %d/%d: %s", idx+1, len(packages), pkg.Id)
			count, err := j.publishedRepository.DeletePackageRevisionsBeforeDate(ctx, pkg.Id, deleteBefore, j.deleteLastRevision, j.deleteReleaseRevision, "job_revisions_cleanup|"+jobId)
			if err != nil {
				log.Warnf("Failed to delete revisions of package %s during revisions cleanup %s: %v", pkg.Id, jobId, err)
				processingErrors = append(processingErrors, fmt.Sprintf("package %s: %s", pkg.Id, err.Error()))
			}
			*deletedItems += count
			packageCount++
		}

		log.Debugf("[revisions cleanup] Completed processing page %d, total deleted items so far: %d", page+1, *deletedItems)

		if packageCount >= 1000 && *deletedItems > lastUpdateCount {
			if err := j.updateCleanupRun(ctx, jobId, "", "", *deletedItems, nil); err != nil {
				log.Warnf("Failed to update progress for revisions cleanup %s: %v", jobId, err)
			} else {
				lastUpdateCount = *deletedItems
			}
			packageCount = 0
		}

		page++
	}

	return processingErrors, nil
}

func (j *revisionsCleanupJob) finishCleanupRun(ctx context.Context, jobId string, errors []string, deletedItems int, isTimeout bool) {
	status := statusComplete
	errorMessage := ""

	if isTimeout {
		status = statusTimeout
	} else if len(errors) > 0 {
		status = statusError
	}
	if len(errors) > 0 {
		errorMessage = fmt.Sprintf("Revisions cleanup finished with errors: %s", strings.Join(errors, "; "))
	}

	finishedAt := time.Now()
	if err := j.updateCleanupRun(ctx, jobId, status, errorMessage, deletedItems, &finishedAt); err != nil {
		logErrorMessage := errorMessage
		runes := []rune(logErrorMessage)
		if len(runes) > maxErrorMessageLength {
			logErrorMessage = string(runes[:maxErrorMessageLength-3]) + "..."
		}
		log.Errorf("Failed to save cleanup run state: %v, jobId: %s, status: %s, errorMessage: %s, deletedItems: %d", err, jobId, status, logErrorMessage, deletedItems)
		return
	}

	log.Infof("Revisions cleanup job %s finished with status '%s'. Deleted %d revisions.", jobId, status, deletedItems)
}

func (j *revisionsCleanupJob) updateCleanupRun(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error {
	updateCtx, cancel := j.createUpdateContext(ctx)
	defer cancel()

	err := j.versionCleanupRepository.UpdateVersionCleanupRun(updateCtx, jobId, string(status), errorMessage, deletedItems, finishedAt)
	if err != nil {
		log.Errorf("failed to set '%s' status for cleanup job id %s: %s", status, jobId, err.Error())
		return err
	}
	return nil
}

type comparisonsCleanupJob struct {
	baseCleanupJob
	comparisonCleanupRepo repository.ComparisonCleanupRepository
}

func (j *comparisonsCleanupJob) Run() {
	jobId := uuid.New().String()
	deletedItems := 0

	vacuumTimeout := 3 * time.Hour
	jobTimeout := j.timeout + vacuumTimeout //an extended timeout is required to hold the lock for the entire duration of the job; the configured timeout is used for the main stage of the job, and an additional timeout is applied for performing VACUUM FULL on the affected tables
	jobCtx, jobCancel := context.WithTimeout(context.Background(), jobTimeout)
	defer jobCancel()
	defer func() {
		if err := recover(); err != nil {
			errorMsg := fmt.Sprintf("Comparison cleanup job %s failed with panic: %v", jobId, err)
			log.Errorf("%s", errorMsg)
			finishedAt := time.Now()
			_ = j.updateCleanupRun(jobCtx, jobId, statusError, errorMsg, deletedItems, &finishedAt)
		}
	}()

	if j.isMigrationRunning() {
		return
	}

	log.Infof("Starting comparison cleanup job %s with TTL %d days, cleanup timeout %v", jobId, j.ttl, j.timeout)

	if !j.acquireLock(jobCtx, jobId, jobCancel) {
		return
	}
	defer j.releaseLock(jobCtx)

	deleteBefore := time.Now().AddDate(0, 0, -j.ttl)
	log.Debugf("[comparisons cleanup] Will delete comparisons older than %s (TTL: %d days)", deleteBefore, j.ttl)
	if err := j.initializeCleanupRun(jobCtx, jobId, deleteBefore); err != nil {
		return
	}

	cleanupCtx, cleanupCancel := context.WithTimeout(jobCtx, j.timeout)
	defer cleanupCancel()
	isTimeout := false
	processingErrors, cleanupErr := j.processComparisons(cleanupCtx, jobId, deleteBefore, &deletedItems)
	if cleanupErr != nil {
		log.Warnf("Cleanup phase completed with error, but continuing to vacuum: %v", cleanupErr)
		processingErrors = append(processingErrors, fmt.Sprintf("cleanup stopped: %s", cleanupErr.Error()))
		if cleanupCtx.Err() == context.DeadlineExceeded {
			isTimeout = true
		}
	}

	vacuumCtx, vacuumCancel := context.WithTimeout(jobCtx, vacuumTimeout)
	defer vacuumCancel()
	log.Debugf("Starting vacuum of comparison tables")
	vacuumErr := j.comparisonCleanupRepo.VacuumComparisonTables(vacuumCtx)
	if vacuumErr != nil {
		log.Warnf("Failed to vacuum comparison tables during cleanup %s: %v", jobId, vacuumErr)
		processingErrors = append(processingErrors, vacuumErr.Error())
		if vacuumCtx.Err() == context.DeadlineExceeded {
			isTimeout = true
		}
	}
	log.Debug("Vacuum of comparison tables completed successfully")

	j.finishCleanupRun(jobCtx, jobId, processingErrors, deletedItems, isTimeout)
}

func (j *comparisonsCleanupJob) initializeCleanupRun(ctx context.Context, jobId string, deleteBefore time.Time) error {
	err := j.comparisonCleanupRepo.StoreComparisonCleanupRun(ctx, entity.ComparisonCleanupEntity{
		RunId:        jobId,
		InstanceId:   j.instanceId,
		Status:       string(statusRunning),
		DeleteBefore: deleteBefore,
		StartedAt:    time.Now(),
	})
	if err != nil {
		log.Errorf("Failed to store comparison cleanup run: %v", err)
		return err
	}

	return nil
}

func (j *comparisonsCleanupJob) processComparisons(ctx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, error) {
	page, limit := 0, 100
	var errors []string
	comparisonCount := 0
	lastUpdateCount := *deletedItems

	for {
		select {
		case <-ctx.Done():
			errorMessage := "distributed lock was lost"
			if ctx.Err() == context.DeadlineExceeded {
				errorMessage = "timeout"
			}
			log.Warnf("Comparisons cleanup job %s interrupted - %s", jobId, errorMessage)
			return errors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		candidates, err := j.publishedRepository.GetVersionComparisonsCleanupCandidates(ctx, limit, page*limit)
		if err != nil {
			log.Errorf("[comparison cleanup] Error getting comparison candidates: %v", err)
			errors = append(errors, fmt.Sprintf("Error getting comparison candidates: %v", err))
			return errors, err
		}
		if len(candidates) == 0 {
			break
		}

		log.Debugf("[comparisons cleanup] Processing %d page", page+1)

		for _, candidate := range candidates {
			select {
			case <-ctx.Done():
				errorMessage := "distributed lock was lost"
				if ctx.Err() == context.DeadlineExceeded {
					errorMessage = "timeout"
				}
				log.Warnf("Comparison cleanup job %s interrupted - %s", jobId, errorMessage)
				return errors, fmt.Errorf("job interrupted - %s", errorMessage)
			default:
			}

			deleteCandidate := false
			if candidate.RevisionNotPublished {
				log.Tracef("[comparisons cleanup] Deleting comparison %s because revision is not published", candidate.ComparisonId)
				deleteCandidate = true
			} else if candidate.LastActive.Before(deleteBefore) && (candidate.ActualPreviousVersion == nil || candidate.ActualPreviousPackageId == nil ||
				*candidate.ActualPreviousVersion != candidate.PreviousVersion || *candidate.ActualPreviousPackageId != candidate.PreviousPackageId) {
				log.Tracef("[comparisons cleanup] Comparison %s is ad-hoc, deleting", candidate.ComparisonId)
				deleteCandidate = true
			} else if candidate.ActualPreviousPackageId != nil && candidate.ActualPreviousVersion != nil &&
				candidate.PreviousPackageId == *candidate.ActualPreviousPackageId &&
				candidate.PreviousVersion == *candidate.ActualPreviousVersion &&
				candidate.PreviousRevision != candidate.PreviousMaxRevision {
				log.Tracef("[comparisons cleanup] Comparison %s is not actual changelog, deleting", candidate.ComparisonId)
				deleteCandidate = true
			}

			if deleteCandidate {
				deleted, err := j.publishedRepository.DeleteVersionComparison(ctx, candidate.ComparisonId)
				if err != nil {
					log.Warnf("[comparison cleanup] Error deleting comparison %s: %v", candidate.ComparisonId, err)
					errors = append(errors, fmt.Sprintf("Error deleting comparison %s: %v", candidate.ComparisonId, err))
				} else if deleted {
					log.Debugf("[comparisons cleanup] Deleted version comparison %s, packageId: %s, version: %s, revision: %d, previousPackageId: %s, previousVersion: %s, previousRevision: %d",
						candidate.ComparisonId, candidate.PackageId, candidate.Version, candidate.Revision, candidate.PreviousPackageId, candidate.PreviousVersion, candidate.PreviousRevision)
					*deletedItems++
				} else {
					log.Tracef("[comparisons cleanup] Comparison %s was not deleted (referenced by another comparison or already deleted)", candidate.ComparisonId)
				}
			}
			comparisonCount++
		}

		log.Debugf("[comparisons cleanup] Completed processing page %d, total deleted items so far: %d", page+1, *deletedItems)

		if comparisonCount >= 1000 && *deletedItems > lastUpdateCount {
			if err := j.updateCleanupRun(ctx, jobId, "", "", *deletedItems, nil); err != nil {
				log.Warnf("Failed to update progress for comparisons cleanup %s: %v", jobId, err)
			} else {
				lastUpdateCount = *deletedItems
			}
			comparisonCount = 0
		}

		page++
	}

	return errors, nil
}

func (j *comparisonsCleanupJob) finishCleanupRun(ctx context.Context, jobId string, errors []string, deletedItems int, isTimeout bool) {
	status := statusComplete
	errorMessage := ""

	if isTimeout {
		status = statusTimeout
	} else if len(errors) > 0 {
		status = statusError
	}
	if len(errors) > 0 {
		errorMessage = fmt.Sprintf("Comparisons cleanup finished with errors: %s", strings.Join(errors, "; "))
	}

	finishedAt := time.Now()
	if err := j.updateCleanupRun(ctx, jobId, status, errorMessage, deletedItems, &finishedAt); err != nil {
		logErrorMessage := errorMessage
		runes := []rune(logErrorMessage)
		if len(runes) > maxErrorMessageLength {
			logErrorMessage = string(runes[:maxErrorMessageLength-3]) + "..."
		}
		log.Errorf("Failed to save cleanup run state: %v, jobId: %s, status: %s, %s, deletedItems: %d, errorMessage: %s", err, jobId, status, logErrorMessage, deletedItems, errorMessage)
		return
	}

	log.Infof("Comparison cleanup job %s finished with status '%s'. Deleted %d comparisons.", jobId, status, deletedItems)
}

func (j *comparisonsCleanupJob) updateCleanupRun(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error {
	updateCtx, cancel := j.createUpdateContext(ctx)
	defer cancel()

	err := j.comparisonCleanupRepo.UpdateComparisonCleanupRun(updateCtx, jobId, string(status), errorMessage, deletedItems, finishedAt)
	if err != nil {
		log.Errorf("failed to set '%s' status for cleanup job id %s: %s", status, jobId, err.Error())
		return err
	}
	return nil
}

type softDeletedDataCleanupJob struct {
	baseCleanupJob
	deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository
}

func (j *softDeletedDataCleanupJob) Run() {
	jobId := uuid.New().String()

	vacuumTimeout := 6 * time.Hour
	jobTimeout := j.timeout + vacuumTimeout //an extended timeout is required to hold the lock for the entire duration of the job; the configured timeout is used for the main stage of the job, and an additional timeout is applied for performing VACUUM FULL on the affected tables
	jobCtx, jobCancel := context.WithTimeout(context.Background(), jobTimeout)
	defer jobCancel()

	defer func() {
		if err := recover(); err != nil {
			errorMsg := fmt.Sprintf("Soft deleted data cleanup job %s failed with panic: %v", jobId, err)
			log.Errorf("%s", errorMsg)
			finishedAt := time.Now()
			_ = j.updateCleanupRun(jobCtx, jobId, statusError, errorMsg, &finishedAt)
		}
	}()

	if j.isMigrationRunning() {
		return
	}

	log.Infof("Starting soft deleted data cleanup job %s with TTL %d days, cleanup timeout %v", jobId, j.ttl, j.timeout)

	if !j.acquireLock(jobCtx, jobId, jobCancel) {
		return
	}
	defer j.releaseLock(jobCtx)
	log.Debugf("Successfully acquired distributed lock for soft deleted data cleanup job %s", jobId)

	deleteBefore := time.Now().AddDate(0, 0, -j.ttl)
	if err := j.initializeCleanupRun(jobCtx, jobId, deleteBefore); err != nil {
		return
	}

	cleanupCtx, cleanupCancel := context.WithTimeout(jobCtx, j.timeout)
	defer cleanupCancel()
	isTimeout := false
	processingErrors, cleanupErr := j.processDeletedDataCleanup(cleanupCtx, jobId, deleteBefore)
	if cleanupErr != nil {
		log.Warnf("Cleanup phase for job %s completed with error, but continuing to vacuum: %v", jobId, cleanupErr)
		processingErrors = append(processingErrors, fmt.Sprintf("cleanup stopped: %s", cleanupErr.Error()))
		if cleanupCtx.Err() == context.DeadlineExceeded {
			log.Warnf("Cleanup phase for job %s timed out", jobId)
			isTimeout = true
		}
	} else {
		log.Debugf("Cleanup phase for job %s completed successfully", jobId)
	}

	vacuumCtx, vacuumCancel := context.WithTimeout(jobCtx, vacuumTimeout)
	defer vacuumCancel()
	log.Debugf("Starting vacuum phase for job %s with timeout %v", jobId, vacuumTimeout)
	vacuumErr := j.deletedDataCleanupRepo.VacuumAffectedTables(vacuumCtx, jobId)
	if vacuumErr != nil {
		log.Warnf("Vacuum phase failed for job %s: %v", jobId, vacuumErr)
		processingErrors = append(processingErrors, vacuumErr.Error())
		if vacuumCtx.Err() == context.DeadlineExceeded {
			log.Warnf("Vacuum phase for job %s timed out", jobId)
			isTimeout = true
		}
	} else {
		log.Debugf("Vacuum phase for job %s completed successfully", jobId)
	}

	j.finishCleanupRun(jobCtx, jobId, processingErrors, isTimeout)
}

func (j *softDeletedDataCleanupJob) initializeCleanupRun(ctx context.Context, jobId string, deleteBefore time.Time) error {
	err := j.deletedDataCleanupRepo.StoreCleanupRun(ctx, entity.SoftDeletedDataCleanupEntity{
		RunId:        jobId,
		InstanceId:   j.instanceId,
		Status:       string(statusRunning),
		DeleteBefore: deleteBefore,
		StartedAt:    time.Now(),
	})
	if err != nil {
		log.Errorf("Failed to initialize cleanup run for job %s: %v", jobId, err)
		return err
	}

	return nil
}

func (j *softDeletedDataCleanupJob) processDeletedDataCleanup(ctx context.Context, jobId string, deleteBefore time.Time) ([]string, error) {
	processingErrors := []string{}

	log.Infof("[soft deleted data cleanup] Starting cleanup of packages deleted before %s", deleteBefore)

	packagesBatchSize := 50
	for {
		select {
		case <-ctx.Done():
			errorMessage := "distributed lock was lost"
			if ctx.Err() == context.DeadlineExceeded {
				errorMessage = "cleanup timeout"
			}
			log.Warnf("Soft deleted data cleanup job %s interrupted during packages cleanup - %s", jobId, errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItems, err := j.publishedRepository.DeleteSoftDeletedPackagesBeforeDate(ctx, jobId, deleteBefore, packagesBatchSize)
		if err != nil {
			log.Warnf("[soft deleted data cleanup] Failed to delete packages: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete package: %s", err.Error()))
			continue
		}

		if deletedItems == 0 {
			log.Debug("[soft deleted data cleanup] No more packages to delete")
			break
		}
		log.Infof("[soft deleted data cleanup] Deleted %d items during package deletion", deletedItems)
	}

	log.Infof("[soft deleted data cleanup] Starting cleanup of package revisions deleted before %s", deleteBefore)

	revisionsBatchSize := 100
	for {
		select {
		case <-ctx.Done():
			errorMessage := "distributed lock was lost"
			if ctx.Err() == context.DeadlineExceeded {
				errorMessage = "cleanup timeout"
			}
			log.Warnf("Soft deleted data cleanup job %s interrupted during revisions cleanup - %s", jobId, errorMessage)
			return processingErrors, fmt.Errorf("job interrupted - %s", errorMessage)
		default:
		}

		deletedItems, err := j.publishedRepository.DeleteSoftDeletedPackageRevisionsBeforeDate(ctx, jobId, deleteBefore, revisionsBatchSize)
		if err != nil {
			log.Warnf("[soft deleted data cleanup] Failed to delete package revisions: %v", err)
			processingErrors = append(processingErrors, fmt.Sprintf("failed to delete revisions: %s", err.Error()))
			continue
		}

		if deletedItems == 0 {
			log.Debug("[soft deleted data cleanup] No more package revisions to delete")
			break
		}
		log.Infof("[soft deleted data cleanup] Deleted %d items during package revisions deletion", deletedItems)
	}

	return processingErrors, nil
}

func (j *softDeletedDataCleanupJob) finishCleanupRun(ctx context.Context, jobId string, errors []string, isTimeout bool) {
	status := statusComplete
	errorMessage := ""

	if isTimeout {
		status = statusTimeout
	} else if len(errors) > 0 {
		status = statusError
	}
	if len(errors) > 0 {
		errorMessage = fmt.Sprintf("Soft deleted data cleanup finished with errors: %s", strings.Join(errors, "; "))
	}

	finishedAt := time.Now()
	if err := j.updateCleanupRun(ctx, jobId, status, errorMessage, &finishedAt); err != nil {
		logErrorMessage := errorMessage
		runes := []rune(logErrorMessage)
		if len(runes) > maxErrorMessageLength {
			logErrorMessage = string(runes[:maxErrorMessageLength-3]) + "..."
		}
		log.Errorf("Failed to save cleanup run state: %v, jobId: %s, status: %s, errorMessage: %s", err, jobId, status, logErrorMessage)
		return
	}

	log.Infof("Soft deleted data cleanup job %s finished with status '%s'.", jobId, status)
}

func (j *softDeletedDataCleanupJob) updateCleanupRun(ctx context.Context, jobId string, status jobStatus, errorMessage string, finishedAt *time.Time) error {
	updateCtx, cancel := j.createUpdateContext(ctx)
	defer cancel()

	err := j.deletedDataCleanupRepo.UpdateCleanupRun(updateCtx, jobId, string(status), errorMessage, finishedAt)
	if err != nil {
		log.Errorf("failed to set '%s' status for cleanup job id %s: %s", status, jobId, err.Error())
		return err
	}
	return nil
}
