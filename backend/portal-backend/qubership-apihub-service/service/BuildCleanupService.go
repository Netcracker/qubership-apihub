package service

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

const (
	// expiredS3FilesTTLDays must stay above the 30-day retention of failed builds,
	// otherwise the sweep removes files of builds that are still referenced in the database
	expiredS3FilesTTLDays = 45
	// cleanupRunUpdateTimeout bounds the write of the cleanup run result when the phase context is already cancelled
	cleanupRunUpdateTimeout = 10 * time.Second
)

type DBCleanupService interface {
	CreateCleanupJob(schedule string) error
}

func NewDBCleanupService(cleanUpRepository repository.BuildCleanupRepository,
	migrationRepository mRepository.MigrationRunRepository,
	minioStorageService MinioStorageService,
	infoService SystemInfoService) DBCleanupService {
	return &dbCleanupServiceImpl{
		cleanUpRepository:   cleanUpRepository,
		migrationRepository: migrationRepository,
		cron:                cron.New(),
		systemInfoService:   infoService,
		minioStorageService: minioStorageService,
	}
}

type dbCleanupServiceImpl struct {
	cleanUpRepository   repository.BuildCleanupRepository
	migrationRepository mRepository.MigrationRunRepository
	connectionProvider  db.ConnectionProvider
	cron                *cron.Cron
	minioStorageService MinioStorageService
	systemInfoService   SystemInfoService
}

func (c *dbCleanupServiceImpl) CreateCleanupJob(schedule string) error {
	job := BuildCleanupJob{
		schedule:               schedule,
		buildCleanupRepository: c.cleanUpRepository,
		minioStorageService:    c.minioStorageService,
		systemInfoService:      c.systemInfoService,
		migrationRepository:    c.migrationRepository,
	}

	if len(c.cron.Entries()) == 0 {
		location, err := time.LoadLocation("")
		if err != nil {
			return err
		}
		c.cron = cron.New(cron.WithLocation(location))
		c.cron.Start()
	}

	_, err := c.cron.AddJob(schedule, &job)
	if err != nil {
		log.Warnf("[DBCleanupService] Job wasn't added for schedule - %s. With error - %s", schedule, err)
		return err
	}
	log.Infof("[DBCleanupService] Job was created with schedule - %s", schedule)

	return nil
}

type BuildCleanupJob struct {
	schedule               string
	buildCleanupRepository repository.BuildCleanupRepository
	minioStorageService    MinioStorageService
	systemInfoService      SystemInfoService
	migrationRepository    mRepository.MigrationRunRepository
}

func (j BuildCleanupJob) Run() {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(j.systemInfoService.GetBuildsCleanupTimeout())*time.Minute)
	defer cancel()
	scheduledAt := time.Now().Round(time.Second)

	migrations, err := j.migrationRepository.GetRunningMigrations(ctx)
	if err != nil {
		log.Error("Failed to check for running migrations for build cleanup job")
		return
	}
	if migrations != nil && len(migrations) != 0 {
		log.Infof("Cleanup was skipped at %s due to migration run", scheduledAt)
		return
	}

	var runCleanup bool
	var lockId int
	lastCleanup, err := j.buildCleanupRepository.GetLastCleanup(ctx)
	if err != nil {
		log.Errorf("Failed to get last cleanup: %v", err)
		return
	}
	if lastCleanup != nil {
		schedule, err := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow).Parse(j.schedule)
		if err != nil {
			log.Errorf("Failed to parse schedule for cleaning job: %v", err)
			return
		}
		currentTime := time.Now().UTC()
		nextRun := schedule.Next(currentTime)
		interval := nextRun.Sub(currentTime)
		runCleanup = !lastCleanup.ScheduledAt.After(currentTime.Add(-interval))
		lockId = lastCleanup.RunId + 1
	} else {
		runCleanup = true
		lockId = 1
	}

	if runCleanup {
		log.Info("Cleanup job has started")
		err = j.buildCleanupRepository.StoreCleanup(ctx, &entity.BuildCleanupEntity{
			RunId:       lockId,
			ScheduledAt: scheduledAt,
		})
		if err != nil {
			log.Errorf("Failed to store cleanup entity: %v", err)
			return
		}
		if j.systemInfoService.IsMinioStorageActive() {
			if err := j.cleanupOldBuilds(ctx, lockId, scheduledAt); err != nil {
				log.Errorf("Failed to clean up old builds: %v", err)
			}

			j.cleanupExpiredS3Files(lockId)
		} else {
			err = j.buildCleanupRepository.RemoveOldBuildEntities(ctx, lockId, scheduledAt)
			if err != nil {
				log.Errorf("Failed to clean up old builds: %v", err)
				return
			}
		}

		cleanupEnt, err := j.buildCleanupRepository.GetCleanup(ctx, lockId)
		if err != nil {
			log.Errorf("Failed to get cleanup run entity with id %d", lockId)
			return
		}
		log.Infof("Cleanup was performed at %s with results: %v", scheduledAt, *cleanupEnt)
	} else {
		log.Infof("Cleanup was skipped at %s", scheduledAt)
	}
}

func (j BuildCleanupJob) cleanupOldBuilds(ctx context.Context, runId int, scheduledAt time.Time) error {
	ids, err := j.buildCleanupRepository.GetRemoveCandidateOldBuildEntitiesIds(ctx)
	if err != nil {
		return fmt.Errorf("failed to get remove candidate old build ids: %w", err)
	}

	if len(ids) == 0 {
		log.Info("No old build entities to clean up")
		return nil
	}

	if err := j.minioStorageService.RemoveFiles(ctx, view.BUILD_RESULT_TABLE, ids); err != nil {
		return fmt.Errorf("failed to remove old build results from minio storage: %w", err)
	}

	if err := j.buildCleanupRepository.RemoveOldBuildSourcesByIds(ctx, ids, runId, scheduledAt); err != nil {
		return fmt.Errorf("failed to clean up old build sources: %w", err)
	}

	return nil
}

func (j BuildCleanupJob) cleanupExpiredS3Files(runId int) {
	phaseCtx, cancel := context.WithTimeout(context.Background(), time.Duration(j.systemInfoService.GetExpiredS3FilesCleanupTimeout())*time.Minute)
	defer cancel()

	olderThan := time.Now().AddDate(0, 0, -expiredS3FilesTTLDays)
	deletedCount, err := j.minioStorageService.RemoveObjectsOlderThan(phaseCtx, view.BUILD_RESULT_TABLE, olderThan)
	details := ""
	if err != nil {
		log.Errorf("Failed to remove old S3 objects: %v", err)
		details = err.Error()
	}

	updateCtx, updateCancel := context.WithTimeout(context.Background(), cleanupRunUpdateTimeout)
	defer updateCancel()

	if err := j.buildCleanupRepository.UpdateDeletedS3Files(updateCtx, runId, deletedCount, details); err != nil {
		log.Errorf("Failed to update expired s3 files cleanup run: %v", err)
	} else {
		log.Infof("Deleted %d expired S3 objects", deletedCount)
	}
}
