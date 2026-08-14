package service

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type PackageService interface {
	CreatePackage(ctx context.Context, packg view.SimplePackage) (*view.SimplePackage, error)
	GetPackage(ctx context.Context, id string, withParents bool) (*view.SimplePackage, error)
	GetPackagesList(ctx context.Context, req view.PackageListReq) (*view.Packages, error)
	GetDeletedPackagesList(ctx context.Context, req view.PackageListReq) (*view.Packages, error)
	UpdatePackage(ctx context.Context, packg *view.PatchPackageReq, packageId string) (*view.SimplePackage, error)
	DeletePackage(ctx context.Context, id string) error
	FavorPackage(ctx context.Context, id string) error
	DisfavorPackage(ctx context.Context, id string) error
	GetPackageStatus(ctx context.Context, id string) (*view.Status, error)
	GetPackageName(ctx context.Context, id string) (string, error)
	GetPackageKind(ctx context.Context, id string) (string, error)
	PackageExists(ctx context.Context, packageId string) (bool, error)
	GetGroupDescendantPackages(ctx context.Context, groupId string) ([]entity.PackageEntity, error)
	GetAvailableVersionPublishStatuses_deprecated(ctx context.Context, packageId string) (*view.Statuses_deprecated, error)
	RecalculateOperationGroups(ctx context.Context, packageId string) error
	CalculateOperationGroups(ctx context.Context, packageId string, groupingPrefix string) (*view.CalculatedOperationGroups, error)
}

func NewPackageService(favoritesRepo repository.FavoritesRepository,
	publishedRepo repository.PublishedRepository,
	versionService VersionService,
	roleService RoleService,
	atService ActivityTrackingService,
	monitoringService MonitoringService,
	operationGroupService OperationGroupService,
	userRepo repository.UserRepository,
	ptHandler PackageTransitionHandler,
	systemInfoService SystemInfoService) PackageService {
	return &packageServiceImpl{
		favoritesRepo:         favoritesRepo,
		publishedRepo:         publishedRepo,
		versionService:        versionService,
		roleService:           roleService,
		atService:             atService,
		monitoringService:     monitoringService,
		operationGroupService: operationGroupService,
		userRepo:              userRepo,
		ptHandler:             ptHandler,
		systemInfoService:     systemInfoService,
	}
}

type packageServiceImpl struct {
	favoritesRepo         repository.FavoritesRepository
	publishedRepo         repository.PublishedRepository
	versionService        VersionService
	roleService           RoleService
	atService             ActivityTrackingService
	monitoringService     MonitoringService
	operationGroupService OperationGroupService
	userRepo              repository.UserRepository
	ptHandler             PackageTransitionHandler
	systemInfoService     SystemInfoService
}

func (p packageServiceImpl) CreatePackage(ctx context.Context, packg view.SimplePackage) (*view.SimplePackage, error) {
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
		existingEnt, err := p.publishedRepo.GetPackage(ctx, packg.ParentId)
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
	existingPackage, err := p.publishedRepo.GetPackageIncludingDeleted(ctx, packg.Id)
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
	packageIdReserved, err := p.userRepo.PrivatePackageIdExists(ctx, packg.Id)
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
	transitionId, err := p.ptHandler.HandleMissingPackageId(ctx, packg.Id)
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
		err := p.checkServiceNameAvailability(ctx, packg.Id, packg.ServiceName)
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
	packg.CreatedBy = secctx.GetUserId(ctx)
	if packg.DefaultRole == "" {
		packg.DefaultRole = view.ViewerRoleId
	}
	if packg.ParentId != "" {
		err = p.roleService.ValidateDefaultRole(ctx, packg.ParentId, packg.DefaultRole)
		if err != nil {
			return nil, err
		}
	} else {
		roleExists, err := p.roleService.PackageRoleExists(ctx, packg.DefaultRole)
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
	err = p.publishedRepo.CreatePackage(ctx, entity.MakePackageEntity(&packg))
	if err != nil {
		return nil, err
	}

	p.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETCreatePackage,
		Data:      nil,
		PackageId: packg.Id,
		Date:      time.Now(),
		UserId:    packg.CreatedBy,
	})

	parents, err := p.getParents(ctx, packg.Id, false)
	if err != nil {
		return nil, err
	}
	packg.Parents = parents

	isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx, secctx.GetUserId(ctx), packg.Id)
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

func (p packageServiceImpl) checkServiceNameAvailability(ctx context.Context, packageId string, serviceName string) error {
	serviceOwnerPackageId, err := p.publishedRepo.GetServiceOwner(ctx, utils.GetPackageWorkspaceId(packageId), serviceName)
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
func (p packageServiceImpl) PackageExists(ctx context.Context, packageId string) (bool, error) {
	ent, err := p.publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return false, err
	}
	if ent == nil {
		return false, nil
	} else {
		return true, nil
	}
}

func (p packageServiceImpl) GetPackage(ctx context.Context, id string, withParents bool) (*view.SimplePackage, error) {
	ent, err := p.publishedRepo.GetPackage(ctx, id)
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
		parents, err := p.publishedRepo.GetParentsForPackage(ctx, id, false)
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

	isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx, secctx.GetUserId(ctx), id)
	if err != nil {
		return nil, err
	}

	userPermissions, err := p.roleService.GetPermissionsForPackage(ctx, id)
	if err != nil {
		return nil, err
	}
	packageView := entity.MakeSimplePackageView(ent, parentPackages, isFavorite, userPermissions)
	if packageView.DefaultReleaseVersion != "" {
		latestRevision, err := p.publishedRepo.GetLatestRevision(ctx, ent.Id, packageView.DefaultReleaseVersion)
		if err != nil {
			return nil, err
		}
		packageView.DefaultVersion = view.MakeVersionRefKey(packageView.DefaultReleaseVersion, latestRevision)
	} else {
		packageView.DefaultVersion, err = p.versionService.GetDefaultVersion(ctx, packageView.Id)
		if err != nil {
			return nil, err
		}
	}

	return packageView, nil
}

func (p packageServiceImpl) GetPackagesList(ctx context.Context, searchReq view.PackageListReq) (*view.Packages, error) {
	searchReq = withDefaultKind(searchReq)

	scope, err := p.roleService.GetPackageReadScope(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve package read scope: %w", err)
	}
	if scope.Kind == view.PackageReadScopeNone {
		return &view.Packages{Packages: make([]view.PackagesInfo, 0)}, nil
	}
	packages, err := p.publishedRepo.GetReadablePackages(ctx, searchReq, scope, secctx.GetUserId(ctx))
	if err != nil {
		log.Error("Failed to get packages: ", err.Error())
		return nil, err
	}

	// A user's permissions differ per package and arrive on the row. Every other caller holds one set for
	// everything in scope, so it is resolved once.
	var scopePermissions []string
	if scope.Kind != view.PackageReadScopeUser {
		scopePermissions, err = p.roleService.GetPermissionsForReadScope(ctx, scope)
		if err != nil {
			return nil, err
		}
	}

	parents, err := p.parentsByPackage(ctx, searchReq, packageIds(packages), false)
	if err != nil {
		return nil, err
	}

	result := make([]view.PackagesInfo, 0, len(packages))
	for _, pkg := range packages {
		permissions := scopePermissions
		if scope.Kind == view.PackageReadScopeUser {
			permissions = pkg.Permissions
		}
		lastReleaseVersionDetails, err := p.lastReleaseVersionDetails(ctx, searchReq, pkg.PackageEntity)
		if err != nil {
			return nil, err
		}
		packageEntity := pkg.PackageEntity
		result = append(result, *entity.MakePackagesInfo(&packageEntity, lastReleaseVersionDetails,
			parents[pkg.Id], pkg.IsFavorite, permissions, false))
	}
	return &view.Packages{Packages: result}, nil
}

// GetDeletedPackagesList lists soft deleted packages. The endpoint behind it is system administrator only, so
// no read scope applies, and the response carries neither permissions nor the favourite flag.
func (p packageServiceImpl) GetDeletedPackagesList(ctx context.Context, searchReq view.PackageListReq) (*view.Packages, error) {
	searchReq = withDefaultKind(searchReq)

	packages, err := p.publishedRepo.GetDeletedPackages(ctx, searchReq, secctx.GetUserId(ctx))
	if err != nil {
		log.Error("Failed to get deleted packages: ", err.Error())
		return nil, err
	}

	ids := make([]string, 0, len(packages))
	for _, pkg := range packages {
		ids = append(ids, pkg.Id)
	}
	parents, err := p.parentsByPackage(ctx, searchReq, ids, true)
	if err != nil {
		return nil, err
	}

	result := make([]view.PackagesInfo, 0, len(packages))
	for _, pkg := range packages {
		result = append(result, *entity.MakePackagesInfo(&pkg, nil, parents[pkg.Id], false, nil, true))
	}
	return &view.Packages{Packages: result}, nil
}

func withDefaultKind(searchReq view.PackageListReq) view.PackageListReq {
	if len(searchReq.Kind) == 0 {
		searchReq.Kind = []string{entity.KIND_WORKSPACE}
	}
	return searchReq
}

func packageIds(packages []entity.ReadablePackageEntity) []string {
	ids := make([]string, 0, len(packages))
	for _, pkg := range packages {
		ids = append(ids, pkg.Id)
	}
	return ids
}

func (p packageServiceImpl) parentsByPackage(ctx context.Context, searchReq view.PackageListReq, ids []string, deleted bool) (map[string][]view.ParentPackageInfo, error) {
	result := make(map[string][]view.ParentPackageInfo, len(ids))
	if !searchReq.ShowParents || len(ids) == 0 {
		return result, nil
	}
	parentsByPackage, err := p.publishedRepo.GetParentsForPackages(ctx, ids, deleted)
	if err != nil {
		return nil, err
	}
	for id, parents := range parentsByPackage {
		views := make([]view.ParentPackageInfo, 0, len(parents))
		for _, parent := range parents {
			views = append(views, *entity.MakePackageParentView(&parent))
		}
		result[id] = views
	}
	return result, nil
}

func (p packageServiceImpl) lastReleaseVersionDetails(ctx context.Context, searchReq view.PackageListReq, pkg entity.PackageEntity) (*view.VersionDetails, error) {
	if !searchReq.LastReleaseVersionDetails {
		return nil, nil
	}
	version := pkg.DefaultReleaseVersion
	if version == "" {
		defaultVersion, err := p.versionService.GetDefaultVersion(ctx, pkg.Id)
		if err != nil {
			return nil, err
		}
		version = defaultVersion
	}
	if version == "" {
		return nil, nil
	}
	return p.versionService.GetVersionDetails(ctx, pkg.Id, version)
}

func (p packageServiceImpl) UpdatePackage(ctx context.Context, packg *view.PatchPackageReq, packageId string) (*view.SimplePackage, error) {
	existingEnt, err := p.publishedRepo.GetPackage(ctx, packageId)
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
		if !secctx.IsSysadm(ctx) {
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
		version, err := p.publishedRepo.GetVersion(ctx, packageId, versionName)
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
			err := p.checkServiceNameAvailability(ctx, existingEnt.Id, *packg.ServiceName)
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
	excludeFromSearchChanged := false
	if packg.ExcludeFromSearch != nil {
		if *packg.ExcludeFromSearch != existingEnt.ExcludeFromSearch {
			excludeFromSearchChanged = true
			if existingEnt.ParentId != "" {
				parentEnt, err := p.publishedRepo.GetPackage(ctx, existingEnt.ParentId)
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

	res, err := p.publishedRepo.UpdatePackage(ctx, ent, excludeFromSearchChanged)
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

	p.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETPatchPackageMeta,
		Data:      dataMap,
		PackageId: packageId,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})

	parents, err := p.getParents(ctx, res.Id, false)
	if err != nil {
		return nil, err
	}

	isFavorite, err := p.favoritesRepo.IsFavoritePackage(ctx, secctx.GetUserId(ctx), res.Id)
	if err != nil {
		return nil, err
	}
	userRole, err := p.roleService.GetPermissionsForPackage(ctx, res.Id)
	if err != nil {
		return nil, err
	}
	return entity.MakeSimplePackageView(res, parents, isFavorite, userRole), err
}

func (p packageServiceImpl) DeletePackage(ctx context.Context, id string) error {
	ent, err := p.publishedRepo.GetPackage(ctx, id)
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
		if !secctx.IsSysadm(ctx) {
			return &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   exception.PrivateWorkspaceNotModifiableMsg,
			}
		}
	}
	referencingDashboards, err := p.publishedRepo.GetPackageReferencingDashboards(ctx, id)
	if err != nil {
		return err
	}
	if len(referencingDashboards) > 0 {
		log.Warnf("Blocked deletion of package %s by user %s: referenced by dashboards %v",
			id, secctx.GetUserId(ctx), referencingDashboards)
		if ent.Kind == entity.KIND_GROUP || ent.Kind == entity.KIND_WORKSPACE {
			packages, err := p.formatDashboardReferencesByPackage(ctx, referencingDashboards)
			if err != nil {
				return err
			}
			return &exception.CustomError{
				Status:  http.StatusConflict,
				Code:    exception.ReferencedByDashboard,
				Message: exception.GroupOrWorkspaceReferencedByDashboardMsg,
				Params: map[string]interface{}{
					"kind":      ent.Kind,
					"packageId": ent.Id,
					"packages":  packages,
				},
			}
		}
		accessible, hiddenCount, err := p.roleService.FilterVersionsByPackageReadAccess(ctx, dashboardVersionKeys(referencingDashboards))
		if err != nil {
			return err
		}
		return &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.ReferencedByDashboard,
			Message: exception.PackageReferencedByDashboardMsg,
			Params: map[string]interface{}{
				"packageId":  ent.Id,
				"dashboards": entity.FormatVersionKeysWithHidden(accessible, hiddenCount, "dashboard version"),
			},
		}
	}
	deletedReleaseCount, err := p.publishedRepo.DeletePackage(ctx, id, secctx.GetUserId(ctx))
	if err != nil {
		return err
	}

	if deletedReleaseCount > 0 {
		for i := 0; i < deletedReleaseCount; i++ {
			p.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.ReleaseVersionsDeleted, id)
		}
	}

	p.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETDeletePackage,
		Data:      nil,
		PackageId: id,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})

	return nil
}

func dashboardVersionKeys(refs []entity.DashboardReferenceEntity) []entity.PublishedVersionKeyEntity {
	keys := make([]entity.PublishedVersionKeyEntity, 0, len(refs))
	for _, ref := range refs {
		keys = append(keys, ref.PublishedVersionKeyEntity)
	}
	return keys
}

func (p packageServiceImpl) formatDashboardReferencesByPackage(ctx context.Context, refs []entity.DashboardReferenceEntity) (string, error) {
	accessible, _, err := p.roleService.FilterVersionsByPackageReadAccess(ctx, dashboardVersionKeys(refs))
	if err != nil {
		return "", err
	}
	accessibleDashboardVersions := make(map[entity.PublishedVersionKeyEntity]bool, len(accessible))
	for _, key := range accessible {
		accessibleDashboardVersions[key] = true
	}

	type dashboardGroup struct {
		accessible  []entity.PublishedVersionKeyEntity
		hiddenCount int
	}
	groups := make(map[string]*dashboardGroup)
	for _, ref := range refs {
		group := groups[ref.ReferencedPackageId]
		if group == nil {
			group = &dashboardGroup{}
			groups[ref.ReferencedPackageId] = group
		}
		if accessibleDashboardVersions[ref.PublishedVersionKeyEntity] {
			group.accessible = append(group.accessible, ref.PublishedVersionKeyEntity)
		} else {
			group.hiddenCount++
		}
	}

	parts := make([]string, 0, len(groups))
	for referencedPackageId, group := range groups {
		parts = append(parts, fmt.Sprintf("%s (%s)", referencedPackageId,
			entity.FormatVersionKeysWithHidden(group.accessible, group.hiddenCount, "dashboard version")))
	}
	return strings.Join(parts, ", "), nil
}

func (p packageServiceImpl) FavorPackage(ctx context.Context, id string) error {
	userId := secctx.GetUserId(ctx)
	ent, err := p.publishedRepo.GetPackage(ctx, id)
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
	favorite, err := p.favoritesRepo.IsFavoritePackage(ctx, userId, id)
	if err != nil {
		return err
	}
	if favorite {
		return nil
	}
	err = p.favoritesRepo.AddPackageToFavorites(ctx, userId, id)
	if err != nil {
		return err
	}
	return nil
}

func (p packageServiceImpl) DisfavorPackage(ctx context.Context, id string) error {
	userId := secctx.GetUserId(ctx)
	ent, err := p.publishedRepo.GetPackage(ctx, id)
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
	favorite, err := p.favoritesRepo.IsFavoritePackage(ctx, userId, id)
	if err != nil {
		return err
	}
	if !favorite {
		return nil
	}
	err = p.favoritesRepo.RemovePackageFromFavorites(ctx, userId, id)
	if err != nil {
		return err
	}
	return nil
}

func (p packageServiceImpl) GetPackageName(ctx context.Context, id string) (string, error) {
	ent, err := p.publishedRepo.GetPackage(ctx, id)
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
		Params:  map[string]interface{}{"packageId": id},
	}

}
func (p packageServiceImpl) GetPackageKind(ctx context.Context, id string) (string, error) {
	ent, err := p.publishedRepo.GetPackage(ctx, id)
	if err != nil {
		return "", err
	}
	if ent != nil {
		return ent.Kind, nil
	}
	return "", &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.PackageNotFound,
		Message: exception.PackageNotFoundMsg,
		Params:  map[string]interface{}{"packageId": id},
	}
}

func (p packageServiceImpl) GetGroupDescendantPackages(ctx context.Context, groupId string) ([]entity.PackageEntity, error) {
	groupEnt, err := p.publishedRepo.GetPackage(ctx, groupId)
	if err != nil {
		return nil, err
	}
	if groupEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": groupId},
		}
	}
	if groupEnt.Kind != entity.KIND_GROUP {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackageKind,
			Message: exception.InvalidPackageKindMsg,
			Params:  map[string]interface{}{"kind": groupEnt.Kind, "allowedKind": entity.KIND_GROUP},
		}
	}
	return p.publishedRepo.GetDescendantPackages(ctx, groupId)
}

func (p packageServiceImpl) GetPackageStatus(ctx context.Context, id string) (*view.Status, error) {
	ent, err := p.publishedRepo.GetPackage(ctx, id)
	if err != nil {
		return nil, err
	}
	if ent != nil {
		return &view.Status{Status: "exists"}, nil
	}
	deletedEnt, err := p.publishedRepo.GetDeletedPackage(ctx, id)
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

func (p packageServiceImpl) getParents(ctx context.Context, packageId string, includeDeleted bool) ([]view.ParentPackageInfo, error) {
	parents, err := p.publishedRepo.GetParentsForPackage(ctx, packageId, includeDeleted)
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

func (p packageServiceImpl) GetAvailableVersionPublishStatuses_deprecated(ctx context.Context, packageId string) (*view.Statuses_deprecated, error) {
	statusesForPublish, err := p.roleService.GetAvailableVersionPublishStatuses(ctx, packageId)
	if err != nil {
		return nil, err
	}
	return &view.Statuses_deprecated{Statuses: statusesForPublish}, err
}

func (p packageServiceImpl) RecalculateOperationGroups(ctx context.Context, packageId string) error {
	packageEnt, err := p.publishedRepo.GetPackage(ctx, packageId)
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
	err = p.publishedRepo.RecalculatePackageOperationGroups(ctx, packageEnt.Id, view.MakePackageGroupingPrefixRegex(packageEnt.RestGroupingPrefix), secctx.GetUserId(ctx))
	if err != nil {
		return err
	}
	return nil
}

func (p packageServiceImpl) CalculateOperationGroups(ctx context.Context, packageId string, groupingPrefix string) (*view.CalculatedOperationGroups, error) {
	packageEnt, err := p.publishedRepo.GetPackage(ctx, packageId)
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
	defaultVersion, err := p.versionService.GetDefaultVersion(ctx, packageId)
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
	groups, err := p.operationGroupService.CalculateOperationGroups(ctx, packageId, defaultVersion, groupingPrefix)
	if err != nil {
		return nil, err
	}
	return &view.CalculatedOperationGroups{Groups: groups}, nil
}
