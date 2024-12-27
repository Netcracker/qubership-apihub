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
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
)

func NewPrjGrpIntRepositoryPG(cp db.ConnectionProvider) (PrjGrpIntRepository, error) {
	return &projectRepositoryImpl{cp: cp}, nil
}

type projectRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (p projectRepositoryImpl) Create(ent *entity.ProjectIntEntity) (*entity.ProjectIntEntity, error) {
	_, err := p.cp.GetConnection().Model(ent).Insert()
	if err != nil {
		return nil, err
	}
	return ent, nil
}

func (p projectRepositoryImpl) Update(ent *entity.ProjectIntEntity) (*entity.ProjectIntEntity, error) {
	_, err := p.cp.GetConnection().Model(ent).Where("id = ?", ent.Id).Update()
	if err != nil {
		return nil, err
	}
	return ent, nil
}

func (p projectRepositoryImpl) GetById(id string) (*entity.ProjectIntEntity, error) {
	result := new(entity.ProjectIntEntity)
	err := p.cp.GetConnection().Model(result).
		Where("id = ?", id).
		Where("deleted_at is ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p projectRepositoryImpl) GetByPackageId(packageId string) (*entity.ProjectIntEntity, error) {
	result := new(entity.ProjectIntEntity)
	err := p.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("deleted_at is ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p projectRepositoryImpl) GetDeletedEntity(id string) (*entity.ProjectIntEntity, error) {
	result := new(entity.ProjectIntEntity)
	err := p.cp.GetConnection().Model(result).
		Where("id = ?", id).
		Where("deleted_at is not ?", nil).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p projectRepositoryImpl) GetProjectsForGroup(groupId string) ([]entity.ProjectIntEntity, error) {
	var result []entity.ProjectIntEntity
	err := p.cp.GetConnection().Model(&result).
		Where("group_id = ?", groupId).
		Where("deleted_at is ?", nil).
		Order("name ASC").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p projectRepositoryImpl) GetFilteredProjects(filter string, groupId string) ([]entity.ProjectIntEntity, error) {
	var result []entity.ProjectIntEntity
	query := p.cp.GetConnection().Model(&result).
		Where("deleted_at is ?", nil).
		Order("name ASC")

	if filter != "" {
		filter = "%" + utils.LikeEscaped(filter) + "%"
		query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			q = q.WhereOr("name ilike ?", filter).WhereOr("id ilike ?", filter)
			return q, nil
		})
	}
	if groupId != "" {
		query.Where("group_id = ?", groupId)
	}

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p projectRepositoryImpl) Delete(id string, userId string) error {
	ctx := context.Background()

	err := p.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		ent := new(entity.ProjectIntEntity)
		err := tx.Model(ent).
			Where("id = ?", id).
			Where("deleted_at is ?", nil).
			First()
		if err != nil {
			if err == pg.ErrNoRows {
				return nil
			}
			return err
		}
		timeNow := time.Now()
		ent.DeletedAt = &timeNow
		ent.DeletedBy = userId
		ent.PackageId = ""

		_, err = tx.Model(ent).Where("id = ?", ent.Id).Update()
		return err
	})

	return err
}

func (p projectRepositoryImpl) Exists(id string) (bool, error) {
	group, err := p.GetById(id)
	if err != nil {
		return false, err
	}
	if group == nil {
		return false, nil
	} else {
		return true, nil
	}
}

func (p projectRepositoryImpl) CleanupDeleted() error {
	var ents []entity.ProjectIntEntity
	_, err := p.cp.GetConnection().Model(&ents).
		Where("deleted_at is not ?", nil).
		Delete()
	return err
}

func (p projectRepositoryImpl) GetProjectsForIntegration(integrationType string, repositoryId string, secretToken string) ([]entity.ProjectIntEntity, error) {
	var result []entity.ProjectIntEntity
	query := p.cp.GetConnection().Model(&result).
		Where("deleted_at is ?", nil).
		Where("integration_type = ?", integrationType).
		Where("repository_id = ?", repositoryId).
		Where("secret_token = ?", secretToken).
		Order("name ASC")

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}
