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
	"net/http"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

type DBCleanupService interface {
	CreateCleanupJob(schedule string) error
	StartMigrationBuildDataCleanup() (string, error)
	GetMigrationBuildDataCleanupResult(id string) (interface{}, error)
}

func NewDBCleanupService(cleanUpRepository repository.BuildCleanupRepository,
	migrationRepository mRepository.MigrationRunRepository,
	minioStorageService MinioStorageService,
	infoService SystemInfoService) DBCleanupService {
	return &dbCleanupServiceImpl{
		cleanUpRepository:            cleanUpRepository,
		migrationRepository:          migrationRepository,
		cron:                         cron.New(),
		rmMigrationBuildDataRes:      map[string]interface{}{},
		rmMigrationBuildDataResMutex: sync.RWMutex{},
		systemInfoService:            infoService,
		minioStorageService:          minioStorageService,
	}
}

type dbCleanupServiceImpl struct {
	cleanUpRepository            repository.BuildCleanupRepository
	migrationRepository          mRepository.MigrationRunRepository
	connectionProvider           db.ConnectionProvider
	cron                         *cron.Cron
	rmMigrationBuildDataRes      map[string]interface{}
	rmMigrationBuildDataResMutex sync.RWMutex
	minioStorageService          MinioStorageService
	systemInfoService            SystemInfoService
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
	scheduledAt := time.Now().Round(time.Second)

	migrations, err := j.migrationRepository.GetRunningMigrations()
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
	lastCleanup, err := j.buildCleanupRepository.GetLastCleanup()
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
		err = j.buildCleanupRepository.StoreCleanup(&entity.BuildCleanupEntity{
			RunId:       lockId,
			ScheduledAt: scheduledAt,
		})
		if err != nil {
			log.Errorf("Failed to store cleanup entity: %v", err)
			return
		}
		if j.systemInfoService.IsMinioStorageActive() {
			ctx := context.Background()
			ids, err := j.buildCleanupRepository.GetRemoveCandidateOldBuildEntitiesIds()
			if err != nil {
				log.Errorf("Failed to get up remove candidate old build ids: %v", err)
				return
			}
			err = j.minioStorageService.RemoveFiles(ctx, view.BUILD_RESULT_TABLE, ids)
			if err != nil {
				log.Errorf("Failed to remove old build results from minio storage: %v", err)
				return
			}

			err = j.buildCleanupRepository.RemoveOldBuildSourcesByIds(ctx, ids, lockId, scheduledAt)
			if err != nil {
				log.Errorf("Failed to clean up old builds sources: %v", err)
				return
			}
		} else {
			err = j.buildCleanupRepository.RemoveOldBuildEntities(lockId, scheduledAt)
			if err != nil {
				log.Errorf("Failed to clean up old builds: %v", err)
				return
			}
		}
		//todo uncomment after improving performance of "delete" queries
		// err = j.buildCleanupRepository.RemoveUnreferencedOperationData(lockId)
		// if err != nil {
		// 	log.Errorf("Failed to clean up unreferenced operation data: %v", err)
		// 	return
		// }

		cleanupEnt, err := j.buildCleanupRepository.GetCleanup(lockId)
		if err != nil {
			log.Errorf("Failed to get cleanup run entity with id %d", lockId)
			return
		}
		log.Infof("Cleanup was performed at %s with results: %v", scheduledAt, *cleanupEnt)
	} else {
		log.Infof("Cleanup was skipped at %s", scheduledAt)
	}
}

func (c *dbCleanupServiceImpl) StartMigrationBuildDataCleanup() (string, error) {
	id := uuid.New().String()

	result := map[string]interface{}{}
	result["status"] = "running"

	c.rmMigrationBuildDataResMutex.Lock()
	c.rmMigrationBuildDataRes[id] = result
	c.rmMigrationBuildDataResMutex.Unlock()

	utils.SafeAsync(func() {
		var err error
		var removedRowsCount int
		if c.systemInfoService.IsMinioStorageActive() {
			ctx := context.Background()
			ids, err := c.cleanUpRepository.GetRemoveMigrationBuildIds()
			if err != nil {
				c.saveErrorInfo(result, err, id, removedRowsCount)
			}
			err = c.minioStorageService.RemoveFiles(ctx, view.BUILD_RESULT_TABLE, ids)
			if err != nil {
				c.saveErrorInfo(result, err, id, removedRowsCount)
			}
			removedRowsCount, err = c.cleanUpRepository.RemoveMigrationBuildSourceData(ids)
			if err != nil {
				c.saveErrorInfo(result, err, id, removedRowsCount)
			}
		} else {
			removedRowsCount, err = c.cleanUpRepository.RemoveMigrationBuildData()
		}
		c.saveErrorInfo(result, err, id, removedRowsCount)
	})

	return id, nil
}

func (c *dbCleanupServiceImpl) saveErrorInfo(result map[string]interface{}, err error, id string, removedRowsCount int) {
	c.rmMigrationBuildDataResMutex.Lock()
	if err != nil {
		log.Errorf("Failed to remove migration build data: %s", err)
		result["status"] = "error"
		result["error"] = err
		c.rmMigrationBuildDataRes[id] = result
	} else {
		log.Infof("Removed %d migration build data rows", removedRowsCount)
		result["status"] = "success"
		result["removedRowsCount"] = removedRowsCount
		c.rmMigrationBuildDataRes[id] = result
	}
	c.rmMigrationBuildDataResMutex.Unlock()
}
func (c *dbCleanupServiceImpl) GetMigrationBuildDataCleanupResult(id string) (interface{}, error) {
	c.rmMigrationBuildDataResMutex.RLock()
	defer c.rmMigrationBuildDataResMutex.RUnlock()
	result, exists := c.rmMigrationBuildDataRes[id]
	if !exists {
		return 0, exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UnableToGetMigrationDataCleanupResult,
			Message: exception.UnableToGetMigrationDataCleanupResultMsg,
		}
	}
	return result, nil
}
