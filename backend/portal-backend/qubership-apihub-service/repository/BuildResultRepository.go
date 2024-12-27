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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
)

type BuildResultRepository interface {
	StoreBuildResult(ent entity.BuildResultEntity) error
	GetBuildResult(buildId string) (*entity.BuildResultEntity, error)
	GetBuildResultWithOffset(offset int) (*entity.BuildResultEntity, error)
	DeleteBuildResults(buildIds []string) error
}

func NewBuildResultRepository(cp db.ConnectionProvider) BuildResultRepository {
	return &buildResultRepositoryImpl{cp: cp}
}

type buildResultRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b buildResultRepositoryImpl) StoreBuildResult(ent entity.BuildResultEntity) error {
	_, err := b.cp.GetConnection().Model(&ent).Insert()
	if err != nil {
		return err
	}
	return nil

}

func (b buildResultRepositoryImpl) GetBuildResult(buildId string) (*entity.BuildResultEntity, error) {
	result := new(entity.BuildResultEntity)
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

func (b buildResultRepositoryImpl) GetBuildResultWithOffset(offset int) (*entity.BuildResultEntity, error) {
	result := new(entity.BuildResultEntity)
	err := b.cp.GetConnection().Model(result).Offset(offset).Limit(1).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b buildResultRepositoryImpl) DeleteBuildResults(buildIds []string) error {
	ctx := context.Background()
	var deletedRows int
	err := b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		query := `delete from build_result 
		where build_id in (?)`
		result, err := tx.Exec(query, pg.In(buildIds))
		if err != nil {
			return err
		}
		deletedRows += result.RowsAffected()
		return nil
	})

	if deletedRows > 0 {
		_, err = b.cp.GetConnection().Exec("vacuum full build_result")
		if err != nil {
			return errors.Wrap(err, "failed to run vacuum for table build_result")
		}
	}
	return nil
}
