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

package cleanup

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

const (
	defaultCleanupJobTimeout = 48 * time.Hour
	cleanupJobTimeoutBuffer  = 1 * time.Hour
)

type CleanupService interface {
	ClearTestData(testId string) error
	CreateRevisionsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, versionCleanupRepo repository.VersionCleanupRepository, monitoringService service.MonitoringService, lockService service.LockService, instanceId string, schedule string, deleteLastRevision bool, deleteReleaseRevision bool, ttl int) error
	CreateComparisonsCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, comparisonCleanupRepo repository.ComparisonCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error
	CreateSoftDeletedDataCleanupJob(publishedRepo repository.PublishedRepository, migrationRepository mRepository.MigrationRunRepository, deletedDataCleanupRepo repository.SoftDeletedDataCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int, ttl int) error
	CreateUnreferencedDataCleanupJob(migrationRepository mRepository.MigrationRunRepository, unreferencedDataCleanupRepo repository.UnreferencedDataCleanupRepository, lockService service.LockService, instanceId string, schedule string, timeoutMinutes int) error
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
	//clear tables: package_group
	_, err := c.cp.GetConnection().Model(&entity.PackageEntity{}).
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
		return timeout
	}

	timeout := interval - cleanupJobTimeoutBuffer
	log.Infof("Calculated cleanup job timeout for %s cleanup job with schedule '%s': %v (interval: %v)",
		jobType, schedule, timeout, interval)
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
