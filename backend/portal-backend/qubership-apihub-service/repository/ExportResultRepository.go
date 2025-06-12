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
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"time"
)

type ExportResultRepository interface {
	SaveExportResult(ent entity.ExportResultEntity) error
	GetExportResult(exportId string) (*entity.ExportResultEntity, error)
	CleanupExportResults(ttl time.Duration) error

	// deprecated??
	SaveTransformedDocument(data *entity.TransformedContentDataEntity, publishId string) error
	GetTransformedDocuments(packageId string, version string, apiType string, groupId string, buildType view.BuildType, format string) (*entity.TransformedContentDataEntity, error)
	DeleteTransformedDocuments(packageId string, version string, revision int, apiType string, groupId string) error
}

func NewExportRepository(cp db.ConnectionProvider) ExportResultRepository {
	return &exportRepositoryImpl{cp: cp}
}

type exportRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (p exportRepositoryImpl) CleanupExportResults(ttl time.Duration) error {
	var ent entity.ExportResultEntity
	_, err := p.cp.GetConnection().Model(&ent).
		Where("created_at < (now() - interval '? seconds')", int(ttl.Seconds())).
		Delete()
	return err
}

func (p exportRepositoryImpl) SaveExportResult(exportResEnt entity.ExportResultEntity) error {
	ctx := context.Background()
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ents []entity.BuildEntity
		_, err := tx.Query(&ents, getBuildWithLock, exportResEnt.ExportId)
		if err != nil {
			return fmt.Errorf("SaveExportResult: failed to get build %s: %w", exportResEnt.ExportId, err)
		}
		if len(ents) == 0 {
			return fmt.Errorf("SaveExportResult: failed to save export result. Build with buildId='%s' is not found", exportResEnt.ExportId)
		}
		build := &ents[0]

		//do not allow publish for "complete" builds and builds that are not failed with "Restart count exceeded limit"
		if build.Status == string(view.StatusComplete) ||
			(build.Status == string(view.StatusError) && build.RestartCount < 2) {
			return fmt.Errorf("failed to save export. Build with buildId='%v' is already published or failed", exportResEnt.ExportId)
		}

		// no "on conflict" statements since multiple exports with the same id or update cases are not expected
		_, err = p.cp.GetConnection().Model(&exportResEnt).Insert()
		if err != nil {
			return err
		}

		var buildEntity entity.BuildEntity
		query := tx.Model(&buildEntity).
			Where("build_id = ?", exportResEnt.ExportId).
			Set("status = ?", view.StatusComplete).
			Set("details = ?", "").
			Set("last_active = now()")
		_, err = query.Update()
		if err != nil {
			return fmt.Errorf("failed to update build entity: %w", err)
		}
		return nil
	})
	return err
}

func (p exportRepositoryImpl) GetExportResult(exportId string) (*entity.ExportResultEntity, error) {
	result := new(entity.ExportResultEntity)
	err := p.cp.GetConnection().Model(result).
		Where("export_id = ?", exportId).
		First()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return result, err
}

func (p exportRepositoryImpl) SaveTransformedDocument(data *entity.TransformedContentDataEntity, publishId string) error {
	ctx := context.Background()
	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ents []entity.BuildEntity
		_, err := tx.Query(&ents, getBuildWithLock, publishId)
		if err != nil {
			return fmt.Errorf("SaveTransformedDocument: failed to get build %s: %w", publishId, err)
		}
		if len(ents) == 0 {
			return fmt.Errorf("SaveTransformedDocument: failed to start doc transformation publish. Build with buildId='%s' is not found", publishId)
		}
		build := &ents[0]

		//do not allow publish for "complete" builds and builds that are not failed with "Restart count exceeded limit"
		if build.Status == string(view.StatusComplete) ||
			(build.Status == string(view.StatusError) && build.RestartCount < 2) {
			return fmt.Errorf("failed to start document transformation. Build with buildId='%v' is already published or failed", publishId)
		}

		_, err = tx.Model(data).OnConflict("(package_id, version, revision, api_type, group_id, build_type, format) DO UPDATE").Insert()
		if err != nil {
			return fmt.Errorf("failed to insert published_data %+v: %w", data, err)
		}
		var ent entity.BuildEntity
		query := tx.Model(&ent).
			Where("build_id = ?", publishId).
			Set("status = ?", view.StatusComplete).
			Set("details = ?", "").
			Set("last_active = now()")
		_, err = query.Update()
		if err != nil {
			return fmt.Errorf("failed to update build entity: %w", err)
		}
		return nil
	})
	return err
}

func (p exportRepositoryImpl) GetTransformedDocuments(packageId string, version string, apiType string, groupId string, buildType view.BuildType, format string) (*entity.TransformedContentDataEntity, error) {
	result := new(entity.TransformedContentDataEntity)
	version, revision, err := SplitVersionRevision(version)
	if err != nil {
		return nil, err
	}
	err = p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("api_type = ?", apiType).
		Where("group_id = ?", groupId).
		Where("build_type = ?", buildType).
		Where("format = ?", format).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, err
}

func (p exportRepositoryImpl) DeleteTransformedDocuments(packageId string, version string, revision int, apiType string, groupId string) error {
	ctx := context.Background()
	return p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		query := `
		delete from transformed_content_data
		where package_id = ? and version = ? and revision = ? and api_type = ? and group_id = ?`
		_, err := tx.Exec(query, packageId, version, revision, apiType, groupId)
		return err
	})
}
