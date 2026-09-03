package cleanup

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

const (
	defaultCleanupJobTimeout = 48 * time.Hour
	cleanupJobTimeoutBuffer  = 1 * time.Hour
	maxRevisionsJobTimeout   = 4 * time.Hour
)

type CleanupService interface {
	ClearTestData(ctx context.Context, testId string) error
	CreateRevisionsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, versionCleanupRepo repository.VersionCleanupRepository, monitoringService service.MonitoringService, lockService service.LockService, instanceId string, schedule string, deleteLastRevision bool, deleteReleaseRevision bool, ttl int) error
	CreateComparisonsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, comparisonCleanupRepo repository.ComparisonCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error
	CreateSoftDeletedDataCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error
	CreateUnreferencedDataCleanupJob(migrationRepository mRepository.MigrationRunRepository, unreferencedDataCleanupRepo repository.UnreferencedDataCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int) error
	CreateMaintenanceVacuumCleanupJob(migrationRepository mRepository.MigrationRunRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int) error
}

func NewCleanupService(cp db.ConnectionProvider) CleanupService {
	return &cleanupServiceImpl{cp: cp, cron: cron.New()}
}

type cleanupServiceImpl struct {
	cp   db.ConnectionProvider
	cron *cron.Cron
}

func (c cleanupServiceImpl) ClearTestData(ctx context.Context, testId string) error {
	idFilter := testPackageIdLikeFilter(testId)
	userFilter := testUserIdLikeFilter(testId)

	return c.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		started := time.Now()
		logStep := func(step string) {
			log.Debugf("ClearTestData testId=%s step=%s duration=%s", testId, step, time.Since(started))
			started = time.Now()
		}

		var packageIds []string
		_, err := tx.QueryContext(ctx, &packageIds, `
			WITH RECURSIVE pkgs AS (
				SELECT id FROM package_group WHERE id LIKE ?
				UNION
				SELECT pg.id FROM package_group pg
				INNER JOIN pkgs ON pg.parent_id = pkgs.id
			)
			SELECT id FROM pkgs`, idFilter)
		if err != nil {
			return err
		}
		logStep("select package ids")

		if len(packageIds) > 0 {
			var checksums []string
			_, err = tx.QueryContext(ctx, &checksums, `
				SELECT DISTINCT archive_checksum
				FROM published_sources
				WHERE package_id IN (?) AND archive_checksum IS NOT NULL AND archive_checksum <> ''`, pg.In(packageIds))
			if err != nil {
				return err
			}
			checksums = nonemptyStrings(checksums)
			logStep("select archive checksums")

			_, err = tx.ExecContext(ctx, `DELETE FROM version_comparison WHERE package_id IN (?)`, pg.In(packageIds))
			if err != nil {
				return err
			}
			logStep("delete version_comparison by package_id")

			_, err = tx.ExecContext(ctx, `DELETE FROM version_comparison WHERE previous_package_id IN (?)`, pg.In(packageIds))
			if err != nil {
				return err
			}
			logStep("delete version_comparison by previous_package_id")

			_, err = tx.ModelContext(ctx, (*entity.ApihubApiKeyEntity)(nil)).
				Where("package_id IN (?)", pg.In(packageIds)).
				ForceDelete()
			if err != nil {
				return err
			}
			logStep("delete apihub_api_keys")

			_, err = tx.ExecContext(ctx, `DELETE FROM package_group WHERE id IN (?)`, pg.In(packageIds))
			if err != nil {
				return err
			}
			logStep("delete package_group")

			// Delete only archives that belonged to the removed test packages and are no longer referenced.
			// Global orphan GC belongs to the unreferenced-data cleanup job, not this test endpoint.
			if len(checksums) > 0 {
				_, err = tx.ExecContext(ctx, `
					DELETE FROM published_sources_archives psa
					WHERE psa.checksum IN (?)
					AND NOT EXISTS (
						SELECT 1 FROM published_sources ps WHERE ps.archive_checksum = psa.checksum
					)`, pg.In(checksums))
				if err != nil {
					return err
				}
				logStep("delete unreferenced test archives")
			}
		}

		_, err = tx.ModelContext(ctx, (*entity.PackageMemberRoleEntity)(nil)).
			Where("user_id ILIKE ?", userFilter).
			ForceDelete()
		if err != nil {
			return err
		}
		logStep("delete package_member_role")

		_, err = tx.ModelContext(ctx, (*entity.PersonaAccessTokenEntity)(nil)).
			Where("user_id ILIKE ?", userFilter).
			ForceDelete()
		if err != nil {
			return err
		}
		logStep("delete personal_access_tokens")

		_, err = tx.ModelContext(ctx, (*entity.UserEntity)(nil)).
			Where("user_id ILIKE ?", userFilter).
			ForceDelete()
		if err != nil {
			return err
		}
		logStep("delete user_data")

		// TODO: need to clear business metrics as well

		return nil
	})
}

func testPackageIdLikeFilter(testId string) string {
	return "QS%-" + utils.LikeEscaped(testId) + "%"
}

func testUserIdLikeFilter(testId string) string {
	return "%" + utils.LikeEscaped(testId) + "%"
}

func nonemptyStrings(values []string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func (c cleanupServiceImpl) CreateRevisionsCleanupJob(publishedRepository repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, versionCleanupRepository repository.VersionCleanupRepository, monitoringService service.MonitoringService, lockService service.LockService, instanceId string, schedule string, deleteLastRevision bool, deleteReleaseRevision bool, ttl int) error {
	timeout := c.calculateCleanupJobTimeout(schedule, revisionsCleanup)
	config := jobConfig{
		jobType:    revisionsCleanup,
		instanceId: instanceId,
		ttl:        ttl,
		timeout:    timeout,
	}
	processor := NewRevisionsCleanupJobProcessor(
		publishedRepository,
		versionCleanupRepository,
		monitoringService,
		deleteLastRevision,
		deleteReleaseRevision,
	)
	runner := &JobRunner{
		cp:                  c.cp,
		migrationRepository: migrationRepository,
		lockService:         lockService,
		config:              config,
		processor:           processor,
	}
	return c.addCleanupJob(runner, schedule, revisionsCleanup)
}

func (c cleanupServiceImpl) calculateCleanupJobTimeout(schedule string, jobType jobType) time.Duration {
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
		return c.limitCleanupJobTimeout(jobType, timeout)
	}

	timeout := interval - cleanupJobTimeoutBuffer
	log.Infof("Calculated cleanup job timeout for %s cleanup job with schedule '%s': %v (interval: %v)",
		jobType, schedule, timeout, interval)
	return c.limitCleanupJobTimeout(jobType, timeout)
}

func (c cleanupServiceImpl) limitCleanupJobTimeout(jobType jobType, timeout time.Duration) time.Duration {
	if jobType == revisionsCleanup && timeout > maxRevisionsJobTimeout {
		log.Infof("Capping timeout for %s cleanup job from %v to %v", jobType, timeout, maxRevisionsJobTimeout)
		return maxRevisionsJobTimeout
	}
	return timeout
}

func (c cleanupServiceImpl) CreateComparisonsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, comparisonCleanupRepo repository.ComparisonCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error {
	timeout := time.Duration(timeoutMinutes) * time.Minute
	config := jobConfig{
		jobType:    comparisonsCleanup,
		instanceId: instanceId,
		ttl:        ttl,
		timeout:    timeout,
	}
	processor := NewComparisonsCleanupJobProcessor(
		publishedRepo,
		comparisonCleanupRepo,
	)
	runner := &JobRunner{
		cp:                  c.cp,
		migrationRepository: migrationRepository,
		lockService:         lockService,
		config:              config,
		processor:           processor,
	}
	return c.addCleanupJob(runner, schedule, comparisonsCleanup)
}

func (c cleanupServiceImpl) CreateSoftDeletedDataCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error {
	timeout := time.Duration(timeoutMinutes) * time.Minute
	config := jobConfig{
		jobType:    deletedDataCleanup,
		instanceId: instanceId,
		ttl:        ttl,
		timeout:    timeout,
	}
	processor := NewSoftDeletedDataJobProcessor(
		publishedRepo,
		deletedDataCleanupRepo,
	)
	runner := &JobRunner{
		cp:                  c.cp,
		migrationRepository: migrationRepository,
		lockService:         lockService,
		config:              config,
		processor:           processor,
	}
	return c.addCleanupJob(runner, schedule, deletedDataCleanup)
}

func (c cleanupServiceImpl) CreateUnreferencedDataCleanupJob(migrationRepository mRepository.MigrationRunRepository, unreferencedDataCleanupRepo repository.UnreferencedDataCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int) error {
	timeout := time.Duration(timeoutMinutes) * time.Minute
	config := jobConfig{
		jobType:    unreferencedDataCleanup,
		instanceId: instanceId,
		ttl:        0,
		timeout:    timeout,
	}
	processor := NewUnreferencedDataJobProcessor(
		unreferencedDataCleanupRepo,
	)
	runner := &JobRunner{
		cp:                  c.cp,
		migrationRepository: migrationRepository,
		lockService:         lockService,
		config:              config,
		processor:           processor,
	}
	return c.addCleanupJob(runner, schedule, unreferencedDataCleanup)
}

func (c cleanupServiceImpl) CreateMaintenanceVacuumCleanupJob(migrationRepository mRepository.MigrationRunRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int) error {
	config := jobConfig{
		jobType:    maintenanceVacuum,
		instanceId: instanceId,
		ttl:        0,
		timeout:    0,
	}
	processor := NewMaintenanceVacuumCleanupJobProcessor(c.cp, timeoutMinutes)
	runner := &JobRunner{
		cp:                  c.cp,
		migrationRepository: migrationRepository,
		lockService:         lockService,
		config:              config,
		processor:           processor,
	}
	return c.addCleanupJob(runner, schedule, maintenanceVacuum)
}

func (c cleanupServiceImpl) addCleanupJob(job cron.Job, schedule string, jobType jobType) error {
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
		log.Warnf("%s job wasn't added for schedule - %s. With error - %s", jobType, schedule, err)
		return err
	}
	log.Infof("%s job was created with schedule - %s", jobType, schedule)

	return nil
}
