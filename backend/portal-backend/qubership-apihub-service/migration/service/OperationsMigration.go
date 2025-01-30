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
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

func (d dbMigrationServiceImpl) MigrateOperations(migrationId string, req mView.MigrationRequest) error {
	log.Infof("Migration started with request: %+v", req)

	//err := d.validateMinRequiredVersion(filesOperationsMigrationVersion)
	//if err != nil {
	//	return err
	//}

	mrEnt := mEntity.MigrationRunEntity{
		Id:                     migrationId,
		StartedAt:              time.Now(),
		Status:                 mView.MigrationStatusRunning,
		Stage:                  "starting",
		PackageIds:             req.PackageIds,
		Versions:               req.Versions,
		IsRebuild:              req.Rebuild,
		CurrentBuilderVersion:  req.CurrentBuilderVersion,
		IsRebuildChangelogOnly: req.RebuildChangelogOnly,
		SkipValidation:         req.SkipValidation,
	}

	_, err = d.cp.GetConnection().Model(&mrEnt).Insert()
	if err != nil {
		return fmt.Errorf("failed to insert MigrationRunEntity: %w", err)
	}

	_, err = d.cp.GetConnection().Exec(`create schema if not exists migration;`)
	if err != nil {
		return err
	}
	_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`create table migration."version_comparison_%s" as select * from version_comparison;`, migrationId))
	if err != nil {
		return err
	}
	_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`create table migration."operation_comparison_%s" as select * from operation_comparison;`, migrationId))
	if err != nil {
		return err
	}
	_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`create index "operation_comparison_%s_comparison_id_index" on migration."operation_comparison_%s" (comparison_id);`, migrationId, migrationId))
	if err != nil {
		return err
	}
	_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`create table migration."expired_ts_operation_data_%s" (package_id varchar, version varchar, revision integer);`, migrationId))
	if err != nil {
		return err
	}
	defer utils.SafeAsync(func() {
		_, err := d.cp.GetConnection().Exec(fmt.Sprintf(`drop table migration."version_comparison_%s";`, migrationId))
		if err != nil {
			log.Errorf("failed to cleanup migration tables: %v", err.Error())
		}
		_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`drop table migration."operation_comparison_%s";`, migrationId))
		if err != nil {
			log.Errorf("failed to cleanup migration tables: %v", err.Error())
		}
		_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`drop table migration."expired_ts_operation_data_%s";`, migrationId))
		if err != nil {
			log.Errorf("failed to cleanup migration tables: %v", err.Error())
		}
	})
	// Need to fill empty created_by column for existing old versions
	fillCreatedBy := `update published_version set created_by = 'unknown' where created_by is null;`
	_, err = d.cp.GetConnection().Exec(fillCreatedBy)
	if err != nil {
		return err
	}

	// Need to cleanup broken versions without content
	err = d.cleanupEmptyVersions()
	if err != nil {
		return err
	}

	if req.Rebuild {
		err = d.cleanForRebuild(req.PackageIds, req.Versions, "")
		if err != nil {
			return err
		}

		if len(req.PackageIds) == 0 && len(req.Versions) == 0 {
			// it means that we're going to rebuild all versions
			// this action will generate a lot of data and may cause DB disk overflow
			// Try to avoid too much space usage by cleaning up all old migration build data
			log.Infof("Starting cleanup before full migration")
			if d.systemInfoService.IsMinioStorageActive() {
				ctx := context.Background()
				ids, err := d.buildCleanupRepository.GetRemoveMigrationBuildIds()
				if err != nil {
					return err
				}
				err = d.minioStorageService.RemoveFiles(ctx, view.BUILD_RESULT_TABLE, ids)
				if err != nil {
					return err
				}
				deleted, err := d.buildCleanupRepository.RemoveMigrationBuildSourceData(ids)
				if err != nil {
					return err
				}
				log.Infof("Cleanup before full migration cleaned up %d entries", deleted)
			} else {
				deleted, err := d.buildCleanupRepository.RemoveMigrationBuildData()
				if err != nil {
					return err
				}
				log.Infof("Cleanup before full migration cleaned up %d entries", deleted)
			}
		}
	}

	// TODO: restart migration by id? stop migration by id?
	// TODO: allow only one migration?

	if req.RebuildChangelogOnly {
		err = d.cleanForRebuild(req.PackageIds, req.Versions, view.ChangelogType)
		if err != nil {
			return err
		}
		err := d.rebuildAllChangelogs(req.PackageIds, req.Versions, migrationId)
		if err != nil {
			migrationStatus := mView.MigrationStatusFailed
			if err.Error() == CancelledMigrationError {
				migrationStatus = mView.MigrationStatusCancelled
			}
			errUpdateMigrationStatus := d.updateMigrationStatus(migrationId, migrationStatus, "")
			if errUpdateMigrationStatus != nil {
				return errUpdateMigrationStatus
			}
			return err
		}
	} else {
		err = d.rebuildAllVersions(req.PackageIds, req.Versions, migrationId)
		if err != nil {
			migrationStatus := mView.MigrationStatusFailed
			if err.Error() == CancelledMigrationError {
				migrationStatus = mView.MigrationStatusCancelled
			}
			errUpdateMigrationStatus := d.updateMigrationStatus(migrationId, migrationStatus, "")
			if errUpdateMigrationStatus != nil {
				return errUpdateMigrationStatus
			}
			return err
		}
	}

	err = d.updateMigrationStatus(migrationId, mView.MigrationStatusComplete, "")
	if err != nil {
		return err
	}
	return nil
}

func (d dbMigrationServiceImpl) GetMigrationReport(migrationId string, includeBuildSamples bool) (*mView.MigrationReport, error) {
	mRunEnt, err := d.repo.GetMigrationRun(migrationId)
	if mRunEnt == nil {
		return nil, fmt.Errorf("migration with id=%s not found", migrationId)
	}

	result := mView.MigrationReport{
		Status:             mRunEnt.Status,
		StartedAt:          mRunEnt.StartedAt,
		ElapsedTime:        time.Since(mRunEnt.StartedAt).String(),
		SuccessBuildsCount: 0,
		ErrorBuildsCount:   0,
		ErrorBuilds:        nil,
	}
	if !mRunEnt.FinishedAt.IsZero() {
		result.ElapsedTime = mRunEnt.FinishedAt.Sub(mRunEnt.StartedAt).String()
		result.FinishedAt = &mRunEnt.FinishedAt
	}

	var migratedVersions []mEntity.MigratedVersionResultEntity
	err = d.cp.GetConnection().Model(&migratedVersions).
		ColumnExpr(`migrated_version.*,
					b.metadata->>'previous_version' previous_version,
					b.metadata->>'previous_version_package_id' previous_version_package_id`).
		Join("inner join build b").
		JoinOn("migrated_version.build_id = b.build_id").
		Where("migrated_version.migration_id = ?", migrationId).
		Select()

	for _, mv := range migratedVersions {
		if mv.Error != "" {
			result.ErrorBuilds = append(result.ErrorBuilds, mView.MigrationError{
				PackageId:                mv.PackageId,
				Version:                  mv.Version,
				Revision:                 mv.Revision,
				Error:                    mv.Error,
				BuildId:                  mv.BuildId,
				BuildType:                mv.BuildType,
				PreviousVersion:          mv.PreviousVersion,
				PreviousVersionPackageId: mv.PreviousVersionPackageId,
			})

			result.ErrorBuildsCount += 1
		} else {
			result.SuccessBuildsCount += 1
		}
	}

	migrationChanges := make(map[string]int)
	_, err = d.cp.GetConnection().Query(pg.Scan(&migrationChanges), `select changes from migration_changes where migration_id = ?`, migrationId)

	for change, count := range migrationChanges {
		migrationChange := mView.MigrationChange{
			ChangedField:        change,
			AffectedBuildsCount: count,
		}
		if includeBuildSamples {
			changedVersion := new(mEntity.MigratedVersionChangesResultEntity)
			err = d.cp.GetConnection().Model(changedVersion).
				ColumnExpr(`migrated_version_changes.*,
						b.metadata->>'build_type' build_type,
						b.metadata->>'previous_version' previous_version,
						b.metadata->>'previous_version_package_id' previous_version_package_id`).
				Join("inner join build b").
				JoinOn("migrated_version_changes.build_id = b.build_id").
				Where("migrated_version_changes.migration_id = ?", migrationId).
				Where("? = any(unique_changes)", change).
				Order("build_id").
				Limit(1).
				Select()
			migrationChange.AffectedBuildSample = mEntity.MakeSuspiciousBuildView(*changedVersion)
		}
		result.MigrationChanges = append(result.MigrationChanges, migrationChange)
	}
	_, err = d.cp.GetConnection().Query(pg.Scan(&result.SuspiciousBuildsCount),
		`select count(*) from migrated_version_changes where migration_id = ?`, migrationId)

	return &result, err
}

func (d dbMigrationServiceImpl) GetSuspiciousBuilds(migrationId string, changedField string, limit int, page int) ([]mView.SuspiciousMigrationBuild, error) {
	changedVersions := make([]mEntity.MigratedVersionChangesResultEntity, 0)
	err := d.cp.GetConnection().Model(&changedVersions).
		ColumnExpr(`migrated_version_changes.*,
				b.metadata->>'build_type' build_type,
				b.metadata->>'previous_version' previous_version,
				b.metadata->>'previous_version_package_id' previous_version_package_id`).
		Join("inner join build b").
		JoinOn("migrated_version_changes.build_id = b.build_id").
		Where("migrated_version_changes.migration_id = ?", migrationId).
		Where("(? = '') or (? = any(unique_changes))", changedField, changedField).
		Order("build_id").
		Limit(limit).
		Offset(limit * page).
		Select()
	if err != nil {
		return nil, err
	}
	suspiciousBuilds := make([]mView.SuspiciousMigrationBuild, 0)
	for _, changedVersion := range changedVersions {
		suspiciousBuilds = append(suspiciousBuilds, *mEntity.MakeSuspiciousBuildView(changedVersion))
	}
	return suspiciousBuilds, nil
}

func (d dbMigrationServiceImpl) rebuildAllVersions(packageIds []string, versionsIn []string, migrationId string) error {
	err := d.updateMigrationStatus(migrationId, "", "rebuildAllRevisions_start")
	if err != nil {
		return err
	}

	getLatestIndependentVersionsQuery := makeLatestIndependentVersionsQuery(packageIds, versionsIn)
	getNotLatestVersionsQuery := makeNotLatestVersionsQuery(packageIds, versionsIn)

	var independentVersions []entity.PublishedVersionEntity
	var dependentVersions []entity.PublishedVersionEntity

	_, err = queryWithRetry(d.cp.GetConnection(), &independentVersions, getLatestIndependentVersionsQuery)
	if err != nil {
		log.Errorf("Failed to read latest versions: %v", err.Error())
		return err
	}
	if len(independentVersions) <= 0 {
		_, err = queryWithRetry(d.cp.GetConnection(), &dependentVersions, getNotLatestVersionsQuery)
		if err != nil {
			log.Errorf("Failed to read non-latest versions: %v", err.Error())
			return err
		}
	}

	iteration := 0
	migrationCancelled := false
MigrationProcess:
	for len(independentVersions) > 0 || len(dependentVersions) > 0 {
		iteration += 1

		// TODO: add better logging with iteration number, etc

		round := 0
		var versionsThisRound int

		for len(independentVersions) > 0 {
			versionsThisRound = len(independentVersions)
			round = round + 1
			buildsMap := make(map[string]entity.PublishedVersionEntity, 0)
			log.Debugf("Start adding tasks to rebuild %v versions. Round: %v", versionsThisRound, round)
			err := d.updateMigrationStatus(migrationId, "", "rebuildIndependentVersions_adding_tasks_round_"+strconv.Itoa(round))
			if err != nil {
				return err
			}
			noChangelog := false
			for i, versionEnt := range independentVersions {
				log.Infof("[%v / %v] addTaskToRebuild start. Version: %v@%v@%v", i+1, versionsThisRound, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
				buildId, err := d.addTaskToRebuild(migrationId, versionEnt, noChangelog)
				if err != nil {
					log.Errorf("[%v / %v] Failed to add task to rebuild version: %v", i+1, versionsThisRound, err.Error())

					mvEnt := mEntity.MigratedVersionEntity{
						PackageId:   versionEnt.PackageId,
						Version:     versionEnt.Version,
						Revision:    versionEnt.Revision,
						Error:       fmt.Sprintf("addTaskToRebuild failed: %v", err.Error()),
						BuildId:     buildId,
						MigrationId: migrationId,
						BuildType:   view.BuildType,
						NoChangelog: noChangelog,
					}
					_, err := d.cp.GetConnection().Model(&mvEnt).Insert()
					if err != nil {
						log.Errorf("[%v / %v] Failed to store error for %v@%v@%v : %v", i+1, versionsThisRound, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, err.Error())
						continue
					}
				} else {
					buildsMap[buildId] = versionEnt
					log.Infof("[%v / %v] addTaskToRebuild complete. BuildId: %v. Version %v@%v@%v NoChangelog: %v", i+1, versionsThisRound, buildId, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, noChangelog)
				}
			}
			err = d.updateMigrationStatus(migrationId, "", "rebuildIndependentVersions_waiting_builds_round_"+strconv.Itoa(round))
			if err != nil {
				return err
			}
			log.Infof("Waiting for all builds to finish. Round: %v", round)
			buildsThisRound := len(buildsMap)
			finishedBuilds := 0
			for len(buildsMap) > 0 {
				log.Infof("Finished builds: %v / %v. Round: %v", finishedBuilds, buildsThisRound, round)
				time.Sleep(15 * time.Second)
				buildIdsList := getMapKeys(buildsMap)
				buildEnts, err := d.getBuilds(buildIdsList)
				if err != nil {
					log.Errorf("Failed to get builds statuses: %v", err.Error())
					return err
				}
				for _, buildEnt := range buildEnts {
					buildVersion := strings.Split(buildEnt.Version, "@")[0]
					buildRevision := strings.Split(buildEnt.Version, "@")[1]
					buildPackageId := buildEnt.PackageId

					buildRevisionInt := 1

					mvEnt := mEntity.MigratedVersionEntity{
						PackageId:   buildPackageId,
						Version:     buildVersion,
						Revision:    buildRevisionInt,
						Error:       "",
						BuildId:     buildEnt.BuildId,
						MigrationId: migrationId,
						BuildType:   view.BuildType,
						NoChangelog: noChangelog,
					}

					if buildRevision != "" {
						buildRevisionInt, err = strconv.Atoi(buildRevision)
						if err != nil {
							mvEnt.Error = fmt.Sprintf("Unable to convert revision value '%s' to int", buildRevision)
							_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
							if err != nil {
								log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
							}
							continue
						}
						mvEnt.Revision = buildRevisionInt
					}

					if buildEnt.Status == string(view.StatusComplete) {
						finishedBuilds = finishedBuilds + 1
						delete(buildsMap, buildEnt.BuildId)
						_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
						if err != nil {
							log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
						}
						continue
					}
					if buildEnt.Status == string(view.StatusError) {
						if buildEnt.Details == CancelledMigrationError {
							migrationCancelled = true
							break MigrationProcess
						}

						finishedBuilds = finishedBuilds + 1

						errorDetails := buildEnt.Details
						if errorDetails == "" {
							errorDetails = "No error details.."
						}

						delete(buildsMap, buildEnt.BuildId)

						log.Errorf("Builder failed to build %v. Details: %v", buildEnt.BuildId, errorDetails)

						mvEnt.Error = errorDetails

						_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
						if err != nil {
							log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
						}
						continue
					}
				}
			}
			_, err = queryWithRetry(d.cp.GetConnection(), &independentVersions, getLatestIndependentVersionsQuery)
			if err != nil {
				log.Errorf("Failed to read latest versions: %v", err.Error())
				return err
			}
		}

		//////////////////////////

		_, err = queryWithRetry(d.cp.GetConnection(), &dependentVersions, getNotLatestVersionsQuery)
		if err != nil {
			log.Errorf("Failed to read non-latest versions: %v", err.Error())
			return err
		}

		totalNumberOfVersions := len(dependentVersions)
		buildsMap := make(map[string]entity.PublishedVersionEntity, 0)
		noChangelog := true
		err = d.updateMigrationStatus(migrationId, "", "rebuildNotLatestRevisions_adding_builds")
		if err != nil {
			return err
		}

		log.Infof("Start adding tasks to rebuild %v versions.", totalNumberOfVersions)

		for i, versionEnt := range dependentVersions {
			log.Debugf("[%v / %v] addTaskToRebuild start. Version: %v@%v@%v", i+1, totalNumberOfVersions, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)

			buildId, err := d.addTaskToRebuild(migrationId, versionEnt, noChangelog)
			if err != nil {
				log.Errorf("[%v / %v] Failed to add task to rebuild version: %v", i+1, totalNumberOfVersions, err.Error())

				mvEnt := mEntity.MigratedVersionEntity{
					PackageId:   versionEnt.PackageId,
					Version:     versionEnt.Version,
					Revision:    versionEnt.Revision,
					Error:       fmt.Sprintf("addTaskToRebuild failed: %v", err.Error()),
					BuildId:     buildId,
					MigrationId: migrationId,
					BuildType:   view.BuildType,
					NoChangelog: noChangelog,
				}
				_, err := d.cp.GetConnection().Model(&mvEnt).Insert()
				if err != nil {
					log.Errorf("[%v / %v] Failed to store error for %v@%v@%v : %v", i+1, totalNumberOfVersions, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, err.Error())
					continue
				}
			} else {
				log.Infof("[%v / %v] addTaskToRebuild complete. BuildId: %v. Version %v@%v@%v NoChangelog: %v", i+1, totalNumberOfVersions, buildId, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, noChangelog)
				buildsMap[buildId] = versionEnt
			}
		}
		err = d.updateMigrationStatus(migrationId, "", "rebuildNotLatestRevisions_waiting_builds")
		if err != nil {
			return err
		}

		log.Info("Waiting for all builds to finish.")
		buildsThisRound := len(buildsMap)
		finishedBuilds := 0
		getBuildsFails := 0
		for len(buildsMap) > 0 {
			log.Infof("Finished builds: %v / %v.", finishedBuilds, buildsThisRound)
			time.Sleep(15 * time.Second)
			buildIdsList := getMapKeys(buildsMap)
			buildEnts, err := d.getBuilds(buildIdsList)
			if err != nil {
				log.Errorf("Failed to get builds statuses: %v", err.Error())
				// Try to wait in case of *temporary* DB outage for ~5 min
				getBuildsFails += 1
				if getBuildsFails > 20 {
					return err
				}
			}
			getBuildsFails = 0
			for _, buildEnt := range buildEnts {
				buildVersion := strings.Split(buildEnt.Version, "@")[0]
				buildRevision := strings.Split(buildEnt.Version, "@")[1]
				buildPackageId := buildEnt.PackageId

				buildRevisionInt := 1
				mvEnt := mEntity.MigratedVersionEntity{
					PackageId:   buildPackageId,
					Version:     buildVersion,
					Revision:    buildRevisionInt,
					Error:       "",
					BuildId:     buildEnt.BuildId,
					MigrationId: migrationId,
					BuildType:   view.BuildType,
					NoChangelog: noChangelog,
				}

				if buildRevision != "" {
					buildRevisionInt, err = strconv.Atoi(buildRevision)
					if err != nil {
						mvEnt.Error = fmt.Sprintf("Unable to convert revision value '%s' to int", buildRevision)
						_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
						if err != nil {
							log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
						}
						continue
					}
					mvEnt.Revision = buildRevisionInt
				}

				if buildEnt.Status == string(view.StatusComplete) {
					finishedBuilds = finishedBuilds + 1

					delete(buildsMap, buildEnt.BuildId)
					_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
					if err != nil {
						log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
					}
					continue
				}
				if buildEnt.Status == string(view.StatusError) {
					if buildEnt.Details == CancelledMigrationError {
						migrationCancelled = true
						break MigrationProcess
					}

					finishedBuilds = finishedBuilds + 1

					errorDetails := buildEnt.Details
					if errorDetails == "" {
						errorDetails = "No error details.."
					}

					delete(buildsMap, buildEnt.BuildId)

					log.Errorf("Builder failed to build %v. Details: %v", buildEnt.BuildId, errorDetails)

					mvEnt.Error = errorDetails

					_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
					if err != nil {
						log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
					}
					continue
				}
			}
		}

		/////////////////////

		_, err = queryWithRetry(d.cp.GetConnection(), &independentVersions, getLatestIndependentVersionsQuery)
		if err != nil {
			log.Errorf("Failed to read latest versions: %v", err.Error())
			return err
		}

		////////////////////

	}
	log.Info("Finished rebuilding all versions")

	if migrationCancelled {
		return fmt.Errorf(CancelledMigrationError)
	}
	err = d.rebuildChangelogsAfterVersionsMigrations(migrationId)
	if err != nil {
		log.Errorf("Failed to rebuildChangelogsAfterVersionsMigrations: %v", err.Error())
		return err
	}

	err = d.rebuildTextSearchTables(migrationId)
	if err != nil {
		log.Errorf("Failed to rebuildTextSearchTables: %v", err.Error())
		return err
	}
	return nil
}

func (d dbMigrationServiceImpl) updateMigrationStatus(migrationId string, status string, stage string) error {
	mEnt, err := d.repo.GetMigrationRun(migrationId)
	if err != nil {
		return err
	}
	if status != "" {
		if status == mView.MigrationStatusComplete || status == mView.MigrationStatusFailed {
			mEnt.FinishedAt = time.Now()
		}
		mEnt.Status = status
	}
	if stage != "" {
		mEnt.Stage = stage
	}
	return d.repo.UpdateMigrationRun(mEnt)
}

func (d dbMigrationServiceImpl) rebuildAllChangelogs(packageIds []string, versionsIn []string, migrationId string) error {
	changelogQuery := makeAllChangelogForMigrationQuery(packageIds, versionsIn)
	var migrationChangelogEntities []mEntity.MigrationChangelogEntity

	_, err := queryWithRetry(d.cp.GetConnection(), &migrationChangelogEntities, changelogQuery)
	if err != nil {
		log.Errorf("Failed to get migrationChangelogEntities: %v", err.Error())
		return err
	}
	err = d.rebuildChangelog(migrationChangelogEntities, migrationId)
	if err != nil {
		log.Errorf("Failed to rebuildChangelog: %v", err.Error())
		return err
	}
	return nil
}

func (d dbMigrationServiceImpl) rebuildChangelogsAfterVersionsMigrations(migrationId string) error {
	changelogQuery := makeChangelogByMigratedVersionQuery(migrationId)
	var migrationChangelogEntities []mEntity.MigrationChangelogEntity
	_, err := queryWithRetry(d.cp.GetConnection(), &migrationChangelogEntities, changelogQuery)
	if err != nil {
		log.Errorf("Failed to get migrationChangelogEntities: %v", err.Error())
		return err
	}
	err = d.rebuildChangelog(migrationChangelogEntities, migrationId)
	if err != nil {
		log.Errorf("Failed to rebuildChangelog: %v", err.Error())
		return err
	}
	return nil
}

func (d dbMigrationServiceImpl) rebuildChangelog(migrationChangelogs []mEntity.MigrationChangelogEntity, migrationId string) error {
	err := d.updateMigrationStatus(migrationId, "", "rebuildChangelogs_start")
	if err != nil {
		return err
	}

	buildsMap := make(map[string]interface{}, 0)
	err = d.updateMigrationStatus(migrationId, "", "rebuildChangelogs_adding_builds")
	if err != nil {
		return err
	}
	for _, changelogEntity := range migrationChangelogs {
		buildId, err := d.addChangelogTaskToRebuild(migrationId, changelogEntity)
		if err != nil {
			log.Errorf("Failed to add task to rebuild changelog. Package - %s. Version - %s. Revision - %d.Error - %v", changelogEntity.PackageId, changelogEntity.Version, changelogEntity.Revision, err.Error())
			mvEnt := mEntity.MigratedVersionEntity{
				PackageId:   changelogEntity.PackageId,
				Version:     changelogEntity.Version,
				Revision:    changelogEntity.Revision,
				Error:       fmt.Sprintf("addChangelogTaskToRebuild failed: %v", err.Error()),
				BuildId:     buildId,
				MigrationId: migrationId,
				BuildType:   view.ChangelogType,
			}
			_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
			if err != nil {
				log.Errorf("Failed to store error for %v@%v@%v : %s", changelogEntity.PackageId, changelogEntity.Version, changelogEntity.Revision, err.Error())
				continue
			}
		}
		buildsMap[buildId] = changelogEntity
		log.Infof("addChangelogTaskToRebuild end. BuildId: %s", buildId)
	}
	err = d.updateMigrationStatus(migrationId, "", "rebuildChangelogs_waiting_builds")
	if err != nil {
		return err
	}
	log.Info("Waiting for all builds to finish.")
	buildsThisRound := len(buildsMap)
	finishedBuilds := 0
	migrationCancelled := false
MigrationProcess:
	for len(buildsMap) > 0 {
		log.Infof("Finished builds: %v / %v.", finishedBuilds, buildsThisRound)
		time.Sleep(15 * time.Second)
		buildIdsList := getMapKeysGeneric(buildsMap)
		buildEnts, err := d.getBuilds(buildIdsList)
		if err != nil {
			log.Errorf("Failed to get builds statuses: %v", err.Error())
			return err
		}
		for _, buildEnt := range buildEnts {
			buildVersion := strings.Split(buildEnt.Version, "@")[0]
			buildRevision := strings.Split(buildEnt.Version, "@")[1]
			buildPackageId := buildEnt.PackageId

			buildRevisionInt := 1

			mvEnt := mEntity.MigratedVersionEntity{
				PackageId:   buildPackageId,
				Version:     buildVersion,
				Revision:    buildRevisionInt,
				Error:       "",
				BuildId:     buildEnt.BuildId,
				MigrationId: migrationId,
				BuildType:   view.ChangelogType,
			}

			if buildRevision != "" {
				buildRevisionInt, err = strconv.Atoi(buildRevision)
				if err != nil {
					mvEnt.Error = fmt.Sprintf("Unable to convert revision value '%s' to int", buildRevision)
					_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
					if err != nil {
						log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
					}
					continue
				}
				mvEnt.Revision = buildRevisionInt
			}

			if buildEnt.Status == string(view.StatusComplete) {
				finishedBuilds = finishedBuilds + 1
				delete(buildsMap, buildEnt.BuildId)
				_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
				if err != nil {
					log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
				}
				continue
			}
			if buildEnt.Status == string(view.StatusError) {
				if buildEnt.Details == CancelledMigrationError {
					migrationCancelled = true
					break MigrationProcess
				}

				finishedBuilds = finishedBuilds + 1

				errorDetails := buildEnt.Details
				if errorDetails == "" {
					errorDetails = "No error details.."
				}

				delete(buildsMap, buildEnt.BuildId)

				log.Errorf("Builder failed to build %v. Details: %v", buildEnt.BuildId, errorDetails)

				mvEnt.Error = errorDetails

				_, err = d.cp.GetConnection().Model(&mvEnt).Insert()
				if err != nil {
					log.Errorf("failed to store MigratedVersionEntity %+v: %s", mvEnt, err)
				}
				continue
			}
		}
	}
	log.Info("Finished rebuilding changelogs")
	if migrationCancelled {
		return fmt.Errorf(CancelledMigrationError)
	}
	return nil
}

func (d dbMigrationServiceImpl) rebuildTextSearchTables(migrationId string) error {
	err := d.updateMigrationStatus(migrationId, "", "rebuildTextSearchTables_start")
	if err != nil {
		return err
	}
	log.Info("Start rebuilding text search tables for changed search scopes")

	log.Info("Calculating ts_rest_operation_data")
	calculateRestTextSearchDataQuery := fmt.Sprintf(`
	insert into ts_rest_operation_data
		select data_hash,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_request,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_response,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_annotation,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_properties,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_examples
		from operation_data
		where data_hash in (
			select distinct o.data_hash 
			from operation o 
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
			where o.type = ?
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update 
	set scope_request = EXCLUDED.scope_request,
	scope_response = EXCLUDED.scope_response,
	scope_annotation = EXCLUDED.scope_annotation,
	scope_properties = EXCLUDED.scope_properties,
	scope_examples = EXCLUDED.scope_examples;`, migrationId)
	_, err = d.cp.GetConnection().Exec(calculateRestTextSearchDataQuery,
		view.RestScopeRequest, view.RestScopeResponse, view.RestScopeAnnotation, view.RestScopeProperties, view.RestScopeExamples,
		view.RestApiType)
	if err != nil {
		return fmt.Errorf("failed to calculate ts_rest_operation_data: %w", err)
	}

	log.Info("Calculating ts_graphql_operation_data")
	calculateGraphqlTextSearchDataQuery := fmt.Sprintf(`
	insert into ts_graphql_operation_data
		select data_hash,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_argument,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_property,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_annotation
		from operation_data
		where data_hash in (
			select distinct o.data_hash 
			from operation o 
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
			where o.type = ?
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update 
	set scope_argument = EXCLUDED.scope_argument,
	scope_property = EXCLUDED.scope_property,
	scope_annotation = EXCLUDED.scope_annotation;`, migrationId)
	_, err = d.cp.GetConnection().Exec(calculateGraphqlTextSearchDataQuery,
		view.GraphqlScopeArgument, view.GraphqlScopeProperty, view.GraphqlScopeAnnotation,
		view.GraphqlApiType)
	if err != nil {
		return fmt.Errorf("failed to calculate ts_grahpql_operation_data: %w", err)
	}

	log.Info("Calculating ts_operation_data")
	calculateAllTextSearchDataQuery := fmt.Sprintf(`
	insert into ts_operation_data
		select data_hash,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_all
		from operation_data
		where data_hash in (
			select distinct o.data_hash 
			from operation o 
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update 
	set scope_all = EXCLUDED.scope_all`, migrationId)
	_, err = d.cp.GetConnection().Exec(calculateAllTextSearchDataQuery, view.ScopeAll)
	if err != nil {
		return fmt.Errorf("failed to calculate ts_operation_data: %w", err)
	}
	log.Info("Finished rebuilding text search tables for changed search scopes")
	err = d.updateMigrationStatus(migrationId, "", "rebuildTextSearchTables_end")
	if err != nil {
		return err
	}
	return nil
}
