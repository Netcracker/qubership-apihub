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

package repository

import (
	"context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
)

type BuildRepository interface {
	StoreBuild(buildEntity entity.BuildEntity, sourceEntity entity.BuildSourceEntity, depends []entity.BuildDependencyEntity) error
	UpdateBuildStatus(buildId string, status view.BuildStatusEnum, details string) error
	GetBuild(buildId string) (*entity.BuildEntity, error)
	GetBuilds(buildIds []string) ([]entity.BuildEntity, error)
	GetBuildSrc(buildId string) (*entity.BuildSourceEntity, error)

	FindAndTakeFreeBuild(builderId string) (*entity.BuildEntity, error)

	GetBuildByChangelogSearchQuery(searchQuery entity.ChangelogBuildSearchQueryEntity) (*entity.BuildEntity, error)
	GetBuildByDocumentGroupSearchQuery(searchQuery entity.DocumentGroupBuildSearchQueryEntity) (*entity.BuildEntity, error)

	UpdateBuildSourceConfig(buildId string, config map[string]interface{}) error
}

func NewBuildRepositoryPG(cp db.ConnectionProvider) (BuildRepository, error) {
	return &buildRepositoryImpl{cp: cp}, nil
}

type buildRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b buildRepositoryImpl) GetBuild(buildId string) (*entity.BuildEntity, error) {
	result := new(entity.BuildEntity)
	err := b.cp.GetConnection().Model(result).
		Where("build_id = ?", buildId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b buildRepositoryImpl) GetBuilds(buildIds []string) ([]entity.BuildEntity, error) {
	var result []entity.BuildEntity
	if len(buildIds) == 0 {
		return nil, nil
	}
	err := b.cp.GetConnection().Model(&result).
		Where("build_id in (?)", pg.In(buildIds)).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b buildRepositoryImpl) GetBuildSrc(buildId string) (*entity.BuildSourceEntity, error) {
	result := new(entity.BuildSourceEntity)
	err := b.cp.GetConnection().Model(result).
		Where("build_id = ?", buildId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b buildRepositoryImpl) StoreBuild(buildEntity entity.BuildEntity, sourceEntity entity.BuildSourceEntity, depends []entity.BuildDependencyEntity) error {
	ctx := context.Background()
	return b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(&buildEntity).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert build entity %+v with error %w", buildEntity, err)
		}

		_, err = tx.Model(&sourceEntity).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert build source entity %+v with error %w", sourceEntity, err)
		}

		for _, dEnt := range depends {
			_, err = tx.Model(&dEnt).Insert()
			if err != nil {
				return fmt.Errorf("failed to insert build depends entity %+v with error %w", dEnt, err)
			}
		}
		return nil
	})
}

const getBuildWithLock = "select * from build where build_id = ? limit 1 for no key update"

func (b buildRepositoryImpl) UpdateBuildStatus(buildId string, status view.BuildStatusEnum, details string) error {
	ctx := context.Background()
	err := b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ents []entity.BuildEntity
		_, err := tx.Query(&ents, getBuildWithLock, buildId)
		if err != nil {
			return fmt.Errorf("failed to get build %s for status update: %w", buildId, err)
		}
		if len(ents) == 0 {
			return fmt.Errorf("build with id = %s is not found for status update", buildId)
		}
		ent := &ents[0]

		buildStatus, err := view.BuildStatusFromString(ent.Status)
		if err != nil {
			return fmt.Errorf("invalid status for buildId %s: %s", ent.BuildId, err)
		}
		if buildStatus == view.StatusComplete ||
			(buildStatus == view.StatusError && status != view.StatusError) {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BuildAlreadyFinished,
				Message: exception.BuildAlreadyFinishedMsg,
				Params:  map[string]interface{}{"buildId": buildId},
			}
		}
		//Append new error to existing one
		if buildStatus == view.StatusError && status == view.StatusError &&
			ent.RestartCount >= 2 && ent.Details != "" {
			details = fmt.Sprintf("%v: %v", ent.Details, details)
		}

		query := tx.Model(ent).
			Where("build_id = ?", buildId).
			Set("status = ?", status).
			Set("details = ?", details).
			Set("last_active = now()")
		_, err = query.Update()
		if err != nil {
			return err
		}
		return nil
	})
	return err
}

const buildKeepaliveTimeoutSec = 600

var queryItemToBuild = fmt.Sprintf("select * from build b where "+
	"(b.status='none' or (b.status='%s' and b.last_active < (now() - interval '%d seconds'))) and "+
	"(b.build_id not in (select distinct build_id from build_depends where depend_id in (select build.build_id from build where status='%s' or status='%s'))) "+
	"order by b.priority DESC, b.created_at ASC limit 1 for no key update skip locked", view.StatusRunning, buildKeepaliveTimeoutSec, view.StatusNotStarted, view.StatusRunning)

func (b buildRepositoryImpl) FindAndTakeFreeBuild(builderId string) (*entity.BuildEntity, error) {
	var result *entity.BuildEntity
	var err error
	for {
		buildFailed := false
		err = b.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
			var ents []entity.BuildEntity

			_, err := tx.Query(&ents, queryItemToBuild)
			if err != nil {
				if err == pg.ErrNoRows {
					return nil
				}
				return fmt.Errorf("failed to find free build: %w", err)
			}
			if len(ents) > 0 {
				result = &ents[0]

				// we got build candidate
				if result.RestartCount >= 2 {
					query := tx.Model(result).
						Where("build_id = ?", result.BuildId).
						Set("status = ?", view.StatusError).
						Set("details = ?", fmt.Sprintf("Restart count exceeded limit. Details: %v", result.Details)).
						Set("last_active = now()")
					_, err := query.Update()
					if err != nil {
						return err
					}
					buildFailed = true
					return nil
				}

				// take free build
				isFirstRun := result.Status == string(view.StatusNotStarted)

				if !isFirstRun {
					result.RestartCount += 1
				}

				result.Status = string(view.StatusRunning)
				result.BuilderId = builderId
				// TODO: add optimistic lock as well?

				_, err = tx.Model(result).
					Set("status = ?status").
					Set("builder_id = ?builder_id").
					Set("restart_count = ?restart_count").
					Set("last_active = now()").
					Where("build_id = ?", result.BuildId).
					Update()
				if err != nil {
					return fmt.Errorf("unable to update build status during takeBuild: %w", err)
				}

				return nil
			}
			return nil
		})
		if buildFailed {
			continue
		}
		break
	}
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (b buildRepositoryImpl) GetBuildByChangelogSearchQuery(searchQuery entity.ChangelogBuildSearchQueryEntity) (*entity.BuildEntity, error) {
	var ent entity.BuildEntity
	query := `
		with bs as (
			select  * from build_src
			where config->>'version' = ?version 
				and config->>'packageId' = ?package_id
				and config->>'previousVersionPackageId' = ?previous_version_package_id 
				and config->>'previousVersion' = ?previous_version 
				and config->>'buildType' = ?build_type
				and (config->>'comparisonRevision')::int = ?comparison_revision
				and (config->>'comparisonPrevRevision')::int = ?comparison_prev_revision
		)
		select b.* from build as b, bs
		where b.build_id = bs.build_id
		order by created_at desc 
		limit 1`
	_, err := b.cp.GetConnection().Model(&searchQuery).QueryOne(&ent, query)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &ent, nil
}

func (b buildRepositoryImpl) GetBuildByDocumentGroupSearchQuery(searchQuery entity.DocumentGroupBuildSearchQueryEntity) (*entity.BuildEntity, error) {
	var ent entity.BuildEntity
	query := `
		with bs as (
			select  * from build_src
			where config->>'version' = ?version 
				and config->>'packageId' = ?package_id
				and config->>'buildType' = ?build_type
				and config->>'format' = ?format
				and config->>'apiType' = ?api_type
				and config->>'groupName' = ?group_name
		)
		select b.* from build as b, bs
		where b.build_id = bs.build_id
		order by created_at desc 
		limit 1`
	_, err := b.cp.GetConnection().Model(&searchQuery).QueryOne(&ent, query)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &ent, nil
}

func (b buildRepositoryImpl) UpdateBuildSourceConfig(buildId string, config map[string]interface{}) error {
	var ent entity.BuildSourceEntity
	_, err := b.cp.GetConnection().Model(&ent).
		Where("build_id = ?", buildId).
		Set("config = ?", config).
		Update()
	if err != nil {
		return err
	}
	return nil
}
