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

package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ProjectIntEntity struct {
	tableName struct{} `pg:"project, alias:project"`

	Id                string     `pg:"id, pk, type:varchar"`
	Name              string     `pg:"name, type:varchar"`
	GroupId           string     `pg:"group_id, type:varchar"`
	Alias             string     `pg:"alias, type:varchar"`
	Description       string     `pg:"description, type:varchar"`
	IntegrationType   string     `pg:"integration_type, type:varchar"`
	RepositoryId      string     `pg:"repository_id, type:varchar"`
	RepositoryName    string     `pg:"repository_name, type:varchar"`
	RepositoryUrl     string     `pg:"repository_url, type:varchar"`
	DefaultBranch     string     `pg:"default_branch, type:varchar"`
	DefaultFolder     string     `pg:"default_folder, type:varchar"`
	DeletedAt         *time.Time `pg:"deleted_at, type:timestamp without time zone"`
	DeletedBy         string     `pg:"deleted_by, type:varchar"`
	LastVersion       string     `pg:"-"`
	PackageId         string     `pg:"package_id, type:varchar"`
	SecretToken       string     `pg:"secret_token, type:varchar"`
	SecretTokenUserId string     `pg:"secret_token_user_id, type:varchar"`
}

type ProjectIntFavEntity struct {
	tableName struct{} `pg:"project, alias:project"`

	ProjectIntEntity

	UserId    string `pg:"user_id, pk, type:varchar"`
	ProjectId string `pg:"project_id, pk, type:varchar"`
}

func MakePrjIntEntity(pView *view.Project) *ProjectIntEntity {
	return &ProjectIntEntity{
		Id:              pView.Id,
		Name:            pView.Name,
		GroupId:         pView.GroupId,
		Alias:           pView.Alias,
		Description:     pView.Description,
		IntegrationType: string(pView.Integration.Type),
		RepositoryId:    pView.Integration.RepositoryId,
		RepositoryName:  pView.Integration.RepositoryName,
		RepositoryUrl:   pView.Integration.RepositoryUrl,
		DefaultBranch:   pView.Integration.DefaultBranch,
		DefaultFolder:   pView.Integration.DefaultFolder,
		DeletedAt:       pView.DeletionDate,
		DeletedBy:       pView.DeletedBy,

		PackageId: pView.PackageId,
	}
}

func MakePrjIntUpdateEntity(updated *view.Project, existing *ProjectIntEntity) *ProjectIntEntity {
	newPrj := ProjectIntEntity{
		Id:              existing.Id, // Do not update id
		Name:            updated.Name,
		GroupId:         existing.GroupId, // Do not update parent
		Alias:           existing.Alias,   // Do not update alias
		Description:     updated.Description,
		RepositoryId:    updated.Integration.RepositoryId,
		DefaultBranch:   updated.Integration.DefaultBranch,
		RepositoryName:  existing.RepositoryName,
		RepositoryUrl:   existing.RepositoryUrl,
		DeletedAt:       existing.DeletedAt,
		DeletedBy:       existing.DeletedBy,
		IntegrationType: string(updated.Integration.Type),
		DefaultFolder:   updated.Integration.DefaultFolder,

		PackageId: updated.PackageId,
	}
	return &newPrj
}

func MakeProjectView(projectEntity *ProjectIntEntity, isFavorite bool, groups []view.Group) *view.Project {
	if groups == nil {
		groups = make([]view.Group, 0)
	}

	integrationType, _ := view.GitIntegrationTypeFromStr(projectEntity.IntegrationType)
	return &view.Project{
		Id:          projectEntity.Id,
		GroupId:     projectEntity.GroupId,
		Name:        projectEntity.Name,
		Alias:       projectEntity.Alias,
		Description: projectEntity.Description,
		IsFavorite:  isFavorite,
		Integration: view.IntegrationView{
			Type:           integrationType,
			RepositoryId:   projectEntity.RepositoryId,
			RepositoryName: projectEntity.RepositoryName,
			RepositoryUrl:  projectEntity.RepositoryUrl,
			DefaultBranch:  projectEntity.DefaultBranch,
			DefaultFolder:  projectEntity.DefaultFolder,
		},
		Groups:       groups,
		DeletionDate: projectEntity.DeletedAt,
		DeletedBy:    projectEntity.DeletedBy,
		LastVersion:  projectEntity.LastVersion,

		PackageId: projectEntity.PackageId,
	}
}
