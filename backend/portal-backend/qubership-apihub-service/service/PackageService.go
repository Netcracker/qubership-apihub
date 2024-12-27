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
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type PackageService interface {
	CreatePackage(ctx context.SecurityContext, packg view.SimplePackage) (*view.SimplePackage, error)
	GetPackage(ctx context.SecurityContext, id string, withParents bool) (*view.SimplePackage, error)
	GetPackagesList(ctx context.SecurityContext, req view.PackageListReq) (*view.Packages, error)
	UpdatePackage(ctx context.SecurityContext, packg *view.PatchPackageReq, packageId string) (*view.SimplePackage, error)
	DeletePackage(ctx context.SecurityContext, id string) error
	FavorPackage(ctx context.SecurityContext, id string) error
	DisfavorPackage(ctx context.SecurityContext, id string) error
	GetPackageStatus(id string) (*view.Status, error)
	GetPackageName(id string) (string, error)
	PackageExists(packageId string) (bool, error)
	GetAvailableVersionPublishStatuses(ctx context.SecurityContext, packageId string) (*view.Statuses, error)
	RecalculateOperationGroups(ctx context.SecurityContext, packageId string) error
	CalculateOperationGroups(packageId string, groupingPrefix string) (*view.CalculatedOperationGroups, error)
}

func NewPackageService(gitClientProvider GitClientProvider,
	repo repository.PrjGrpIntRepository,
	favoritesRepo repository.FavoritesRepository,
	publishedRepo repository.PublishedRepository,
	versionService VersionService,
	roleService RoleService,
	atService ActivityTrackingService,
	operationGroupService OperationGroupService,
	userRepo repository.UserRepository,
	ptHandler PackageTransitionHandler,
	systemInfoService SystemInfoService) PackageService {
	return &packageServiceImpl{
		gitClientProvider:     gitClientProvider,
		pRepo:                 repo,
		favoritesRepo:         favoritesRepo,
		publishedRepo:         publishedRepo,
		versionService:        versionService,
		roleService:           roleService,
		atService:             atService,
		operationGroupService: operationGroupService,
		userRepo:              userRepo,
		ptHandler:             ptHandler,
		systemInfoService:     systemInfoService,
	}
}

type packageServiceImpl struct {
	gitClientProvider     GitClientProvider
	pRepo                 repository.PrjGrpIntRepository
	favoritesRepo         repository.FavoritesRepository
	publishedRepo         repository.PublishedRepository
	versionService        VersionService
	roleService           RoleService
	atService             ActivityTrackingService
	operationGroupService OperationGroupService
	userRepo              repository.UserRepository
	ptHandler             PackageTransitionHandler
	systemInfoService     SystemInfoService
}

func (p packageServiceImpl) CreatePackage(ctx context.SecurityContext, packg view.SimplePackage) (*view.SimplePackage, error) {
	if !validPackageKind(packg.Kind) {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectPackageKind,
			Message: exception.IncorrectPackageKindMsg,
			Params:  map[string]interface{}{"kind": packg.Kind},
		}
	}
	if packg.Kind == entity.KIND_WORKSPACE {
		packg.ParentId = ""
	}
	if packg.ParentId != "" {
		existingEnt, err := p.publishedRepo.GetPackage(packg.ParentId)
		if err != nil {
			return nil, err
		}
		if existingEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"parentId": packg.ParentId},
			}
		}
		packg.Id = packg.ParentId + "." + packg.Alias

		if packg.ExcludeFromSearch == nil {
			packg.ExcludeFromSearch = &existingEnt.ExcludeFromSearch
		} else {
			if existingEnt.ExcludeFromSearch && !*packg.ExcludeFromSearch {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.UnableToChangeExcludeFromSearch,
					Message: exception.UnableToChangeExcludeFromSearchMsg,
				}
			}
		}
	} else {
		if packg.Kind == entity.KIND_GROUP || packg.Kind == entity.KIND_PACKAGE || packg.Kind == entity.KIND_DASHBOARD {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PackageParentIsMissing,
				Message: exception.PackageParentIsMissingMsg,
			}
		}
		packg.Id = packg.Alias
		if packg.ExcludeFromSearch == nil {
			excludeFromSearchDefaultValue := false
			packg.ExcludeFromSearch = &excludeFromSearchDefaultValue
		}
	}
	existingPackage, err := p.publishedRepo.GetPackageIncludingDeleted(packg.Id)
	if err != nil {
		return nil, err
	}
	if existingPackage != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.PackageAlreadyExists,
			Message: exception.PackageAlreadyExistsMsg,
			Params:  map[string]interface{}{"id": packg.Id},
		}
	}
	packageIdReserved, err := p.userRepo.PrivatePackageIdExists(packg.Id)
	if err != nil {
		return nil, err
	}
	if packageIdReserved {
		return nil, &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.PackageAlreadyExists,
			Message: exception.PackageAlreadyExistsMsg,
			Params:  map[string]interface{}{"id": packg.Id},
		}
	}
	transitionId, err := p.ptHandler.HandleMissingPackageId(packg.Id)
	if err != nil {
		return nil, fmt.Errorf("failed to check if package id %s transition exists during creation: %w", packg.Id, err)
	}
	if transitionId != "" {
		return nil, &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.PackageRedirectExists,
			Message: exception.PackageRedirectExistsMsg,
			Params:  map[string]interface{}{"id": packg.Id},
		}
	}

	if packg.Kind == entity.KIND_GROUP || packg.Kind == entity.KIND_WORKSPACE {
		packg.ServiceName = ""
	}
	if packg.ServiceName != "" {
		err := p.checkServiceNameAvailability(packg.Id, packg.ServiceName)
		if err != nil {
			return nil, err
		}
	}
	if packg.RestGroupingPrefix != "" {
		err := validatePackageGroupingPrefix(packg.RestGroupingPrefix)
		if err != nil {
			return nil, err
		}
	}

	packg.CreatedAt = time.Now()
	packg.CreatedBy = ctx.GetUserId()
	if packg.DefaultRole == "" {
		packg.DefaultRole = view.ViewerRoleId
	}
	if packg.ParentId != "" {
		err = p.roleService.ValidateDefaultRole(ctx, packg.ParentId, packg.DefaultRole)
		if err != nil {
			return nil, err
		}
	} else {
		roleExists, err := p.roleService.PackageRoleExists(packg.DefaultRole)
		if err != nil {
			return nil, err
		}
		if !roleExists {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.RoleNotFound,
				Message: exception.RoleNotFoundMsg,
				Params:  map[string]interface{}{"role": packg.DefaultRole},
			}
		}
	}
	if packg.ReleaseVersionPattern != "" {
		_, err := regexp.Compile(packg.ReleaseVersionPattern)
		if err != nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidReleaseVersionPatternFormat,
				Message: exception.InvalidReleaseVersionPatternFormatMsg,
				Params:  map[string]interface{}{"pattern": packg.ReleaseVersionPattern},
				Debug:   err.Error(),
			}
		}
	} else {
		packg.ReleaseVersionPattern = p.systemInfoService.GetReleaseVersionPattern()
	}
	err = p.publishedRepo.CreatePackage(entity.MakePackageEntity(&packg))
	if err != nil {
		return nil, err
	}

	p.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETCreatePackage,
		Data:      nil,
		PackageId: packg.Id,
		Date:      time.Now(),
		UserId:    packg.CreatedBy,
	})

	parents, err := p.getParents(packg.Id)
	if err != nil {
		return nil, err
	}
	packg.Parents = parents

	isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), packg.Id)
	if err != nil {
		return nil, err
	}
	packg.IsFavorite = isFavorite
	userPermissions, err := p.roleService.GetPermissionsForPackage(ctx, packg.Id)
	if err != nil {
		return nil, err
	}
	packg.UserPermissions = userPermissions
	return &packg, err
}

func (p packageServiceImpl) checkServiceNameAvailability(packageId string, serviceName string) error {
	serviceOwnerPackageId, err := p.publishedRepo.GetServiceOwner(utils.GetPackageWorkspaceId(packageId), serviceName)
	if err != nil {
		return err
	}
	if serviceOwnerPackageId != "" && serviceOwnerPackageId != packageId {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ServiceNameAlreadyTaken,
			Message: exception.ServiceNameAlreadyTakenMsg,
			Params:  map[string]interface{}{"serviceName": serviceName, "packageId": serviceOwnerPackageId},
		}
	}
	return nil
}
func (p packageServiceImpl) PackageExists(packageId string) (bool, error) {
	ent, err := p.publishedRepo.GetPackage(packageId)
	if err != nil {
		return false, err
	}
	if ent == nil {
		return false, nil
	} else {
		return true, nil
	}
}

func (p packageServiceImpl) GetPackage(ctx context.SecurityContext, id string, withParents bool) (*view.SimplePackage, error) {
	ent, err := p.publishedRepo.GetPackage(id)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": id},
		}
	}
	var parentPackages []view.ParentPackageInfo
	if withParents {
		parents, err := p.publishedRepo.GetParentsForPackage(id)
		if err != nil {
			return nil, err
		}

		for _, grp := range parents {
			if grp.Id != id {
				userPermissions, err := p.roleService.GetPermissionsForPackage(ctx, grp.Id)
				if err != nil {
					return nil, err
				}
				parentPackage := *entity.MakePackageParentView(&grp)
				hasReadPermission := utils.SliceContains(userPermissions, string(view.ReadPermission))
				parentPackage.HasReadPermission = &hasReadPermission
				parentPackages = append(parentPackages, parentPackage)
			}
		}
	} else {
		parentPackages = nil
	}

	isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), id)
	if err != nil {
		return nil, err
	}

	userPermissions, err := p.roleService.GetPermissionsForPackage(ctx, id)
	if err != nil {
		return nil, err
	}
	packageView := entity.MakeSimplePackageView(ent, parentPackages, isFavorite, userPermissions)
	if packageView.DefaultReleaseVersion != "" {
		latestRevision, err := p.publishedRepo.GetLatestRevision(ent.Id, packageView.DefaultReleaseVersion)
		if err != nil {
			return nil, err
		}
		packageView.DefaultVersion = view.MakeVersionRefKey(packageView.DefaultReleaseVersion, latestRevision)
	} else {
		packageView.DefaultVersion, err = p.versionService.GetDefaultVersion(packageView.Id)
		if err != nil {
			return nil, err
		}
	}

	return packageView, nil
}

func (p packageServiceImpl) GetPackagesList(ctx context.SecurityContext, searchReq view.PackageListReq) (*view.Packages, error) {
	var err error
	result := make([]view.PackagesInfo, 0)
	var entities []entity.PackageEntity
	skipped := 0
	if len(searchReq.Kind) == 0 {
		searchReq.Kind = []string{entity.KIND_WORKSPACE}
	}
	entities, err = p.publishedRepo.GetFilteredPackagesWithOffset(searchReq, ctx.GetUserId())
	if err != nil {
		return nil, err
	}
	if err != nil {
		log.Error("Failed to get packages: ", err.Error())
		return nil, err
	}
	for _, ent := range entities {
		var parents []view.ParentPackageInfo = nil
		if searchReq.ShowParents {
			parents, err = p.getParents(ent.Id)
			if err != nil {
				return nil, err
			}
		}

		var isFavorite = true
		if !searchReq.OnlyFavorite {
			isFavorite, err = p.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), ent.Id)
			if err != nil {
				return nil, err
			}
		}

		permissions, err := p.roleService.GetPermissionsForPackage(ctx, ent.Id)
		if err != nil {
			return nil, err
		}
		//do not show private packages
		//todo move this restriction to db query
		if !utils.SliceContains(permissions, string(view.ReadPermission)) {
			skipped++
			continue
		}

		var lastReleaseVersionDetails *view.VersionDetails
		if searchReq.LastReleaseVersionDetails {
			defaultReleaseVersion := ent.DefaultReleaseVersion
			if defaultReleaseVersion == "" {
				defaultReleaseVersion, err = p.versionService.GetDefaultVersion(ent.Id)
				if err != nil {
					return nil, err
				}
			}
			if defaultReleaseVersion != "" {
				lastReleaseVersionDetails, err = p.versionService.GetVersionDetails(ent.Id, defaultReleaseVersion)
				if err != nil {
					return nil, err
				}
			}
		}

		packagesInfo := entity.MakePackagesInfo(&ent, lastReleaseVersionDetails, parents, isFavorite, permissions)
		result = append(result, *packagesInfo)
	}
	if skipped != 0 {
		searchReq.Offset = searchReq.Offset + searchReq.Limit
		searchReq.Limit = skipped
		extraPackages, err := p.GetPackagesList(ctx, searchReq)
		if err != nil {
			return nil, err
		}
		result = append(result, extraPackages.Packages...)
	}

	return &view.Packages{Packages: result}, nil
}

func (p packageServiceImpl) UpdatePackage(ctx context.SecurityContext, packg *view.PatchPackageReq, packageId string) (*view.SimplePackage, error) {
	existingEnt, err := p.publishedRepo.GetPackage(packageId)
	if err != nil {
		return nil, err
	}
	if existingEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}

	if existingEnt.DefaultRole == view.NoneRoleId && existingEnt.ParentId == "" {
		if !p.roleService.IsSysadm(ctx) {
			return nil, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   exception.PrivateWorkspaceNotModifiableMsg,
			}
		}
	}

	if packg.DefaultRole != nil && existingEnt.DefaultRole != *packg.DefaultRole {
		err = p.roleService.ValidateDefaultRole(ctx, existingEnt.Id, *packg.DefaultRole)
		if err != nil {
			return nil, err
		}
	}

	if packg.DefaultReleaseVersion != nil && *packg.DefaultReleaseVersion != "" {
		versionName, revision, err := SplitVersionRevision(*packg.DefaultReleaseVersion)
		if err != nil {
			return nil, err
		}
		version, err := p.publishedRepo.GetVersion(packageId, versionName)
		if err != nil {
			return nil, err
		}
		if version == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PublishedPackageVersionNotFound,
				Message: exception.PublishedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"version": versionName, "packageId": packageId},
			}
		}
		if revision != 0 && revision != version.Revision {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.DefaultReleaseVersionHasNotLatestRevision,
				Message: exception.DefaultReleaseVersionHasNotLatestRevisionMsg,
			}
		}
		if version.Status != string(view.Release) {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.DefaultReleaseVersionIsNotReleased,
				Message: exception.DefaultReleaseVersionIsNotReleasedMsg,
				Params:  map[string]interface{}{"version": versionName},
			}
		}
		*packg.DefaultReleaseVersion = versionName
	}
	if packg.ServiceName != nil {
		if existingEnt.ServiceName != "" && existingEnt.ServiceName != *packg.ServiceName {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ServiceNameCantBeModified,
				Message: exception.ServiceNameCantBeModifiedMsg,
			}
		}
		if *packg.ServiceName != "" {
			err := p.checkServiceNameAvailability(existingEnt.Id, *packg.ServiceName)
			if err != nil {
				return nil, err
			}
		}
	}
	if packg.ReleaseVersionPattern != nil && *packg.ReleaseVersionPattern != "" {
		_, err := regexp.Compile(*packg.ReleaseVersionPattern)
		if err != nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidReleaseVersionPatternFormat,
				Message: exception.InvalidReleaseVersionPatternFormatMsg,
				Params:  map[string]interface{}{"pattern": *packg.ReleaseVersionPattern},
				Debug:   err.Error(),
			}
		}
	}
	if packg.ExcludeFromSearch != nil {
		if *packg.ExcludeFromSearch != existingEnt.ExcludeFromSearch {
			if existingEnt.ParentId != "" {
				parentEnt, err := p.publishedRepo.GetPackage(existingEnt.ParentId)
				if err != nil {
					return nil, err
				}
				if parentEnt == nil {
					return nil, &exception.CustomError{
						Status:  http.StatusNotFound,
						Code:    exception.PackageNotFound,
						Message: exception.PackageNotFoundMsg,
						Params:  map[string]interface{}{"packageId": existingEnt.ParentId},
					}
				}
				if parentEnt.ExcludeFromSearch && !*packg.ExcludeFromSearch {
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.UnableToChangeExcludeFromSearch,
						Message: exception.UnableToChangeExcludeFromSearchMsg,
					}
				}
			}
		}
	}
	if packg.RestGroupingPrefix != nil && existingEnt.RestGroupingPrefix != *packg.RestGroupingPrefix {
		err := validatePackageGroupingPrefix(*packg.RestGroupingPrefix)
		if err != nil {
			return nil, err
		}
	}

	ent := entity.MakeSimplePackageUpdateEntity(existingEnt, packg)

	res, err := p.publishedRepo.UpdatePackage(ent)
	if err != nil {
		return nil, err
	}

	dataMap := map[string]interface{}{}

	meta := make([]string, 0)
	if packg.Name != nil {
		meta = append(meta, "name")
	}
	if packg.Description != nil {
		meta = append(meta, "description")
	}
	if packg.ServiceName != nil {
		meta = append(meta, "serviceName")
	}
	if packg.ImageUrl != nil {
		meta = append(meta, "imageUrl")
	}
	if packg.DefaultRole != nil {
		meta = append(meta, "defaultRole")
	}
	if packg.DefaultReleaseVersion != nil {
		meta = append(meta, "defaultReleaseVersion")
	}
	if packg.ReleaseVersionPattern != nil {
		meta = append(meta, "releaseVersionPattern")
	}
	if packg.RestGroupingPrefix != nil {
		meta = append(meta, "restGroupingPrefix")
	}
	dataMap["packageMeta"] = meta

	p.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETPatchPackageMeta,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})

	parents, err := p.getParents(res.Id)
	if err != nil {
		return nil, err
	}

	isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx.GetUserId(), res.Id)
	if err != nil {
		return nil, err
	}
	userRole, err := p.roleService.GetPermissionsForPackage(ctx, res.Id)
	if err != nil {
		return nil, err
	}
	return entity.MakeSimplePackageView(res, parents, isFavorite, userRole), err
}

func (p packageServiceImpl) DeletePackage(ctx context.SecurityContext, id string) error {
	ent, err := p.publishedRepo.GetPackage(id)
	if err != nil {
		return err
	}
	if ent == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": id},
		}
	}
	if ent.DefaultRole == view.NoneRoleId && ent.ParentId == "" {
		if !p.roleService.IsSysadm(ctx) {
			return &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   exception.PrivateWorkspaceNotModifiableMsg,
			}
		}
	}
	err = p.publishedRepo.DeletePackage(id, ctx.GetUserId())
	if err != nil {
		return err
	}

	p.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETDeletePackage,
		Data:      nil,
		PackageId: id,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})

	return nil
}

func (p packageServiceImpl) FavorPackage(ctx context.SecurityContext, id string) error {
	userId := ctx.GetUserId()
	ent, err := p.publishedRepo.GetPackage(id)
	if err != nil {
		return err
	}
	if ent == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": id},
		}
	}
	favorite, err := p.favoritesRepo.IsFavoritePackage(userId, id)
	if err != nil {
		return err
	}
	if favorite {
		return nil
	}
	err = p.favoritesRepo.AddPackageToFavorites(userId, id)
	if err != nil {
		return err
	}
	return nil
}

func (p packageServiceImpl) DisfavorPackage(ctx context.SecurityContext, id string) error {
	userId := ctx.GetUserId()
	ent, err := p.publishedRepo.GetPackage(id)
	if err != nil {
		return err
	}
	if ent == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": id},
		}
	}
	favorite, err := p.favoritesRepo.IsFavoritePackage(userId, id)
	if err != nil {
		return err
	}
	if !favorite {
		return nil
	}
	err = p.favoritesRepo.RemovePackageFromFavorites(userId, id)
	if err != nil {
		return err
	}
	return nil
}

func (p packageServiceImpl) GetPackageName(id string) (string, error) {
	ent, err := p.publishedRepo.GetPackage(id)
	if err != nil {
		return "", err
	}
	if ent != nil {
		return ent.Name, nil
	}
	return "", &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.PackageNotFound,
		Message: exception.PackageNotFoundMsg,
		Params:  map[string]interface{}{"id": id},
	}

}

func (p packageServiceImpl) GetPackageStatus(id string) (*view.Status, error) {
	ent, err := p.publishedRepo.GetPackage(id)
	if err != nil {
		return nil, err
	}
	if ent != nil {
		return &view.Status{Status: "exists"}, nil
	}
	deletedEnt, err := p.publishedRepo.GetDeletedPackage(id)
	if err != nil {
		return nil, err
	}
	if deletedEnt != nil {
		return &view.Status{Status: "deleted"}, nil
	}
	return nil, &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.PackageNotFound,
		Message: exception.PackageNotFoundMsg,
		Params:  map[string]interface{}{"id": id},
	}
}

func (p packageServiceImpl) getParents(packageId string) ([]view.ParentPackageInfo, error) {
	parents, err := p.publishedRepo.GetParentsForPackage(packageId)
	if err != nil {
		return nil, err
	}
	var result []view.ParentPackageInfo
	for _, grp := range parents {
		result = append(result, *entity.MakePackageParentView(&grp))
	}
	return result, err
}

func validPackageKind(kind string) bool {
	if kind != entity.KIND_GROUP && kind != entity.KIND_PACKAGE && kind != entity.KIND_WORKSPACE && kind != entity.KIND_DASHBOARD {
		return false
	}
	return true
}

func validatePackageGroupingPrefix(groupingPrefix string) error {
	if groupingPrefix == "" {
		return nil
	}
	//todo do we need this validation?
	if !strings.HasSuffix(groupingPrefix, `/`) {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.InvalidGroupingPrefix,
			Message: exception.InvalidGroupingPrefixMsg,
			Params:  map[string]interface{}{"error": "groupingPrefix must end with / "},
		}
	}

	if strings.Count(groupingPrefix, view.PackageGroupingPrefixWildcard) != 1 {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.InvalidGroupingPrefix,
			Message: exception.InvalidGroupingPrefixMsg,
			Params:  map[string]interface{}{"error": fmt.Sprintf("groupingPrefix must contain exactly one %v", view.PackageGroupingPrefixWildcard)},
		}
	}
	return nil
}

func (p packageServiceImpl) GetAvailableVersionPublishStatuses(ctx context.SecurityContext, packageId string) (*view.Statuses, error) {
	statusesForPublish, err := p.roleService.GetAvailableVersionPublishStatuses(ctx, packageId)
	if err != nil {
		return nil, err
	}
	return &view.Statuses{Statuses: statusesForPublish}, err
}

func (p packageServiceImpl) RecalculateOperationGroups(ctx context.SecurityContext, packageId string) error {
	packageEnt, err := p.publishedRepo.GetPackage(packageId)
	if err != nil {
		return err
	}
	if packageEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	err = p.publishedRepo.RecalculatePackageOperationGroups(packageEnt.Id, view.MakePackageGroupingPrefixRegex(packageEnt.RestGroupingPrefix), "", ctx.GetUserId())
	if err != nil {
		return err
	}
	return nil
}

func (p packageServiceImpl) CalculateOperationGroups(packageId string, groupingPrefix string) (*view.CalculatedOperationGroups, error) {
	packageEnt, err := p.publishedRepo.GetPackage(packageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	defaultVersion, err := p.versionService.GetDefaultVersion(packageId)
	if err != nil {
		return nil, err
	}
	if defaultVersion == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.DefaultVersionNotFound,
			Message: exception.DefaultVersionNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	err = validatePackageGroupingPrefix(groupingPrefix)
	if err != nil {
		return nil, err
	}
	groupingPrefix = view.MakePackageGroupingPrefixRegex(groupingPrefix)
	groups, err := p.operationGroupService.CalculateOperationGroups(packageId, defaultVersion, groupingPrefix)
	if err != nil {
		return nil, err
	}
	return &view.CalculatedOperationGroups{Groups: groups}, nil
}
