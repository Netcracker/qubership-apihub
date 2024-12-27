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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

func NewBranchRepositoryPG(cp db.ConnectionProvider) (BranchRepository, error) {
	return &branchRepositoryImpl{cp: cp}, nil
}

type branchRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b branchRepositoryImpl) SetChangeType(projectId string, branchName string, changeType string) error {
	_, err := b.cp.GetConnection().Model(&entity.BranchDraftEntity{ChangeType: changeType}).
		Column("change_type").
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (b branchRepositoryImpl) SetDraftEditors(projectId string, branchName string, editors []string) error {
	_, err := b.cp.GetConnection().Model(&entity.BranchDraftEntity{Editors: editors}).
		Column("editors").
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (b branchRepositoryImpl) GetBranchDraft(projectId string, branchName string) (*entity.BranchDraftEntity, error) {
	result := new(entity.BranchDraftEntity)
	err := b.cp.GetConnection().Model(result).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b branchRepositoryImpl) GetBranchDrafts() ([]entity.BranchDraftEntity, error) {
	var result []entity.BranchDraftEntity
	err := b.cp.GetConnection().Model(&result).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
