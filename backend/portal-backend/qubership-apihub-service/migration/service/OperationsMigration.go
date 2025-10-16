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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/stages"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"

	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

func (d *dbMigrationServiceImpl) StartMigrateOperations(req mView.MigrationRequest) (string, error) {
	migrationId := uuid.New().String()

	log.Infof("Starting migration with request: %+v, generated id = %s", req, migrationId)

	var om *stages.OpsMigration

	err := d.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		// Allow only one migration.
		var ents []mEntity.MigrationRunEntity
		err := tx.Model(&ents).Where("status=?", mView.MigrationStatusRunning).Select()
		if err != nil {
			return err
		}

		if len(ents) > 0 {
			return &exception.CustomError{
				Status:  http.StatusConflict,
				Code:    exception.OperationsMigrationConflict,
				Message: exception.OperationsMigrationConflictMsg,
				Params:  map[string]interface{}{"reason": "migration is already running"},
			}
		}

		var lastSeqNum int
		_, err = tx.Query(pg.Scan(&lastSeqNum), "SELECT COALESCE(MAX(sequence_number), 0) FROM migration_run")
		if err != nil {
			return fmt.Errorf("failed to get current sequence number: %w", err)
		}

		mrEnt := mEntity.MigrationRunEntity{
			Id:                     migrationId,
			StartedAt:              time.Now(),
			Status:                 mView.MigrationStatusRunning,
			Stage:                  mView.MigrationStageStarting,
			PackageIds:             req.PackageIds,
			Versions:               req.Versions,
			IsRebuildChangelogOnly: req.RebuildChangelogOnly,
			SkipValidation:         req.SkipValidation,
			InstanceId:             d.instanceId,
			SequenceNumber:         lastSeqNum + 1,
		}

		result, err := tx.Model(&mrEnt).
			OnConflict("(sequence_number) DO NOTHING").
			Insert()

		if err != nil {
			return fmt.Errorf("failed to insert MigrationRunEntity: %w", err)
		}

		if result.RowsAffected() == 0 {
			return &exception.CustomError{
				Status:  http.StatusConflict,
				Code:    exception.OperationsMigrationConflict,
				Message: exception.OperationsMigrationConflictMsg,
				Params:  map[string]interface{}{"reason": "concurrent migration start detected"},
			}
		}

		om = stages.NewOpsMigration(d.cp, d.systemInfoService, d.minioStorageService, d.repo, d.buildCleanupRepository, mrEnt)

		return nil
	})
	if err != nil {
		return "", err
	}

	utils.SafeAsync(func() {
		if om != nil {
			om.Start()
		} else {
			log.Errorf("Failed to start operations migration: FSM is nil!")
		}
	})

	return migrationId, err
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
		ErrorDetails:       mRunEnt.ErrorDetails,
		ErrorBuilds:        nil,
	}
	if mRunEnt.PostCheckResult != nil {
		result.PostCheckResult = mEntity.MakePostCheckResultView(*mRunEnt.PostCheckResult)
	}
	if !mRunEnt.FinishedAt.IsZero() {
		result.ElapsedTime = mRunEnt.FinishedAt.Sub(mRunEnt.StartedAt).String()
		result.FinishedAt = &mRunEnt.FinishedAt
	}

	var migrationBuilds []mEntity.MigrationBuildResultEntity
	err = d.cp.GetConnection().Model(&migrationBuilds).
		ColumnExpr(`build.build_id, build.package_id, build.status, build.details,
					split_part(build.version, '@', 1) as version,
					cast(split_part(build.version, '@', 2) as integer) as revision,
					build.metadata->>'build_type' as build_type,
					build.metadata->>'previous_version' as previous_version,
					build.metadata->>'previous_version_package_id' as previous_version_package_id`).
		Where("build.metadata->>'migration_id' = ?", migrationId).
		Select()
	if err != nil {
		return nil, fmt.Errorf("failed to query migration builds: %w", err)
	}

	for _, mb := range migrationBuilds {
		if mb.Status == view.StatusError {
			result.ErrorBuilds = append(result.ErrorBuilds, mView.MigrationError{
				PackageId:                mb.PackageId,
				Version:                  mb.Version,
				Revision:                 mb.Revision,
				Error:                    mb.Details,
				BuildId:                  mb.BuildId,
				BuildType:                mb.BuildType,
				PreviousVersion:          mb.PreviousVersion,
				PreviousVersionPackageId: mb.PreviousVersionPackageId,
			})

			result.ErrorBuildsCount += 1
		} else if mb.Status == view.StatusComplete {
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
	if err != nil {
		return nil, fmt.Errorf("failed to query migrated_version_changes: %w", err)
	}

	result.Stages = makeStagesExecView(*mRunEnt, nil, true)

	return &result, err
}

func (d *dbMigrationServiceImpl) GetSuspiciousBuilds(migrationId string, changedField string, limit int, page int) ([]mView.SuspiciousMigrationBuild, error) {
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

func (d *dbMigrationServiceImpl) GetMigrationPerfReport(migrationId string, includeHourPackageData bool, stageFilter *mView.OpsMigrationStage) (*mView.MigrPerfData, error) {
	var result = mView.MigrPerfData{
		Stages:          nil,
		BuildPerHour:    nil,
		SlowBuilds:      make([]mView.SlowBuild, 0),
		SlowComparisons: make([]mView.SlowComparison, 0),
	}

	mRunEnt, err := d.repo.GetMigrationRun(migrationId)
	if mRunEnt == nil {
		return nil, fmt.Errorf("migration with id=%s not found", migrationId)
	}
	if err != nil {
		return nil, err
	}

	result.Stages = makeStagesExecView(*mRunEnt, stageFilter, false)

	// TODO: fix includeHourPackageData, looks like time count is incorrect

	type BuildTime struct {
		BuildId string
		TimeSec int
	}

	var buildPerHour []mView.BuildPerHour
	var publishTime []BuildTime
	var comparisonTime []BuildTime
	buildIdToBuild := make(map[string]entity.BuildEntity)
	offset := 0
	limit := 1000
	for {
		var builds []entity.BuildEntity

		query := d.cp.GetConnection().Model(&builds).Where("metadata->>'migration_id' = ?", migrationId)
		if stageFilter != nil {
			query = query.Where("metadata->>'migration_stage' = ?", *stageFilter)
		}

		err := query.Order("created_at ASC").
			Offset(offset).Limit(limit).Select()
		if err != nil {
			return nil, err
		}
		for _, build := range builds {
			if build.LastActive == nil || build.StartedAt == nil || build.StartedAt.IsZero() || build.LastActive.IsZero() {
				continue
			}

			buildType, ok := build.Metadata["build_type"]
			if !ok {
				buildType = "unknown"
			}
			if buildType.(string) == string(view.PublishType) {
				publishTime = append(publishTime, BuildTime{
					BuildId: build.BuildId,
					TimeSec: int(math.Round(build.LastActive.Sub(*build.StartedAt).Seconds())),
				})
			}

			if buildType.(string) == string(view.ChangelogType) {
				comparisonTime = append(comparisonTime, BuildTime{
					BuildId: build.BuildId,
					TimeSec: int(math.Round(build.LastActive.Sub(*build.StartedAt).Seconds())),
				})
			}

			buildIdToBuild[build.BuildId] = build
			appendBuildPerHour(&buildPerHour, build, includeHourPackageData)
		}

		if len(builds) < 1000 {
			break
		}
		offset += limit
	}
	result.BuildPerHour = buildPerHour

	sort.SliceStable(publishTime, func(i, j int) bool {
		return publishTime[i].TimeSec > publishTime[j].TimeSec
	})

	for _, bt := range publishTime {
		build, ok := buildIdToBuild[bt.BuildId]
		if !ok {
			log.Warnf("GetMigrationPerfReport: missing build with id=%s in build map", bt.BuildId)
			continue
		}

		if len(result.SlowBuilds) > 100 || bt.TimeSec < 30 {
			continue
		}
		// TODO: []versions, averageTimeSec - aggregate versions in the same package!
		result.SlowBuilds = append(result.SlowBuilds, mView.SlowBuild{
			BuildId:     build.BuildId,
			PackageId:   build.PackageId,
			Version:     build.Version,
			TimeSeconds: bt.TimeSec,
		})

	}

	for _, bt := range comparisonTime {
		build, ok := buildIdToBuild[bt.BuildId]
		if !ok {
			log.Warnf("GetMigrationPerfReport: missing build with id=%s in build map", bt.BuildId)
			continue
		}

		if len(result.SlowBuilds) > 100 || bt.TimeSec < 30 {
			continue
		}

		prevV, ok := build.Metadata["previous_version"]
		if ok {
			prevV = prevV.(string)
		} else {
			prevV = "unknown"
		}

		prevP, ok := build.Metadata["previous_version_package_id"]
		if ok {
			prevP = prevP.(string)
		} else {
			prevP = "unknown"
		}

		result.SlowComparisons = append(result.SlowComparisons, mView.SlowComparison{
			BuildId:           build.BuildId,
			PackageId:         build.PackageId,
			Version:           build.Version,
			PreviousPackageId: prevP.(string),
			PreviousVersion:   prevV.(string),
			TimeSeconds:       bt.TimeSec,
		})
	}

	return &result, nil
}

func appendBuildPerHour(buildPerHour *[]mView.BuildPerHour, build entity.BuildEntity, includeHourPackageData bool) {
	hour := time.Date(build.LastActive.Year(), build.LastActive.Month(), build.LastActive.Day(), build.LastActive.Hour(), 0, 0, 0, time.UTC)
	buildTime := int(math.Round(build.LastActive.Sub(*build.StartedAt).Seconds()))

	var buildStage mView.OpsMigrationStage
	stStr, ok := build.Metadata["migration_stage"]
	if ok {
		buildStage = mView.OpsMigrationStage(stStr.(string))
	} else {
		buildStage = mView.MigrationStageUndefined
	}

	exists := false
	for i, bph := range *buildPerHour {
		if bph.Hour == hour {
			exists = true
			if includeHourPackageData {
				packageIndex := -1
				for j, bip := range bph.BuildsInPackages {
					if bip.PackageId == build.PackageId {
						packageIndex = j
						break
					}
				}
				if packageIndex == -1 {
					bph.BuildsInPackages = append(bph.BuildsInPackages, mView.BuildsInPackage{
						PackageId:      build.PackageId,
						BuildCount:     1,
						TotalTimeSec:   buildTime,
						AverageTimeSec: buildTime,
					})
				} else {
					bph.BuildsInPackages[packageIndex].BuildCount = bph.BuildsInPackages[packageIndex].BuildCount + 1
					bph.BuildsInPackages[packageIndex].TotalTimeSec = bph.BuildsInPackages[packageIndex].TotalTimeSec + buildTime
					bph.BuildsInPackages[packageIndex].AverageTimeSec = bph.BuildsInPackages[packageIndex].TotalTimeSec / bph.BuildsInPackages[packageIndex].BuildCount
				}
			}

			stageExists := false
			for _, stage := range bph.Stages {
				if stage == buildStage {
					stageExists = true
					break
				}
			}
			if !stageExists {
				bph.Stages = append(bph.Stages, buildStage)
			}

			(*buildPerHour)[i] = mView.BuildPerHour{
				Hour:             bph.Hour,
				TotalCount:       bph.TotalCount + 1,
				Stages:           bph.Stages,
				BuildsInPackages: bph.BuildsInPackages,
			}
			break
		}
	}
	if !exists {
		var buildsInPackages []mView.BuildsInPackage
		if includeHourPackageData {
			buildsInPackages = []mView.BuildsInPackage{{
				PackageId:      build.PackageId,
				BuildCount:     1,
				TotalTimeSec:   buildTime,
				AverageTimeSec: buildTime,
			}}
		}

		*buildPerHour = append(*buildPerHour, mView.BuildPerHour{
			Hour:             hour,
			TotalCount:       1,
			Stages:           []mView.OpsMigrationStage{buildStage},
			BuildsInPackages: buildsInPackages,
		})
	}
}

func makeStagesExecView(mRunEnt mEntity.MigrationRunEntity, stageFilter *mView.OpsMigrationStage, hideStartAndEnd bool) []mView.StageExecution {
	var result []mView.StageExecution

	for _, stage := range mRunEnt.StagesExecution {
		if stageFilter != nil && stage.Stage != *stageFilter {
			continue
		}

		var bc *int
		if stage.BuildsCount > 0 {
			bc = &stage.BuildsCount
		}

		elapsedTime := ""
		timePercent := -1
		if stage.End.IsZero() {
			elapsedTime = time.Now().Sub(stage.Start).String() + " (in progress)"
		} else {
			elapsedTime = stage.End.Sub(stage.Start).String()
			timePercent = int(math.Floor(stage.End.Sub(stage.Start).Seconds() / mRunEnt.UpdatedAt.Sub(mRunEnt.StartedAt).Seconds() * 100))
		}

		start := &stage.Start
		end := &stage.End

		if hideStartAndEnd {
			start = nil
			end = nil
		}

		result = append(result, mView.StageExecution{
			Stage:       stage.Stage,
			Start:       start,
			End:         end,
			ElapsedTime: elapsedTime,
			TimePercent: timePercent,
			BuildsCount: bc,
		})
	}
	return result
}
