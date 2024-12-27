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
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type GroupService interface {
	AddGroup(ctx context.SecurityContext, group *view.Group) (*view.Group, error)
	GetAllGroups(ctx context.SecurityContext, depth int, id string, name string, onlyFavorite bool) (*view.Groups, error)
	GetGroup(id string) (*view.Group, error)
	GetGroupInfo(ctx context.SecurityContext, id string) (*view.GroupInfo, error)
	FavorGroup(ctx context.SecurityContext, id string) error
	DisfavorGroup(ctx context.SecurityContext, id string) error
}

func NewGroupService(repo repository.PrjGrpIntRepository, projectService ProjectService, favoritesRepo repository.FavoritesRepository, publishedRepo repository.PublishedRepository, userRepo repository.UserRepository) GroupService {
	return &groupServiceImpl{
		repo:           repo,
		projectService: projectService,
		favoritesRepo:  favoritesRepo,
		publishedRepo:  publishedRepo,
		userRepo:       userRepo,
	}
}

type groupServiceImpl struct {
	repo           repository.PrjGrpIntRepository
	projectService ProjectService
	favoritesRepo  repository.FavoritesRepository
	publishedRepo  repository.PublishedRepository
	userRepo       repository.UserRepository
}

func (g groupServiceImpl) AddGroup(ctx context.SecurityContext, group *view.Group) (*view.Group, error) {
	if group.ParentId != "" {
		existingEnt, err := g.publishedRepo.GetPackageGroup(group.ParentId)
		if err != nil {
			return nil, err
		}
		if existingEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.ParentGroupNotFound,
				Message: exception.ParentGroupNotFoundMsg,
				Params:  map[string]interface{}{"parentId": group.ParentId},
			}
		}
		group.Id = group.ParentId + "." + group.Alias
	} else {
		group.Id = group.Alias
	}
	exGrp, err := g.publishedRepo.GetPackageIncludingDeleted(group.Id)
	if err != nil {
		return nil, err
	}

	if exGrp != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasAlreadyTaken,
			Message: exception.AliasAlreadyTakenMsg,
			Params:  map[string]interface{}{"alias": group.Alias},
		}
	}
	packageIdReserved, err := g.userRepo.PrivatePackageIdExists(group.Id)
	if err != nil {
		return nil, err
	}
	if packageIdReserved {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasAlreadyTaken,
			Message: exception.AliasAlreadyTakenMsg,
			Params:  map[string]interface{}{"alias": group.Alias},
		}
	}

	group.CreatedAt = time.Now()
	group.CreatedBy = ctx.GetUserId()
	err = g.publishedRepo.CreatePackage(entity.MakePackageGroupEntity(group))
	if err != nil {
		return nil, err
	}
	return group, err
}

func (g groupServiceImpl) GetAllGroups(ctx context.SecurityContext, depth int, id string, name string, onlyFavorite bool) (*view.Groups, error) {
	var entities []entity.PackageFavEntity
	var err error
	if depth == 0 {
		entities, err = g.publishedRepo.GetAllPackageGroups(name, onlyFavorite, ctx.GetUserId())
		if err != nil {
			return nil, err
		}
	} else if depth == 1 {
		entities, err = g.publishedRepo.GetChildPackageGroups(id, name, onlyFavorite, ctx.GetUserId())
		if err != nil {
			return nil, err
		}
	} else {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectDepthForRootGroups,
			Message: exception.IncorrectDepthForRootGroupsMsg,
			Params:  map[string]interface{}{"depth": depth},
		}
	}
	var ids []string
	for _, ent := range entities {
		ids = append(ids, ent.Id)
	}
	lastVersions, err := g.publishedRepo.GetLastVersions(ids)
	if err != nil {
		return nil, err
	}
	if len(lastVersions) > 0 {
		versionsMap := map[string]string{}
		for _, version := range lastVersions {
			versionsMap[version.PackageId] = version.Version
		}
		for i, ent := range entities {
			val, exists := versionsMap[ent.Id]
			if exists {
				entities[i].LastVersion = val
			}
		}
	}

	result := view.Groups{Groups: []view.Group{}}
	for _, ent := range entities {
		//do not add starting group
		if ent.Id == id {
			continue
		}
		result.Groups = append(result.Groups, *entity.MakePackageGroupFavView(&ent))
	}

	return &result, nil
}

func (g groupServiceImpl) GetGroup(id string) (*view.Group, error) {
	ent, err := g.publishedRepo.GetPackageGroup(id)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.GroupNotFound,
			Message: exception.GroupNotFoundMsg,
			Params:  map[string]interface{}{"id": id},
		}
	}
	return entity.MakePackageGroupView(ent), err
}

func (g groupServiceImpl) GetGroupInfo(ctx context.SecurityContext, id string) (*view.GroupInfo, error) {
	ent, err := g.publishedRepo.GetPackageGroup(id)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.GroupNotFound,
			Message: exception.GroupNotFoundMsg,
			Params:  map[string]interface{}{"id": id},
		}
	}
	parents, err := g.publishedRepo.GetParentPackageGroups(id)
	if err != nil {
		return nil, err
	}
	var parentGroups []view.Group
	for _, grp := range parents {
		if grp.Id != id {
			parentGroups = append(parentGroups, *entity.MakePackageGroupView(&grp))
		}
	}
	isFavorite, err := g.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), id)
	if err != nil {
		return nil, err
	}
	lastVersion, err := g.publishedRepo.GetLastVersion(id)
	if err != nil {
		return nil, err
	}
	if lastVersion != nil {
		ent.LastVersion = lastVersion.Version
	}

	return entity.MakePackageGroupInfoView(ent, parentGroups, isFavorite), nil
}
func (g groupServiceImpl) FavorGroup(ctx context.SecurityContext, id string) error {
	userId := ctx.GetUserId()

	favorite, err := g.favoritesRepo.IsFavoritePackage(userId, id)
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
	err = g.favoritesRepo.AddPackageToFavorites(userId, id)
	if err != nil {
		return err
	}
	return nil
}

func (g groupServiceImpl) DisfavorGroup(ctx context.SecurityContext, id string) error {
	userId := ctx.GetUserId()
	favorite, err := g.favoritesRepo.IsFavoritePackage(userId, id)
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
	err = g.favoritesRepo.RemovePackageFromFavorites(userId, id)
	if err != nil {
		return err
	}
	return nil
}
