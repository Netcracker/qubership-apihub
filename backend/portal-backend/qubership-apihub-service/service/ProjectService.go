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
	goctx "context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ProjectService interface {
	AddProject(ctx context.SecurityContext, project *view.Project, groupAlias string) (*view.Project, error)
	GetProject(ctx context.SecurityContext, id string) (*view.Project, error)
	GetProjectsForGroup(ctx context.SecurityContext, groupId string) ([]view.Project, error)
	GetFilteredProjects(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool) ([]view.Project, error)
	UpdateProject(ctx context.SecurityContext, project *view.Project) (*view.Project, error)
	DeleteProject(ctx context.SecurityContext, id string) error
	FavorProject(ctx context.SecurityContext, id string) error
	DisfavorProject(ctx context.SecurityContext, id string) error
}

func NewProjectService(gitClientProvider GitClientProvider,
	repo repository.PrjGrpIntRepository,
	favoritesRepo repository.FavoritesRepository,
	publishedRepo repository.PublishedRepository) ProjectService {
	return &projectServiceImpl{
		gitClientProvider: gitClientProvider,
		pRepo:             repo,
		favoritesRepo:     favoritesRepo,
		publishedRepo:     publishedRepo,
	}
}

type projectServiceImpl struct {
	gitClientProvider GitClientProvider
	pRepo             repository.PrjGrpIntRepository
	favoritesRepo     repository.FavoritesRepository
	publishedRepo     repository.PublishedRepository
}

func (p projectServiceImpl) AddProject(ctx context.SecurityContext, project *view.Project, groupAlias string) (*view.Project, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("AddProject(%+v,%s)", project, groupAlias))

	project.Id = groupAlias + "." + project.Alias
	ent, err := p.pRepo.GetById(project.Id)
	if err != nil {
		return nil, err
	}

	if ent == nil {
		ent, err = p.pRepo.GetDeletedEntity(project.Id)
		if err != nil {
			return nil, err
		}
	}
	if ent != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ProjectAliasAlreadyExists,
			Message: exception.ProjectAliasAlreadyExistsMsg,
			Params:  map[string]interface{}{"alias": project.Alias},
		}
	}
	gitClient, err := p.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}
	repoName, repoUrl, err := gitClient.GetRepoNameAndUrl(goCtx, project.Integration.RepositoryId)
	if err != nil {
		return nil, err
	}
	project.Integration.RepositoryName = repoName
	project.Integration.RepositoryUrl = repoUrl
	resultProjectEntity, err := p.pRepo.Create(entity.MakePrjIntEntity(project))
	if err != nil {
		return nil, err
	}

	groups, err := p.getParentGroups(resultProjectEntity.GroupId)
	if err != nil {
		return nil, err
	}

	projectView := entity.MakeProjectView(resultProjectEntity, false, groups)

	return projectView, nil
}

func (p projectServiceImpl) GetProject(ctx context.SecurityContext, id string) (*view.Project, error) {
	exists, err := p.pRepo.Exists(id)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ProjectNotFound,
			Message: exception.ProjectNotFoundMsg,
			Params:  map[string]interface{}{"projectId": id},
		}
	}
	projectEntity, err := p.pRepo.GetById(id)
	if err != nil {
		return nil, err
	}

	versionEntity, err := p.publishedRepo.GetLastVersion(projectEntity.PackageId)
	if err != nil {
		return nil, err
	}
	if versionEntity != nil {
		projectEntity.LastVersion = versionEntity.Version
	}

	groups, err := p.getParentGroups(id)
	if err != nil {
		return nil, err
	}
	isFavorite, err := p.favoritesRepo.IsFavoriteProject(ctx.GetUserId(), id)
	if err != nil {
		return nil, err
	}
	projectView := entity.MakeProjectView(projectEntity, isFavorite, groups)
	return projectView, nil
}

func (p projectServiceImpl) GetProjectsForGroup(ctx context.SecurityContext, groupId string) ([]view.Project, error) {
	result := make([]view.Project, 0)
	entities, err := p.pRepo.GetProjectsForGroup(groupId)
	if err != nil {
		return nil, err
	}
	for _, ent := range entities {
		groups, err := p.getParentGroups(ent.GroupId)
		if err != nil {
			return nil, err
		}
		isFavorite, err := p.favoritesRepo.IsFavoriteProject(ctx.GetUserId(), ent.Id)
		if err != nil {
			return nil, err
		}
		versionEntity, err := p.publishedRepo.GetLastVersion(ent.PackageId)
		if err != nil {
			return nil, err
		}
		if versionEntity != nil {
			ent.LastVersion = versionEntity.Version
		}
		result = append(result, *entity.MakeProjectView(&ent, isFavorite, groups))
	}
	return result, nil
}

func (p projectServiceImpl) GetFilteredProjects(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool) ([]view.Project, error) {
	result := make([]view.Project, 0)
	entities, err := p.pRepo.GetFilteredProjects(filter, groupId)
	if err != nil {
		return nil, err
	}
	for _, ent := range entities {
		groups, err := p.getParentGroups(ent.Id)
		if err != nil {
			return nil, err
		}
		isFavorite, err := p.favoritesRepo.IsFavoriteProject(ctx.GetUserId(), ent.Id)
		if err != nil {
			return nil, err
		}
		versionEntity, err := p.publishedRepo.GetLastVersion(ent.PackageId)
		if err != nil {
			return nil, err
		}
		if versionEntity != nil {
			ent.LastVersion = versionEntity.Version
		}

		projectView := *entity.MakeProjectView(&ent, isFavorite, groups)

		if !onlyFavorite || (onlyFavorite && isFavorite) { // TODO: need to handle via repository
			result = append(result, projectView)
		}
	}
	//todo paging
	return result, nil
}

func (p projectServiceImpl) UpdateProject(ctx context.SecurityContext, project *view.Project) (*view.Project, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("UpdateProject(%+v)", project))

	existingPrj, err := p.pRepo.GetById(project.Id)
	if err != nil {
		return nil, err
	}
	if existingPrj == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ProjectNotFound,
			Message: exception.ProjectNotFoundMsg,
			Params:  map[string]interface{}{"projectId": project.Id},
		}
	}

	if existingPrj.GroupId != project.GroupId {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ParentGroupIdCantBeModified,
			Message: exception.ParentGroupIdCantBeModifiedMsg,
		}
	}

	if existingPrj.Alias != project.Alias {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasCantBeModified,
			Message: exception.AliasCantBeModifiedMsg,
		}
	}

	newPrj := entity.MakePrjIntUpdateEntity(project, existingPrj)

	if project.PackageId != existingPrj.PackageId {
		if project.PackageId != "" {
			projectByPackageId, err := p.pRepo.GetByPackageId(project.PackageId)
			if err != nil {
				return nil, err
			}
			if projectByPackageId != nil {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.PackageAlreadyTaken,
					Message: exception.PackageAlreadyTakenMsg,
					Params:  map[string]interface{}{"packageId": project.PackageId, "projectId": projectByPackageId.Id},
				}
			}
			packageById, err := p.publishedRepo.GetPackage(project.PackageId)
			if err != nil {
				return nil, err
			}
			if packageById == nil {
				return nil, &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.PackageDoesntExists,
					Message: exception.PackageDoesntExistsMsg,
					Params:  map[string]interface{}{"packageId": project.PackageId},
				}
			}
			if packageById.Kind != entity.KIND_PACKAGE {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.PackageKindIsNotAllowed,
					Message: exception.PackageKindIsNotAllowedMsg,
					Params:  map[string]interface{}{"packageId": project.PackageId, "kind": packageById.Kind},
				}
			}
		}
	}

	if existingPrj.RepositoryId != newPrj.RepositoryId {
		intType, err := view.GitIntegrationTypeFromStr(newPrj.IntegrationType)
		if err != nil {
			return nil, err
		}

		gitClient, err := p.gitClientProvider.GetUserClient(intType, ctx.GetUserId())
		if err != nil {
			return nil, fmt.Errorf("failed to get git client: %v", err)
		}
		repoName, repoUrl, err := gitClient.GetRepoNameAndUrl(goCtx, newPrj.RepositoryId)
		if err != nil {
			return nil, err
		}

		newPrj.RepositoryName = repoName
		newPrj.RepositoryUrl = repoUrl
	}

	res, err := p.pRepo.Update(newPrj)
	if err != nil {
		return nil, err
	}

	isFavorite, err := p.favoritesRepo.IsFavoriteProject(ctx.GetUserId(), project.Id)
	if err != nil {
		return nil, err
	}

	existingGroups, err := p.getParentGroups(project.Id)
	if err != nil {
		return nil, err
	}

	versionEntity, err := p.publishedRepo.GetLastVersion(res.PackageId)
	if err != nil {
		return nil, err
	}
	if versionEntity != nil {
		res.LastVersion = versionEntity.Version
	}

	projectView := entity.MakeProjectView(res, isFavorite, existingGroups)

	return projectView, nil
}

func (p projectServiceImpl) DeleteProject(ctx context.SecurityContext, id string) error {
	exists, err := p.pRepo.Exists(id)
	if err != nil {
		return err
	}
	if !exists {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ProjectNotFound,
			Message: exception.ProjectNotFoundMsg,
			Params:  map[string]interface{}{"projectId": id},
		}
	}
	return p.pRepo.Delete(id, ctx.GetUserId())
}

func (p projectServiceImpl) FavorProject(ctx context.SecurityContext, id string) error {
	userId := ctx.GetUserId()

	favorite, err := p.favoritesRepo.IsFavoriteProject(userId, id)
	if err != nil {
		return err
	}

	if favorite {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AlreadyFavored,
			Message: exception.AlreadyFavoredMsg,
			Params:  map[string]interface{}{"id": id, "user": userId},
		}
	}
	err = p.favoritesRepo.AddProjectToFavorites(userId, id)
	if err != nil {
		return err
	}
	return nil
}

func (p projectServiceImpl) DisfavorProject(ctx context.SecurityContext, id string) error {
	exists, err := p.pRepo.Exists(id)
	if err != nil {
		return err
	}
	if !exists {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ProjectNotFound,
			Message: exception.ProjectNotFoundMsg,
			Params:  map[string]interface{}{"projectId": id},
		}
	}
	userId := ctx.GetUserId()
	favorite, err := p.favoritesRepo.IsFavoriteProject(userId, id)
	if err != nil {
		return err
	}
	if !favorite {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.NotFavored,
			Message: exception.NotFavoredMsg,
			Params:  map[string]interface{}{"id": id, "user": userId},
		}
	}
	err = p.favoritesRepo.RemoveProjectFromFavorites(userId, id)
	if err != nil {
		return err
	}
	return nil
}

func (p projectServiceImpl) getParentGroups(id string) ([]view.Group, error) {
	groups, err := p.publishedRepo.GetParentPackageGroups(id)
	if err != nil {
		return nil, err
	}
	var result []view.Group
	for _, grp := range groups {
		result = append(result, *entity.MakePackageGroupView(&grp))
	}
	return result, err
}
