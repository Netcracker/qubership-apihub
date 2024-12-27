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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

type PrjGrpIntRepository interface {
	Create(ent *entity.ProjectIntEntity) (*entity.ProjectIntEntity, error)
	Update(ent *entity.ProjectIntEntity) (*entity.ProjectIntEntity, error)
	GetById(id string) (*entity.ProjectIntEntity, error)
	GetByPackageId(packageId string) (*entity.ProjectIntEntity, error)
	GetDeletedEntity(id string) (*entity.ProjectIntEntity, error)
	GetProjectsForGroup(groupId string) ([]entity.ProjectIntEntity, error)
	GetFilteredProjects(filter string, groupId string) ([]entity.ProjectIntEntity, error)
	Delete(id string, userId string) error
	Exists(id string) (bool, error)
	CleanupDeleted() error
	GetProjectsForIntegration(integrationType string, repositoryId string, secretToken string) ([]entity.ProjectIntEntity, error)
}
