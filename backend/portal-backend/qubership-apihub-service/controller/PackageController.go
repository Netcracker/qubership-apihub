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

package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PackageController interface {
	UpdatePackage(w http.ResponseWriter, r *http.Request)
	CreatePackage(w http.ResponseWriter, r *http.Request)
	DeletePackage(w http.ResponseWriter, r *http.Request)
	DisfavorPackage(w http.ResponseWriter, r *http.Request)
	FavorPackage(w http.ResponseWriter, r *http.Request)
	GetPackage(w http.ResponseWriter, r *http.Request)
	GetPackageStatus(w http.ResponseWriter, r *http.Request)
	GetPackagesList(w http.ResponseWriter, r *http.Request)
	GetAvailableVersionStatusesForPublish(w http.ResponseWriter, r *http.Request)
	RecalculateOperationGroups(w http.ResponseWriter, r *http.Request)
	CalculateOperationGroups(w http.ResponseWriter, r *http.Request)
}

func NewPackageController(packageService service.PackageService,
	versionService service.PublishedService,
	portalService service.PortalService,
	searchService service.SearchService,
	roleService service.RoleService,
	monitoringService service.MonitoringService,
	ptHandler service.PackageTransitionHandler) PackageController {
	return &packageControllerImpl{
		publishedService:  versionService,
		portalService:     portalService,
		searchService:     searchService,
		packageService:    packageService,
		roleService:       roleService,
		monitoringService: monitoringService,
		ptHandler:         ptHandler,
	}
}

type packageControllerImpl struct {
	publishedService  service.PublishedService
	portalService     service.PortalService
	searchService     service.SearchService
	packageService    service.PackageService
	roleService       service.RoleService
	monitoringService service.MonitoringService
	ptHandler         service.PackageTransitionHandler
}

func (p packageControllerImpl) DeletePackage(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.DeletePackagePermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err = p.packageService.DeletePackage(ctx, packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to delete package", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (p packageControllerImpl) DisfavorPackage(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err = p.packageService.DisfavorPackage(ctx, packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to remove group from favorites", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (p packageControllerImpl) FavorPackage(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err = p.packageService.FavorPackage(ctx, packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to add package to favorites", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (p packageControllerImpl) GetPackage(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)

	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	showParentsString := r.URL.Query().Get("showParents")
	showParents, err := strconv.ParseBool(showParentsString)

	packageInfo, err := p.packageService.GetPackage(ctx, packageId, showParents)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to get package info", err)
		return
	}
	RespondWithJson(w, http.StatusOK, packageInfo)
}

func (p packageControllerImpl) GetPackageStatus(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	packageStatus, err := p.packageService.GetPackageStatus(packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to get package status", err)
		return
	}
	RespondWithJson(w, http.StatusOK, packageStatus)
}

func (p packageControllerImpl) GetPackagesList(w http.ResponseWriter, r *http.Request) {
	var err error
	filter := r.URL.Query().Get("textFilter")
	parentId := r.URL.Query().Get("parentId")
	kind, customErr := getListFromParam(r, "kind")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}
	onlyFavorite := false
	if r.URL.Query().Get("onlyFavorite") != "" {
		onlyFavorite, err = strconv.ParseBool(r.URL.Query().Get("onlyFavorite"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyFavorite", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	onlyShared := false
	if r.URL.Query().Get("onlyShared") != "" {
		onlyShared, err = strconv.ParseBool(r.URL.Query().Get("onlyShared"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyShared", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	showParents := false
	if r.URL.Query().Get("showParents") != "" {
		showParents, err = strconv.ParseBool(r.URL.Query().Get("showParents"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "showParents", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	lastReleaseVersionDetails := false
	if r.URL.Query().Get("lastReleaseVersionDetails") != "" {
		lastReleaseVersionDetails, err = strconv.ParseBool(r.URL.Query().Get("lastReleaseVersionDetails"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "lastReleaseVersionDetails", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		RespondWithCustomError(w, customError)
		return
	}

	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
	}
	serviceName := r.URL.Query().Get("serviceName")

	showAllDescendants := false
	if r.URL.Query().Get("showAllDescendants") != "" {
		showAllDescendants, err = strconv.ParseBool(r.URL.Query().Get("showAllDescendants"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "showAllDescendants", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	packageListReq := view.PackageListReq{
		Kind:                      kind,
		Limit:                     limit,
		OnlyFavorite:              onlyFavorite,
		OnlyShared:                onlyShared,
		Offset:                    limit * page,
		ParentId:                  parentId,
		ShowParents:               showParents,
		TextFilter:                filter,
		LastReleaseVersionDetails: lastReleaseVersionDetails,
		ServiceName:               serviceName,
		ShowAllDescendants:        showAllDescendants,
	}

	packages, err := p.packageService.GetPackagesList(context.Create(r), packageListReq)

	if err != nil {
		RespondWithError(w, "Failed to get packages", err)
		return
	}
	RespondWithJson(w, http.StatusOK, packages)
}

func (p packageControllerImpl) CreatePackage(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var packg view.SimplePackage
	err = json.Unmarshal(body, &packg)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(packg)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	ctx := context.Create(r)
	var sufficientPrivileges bool
	if packg.ParentId == "" {
		sufficientPrivileges = p.roleService.IsSysadm(ctx)
	} else {
		sufficientPrivileges, err = p.roleService.HasRequiredPermissions(ctx, packg.ParentId, view.CreateAndUpdatePackagePermission)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	if !IsAcceptableAlias(packg.Alias) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasContainsForbiddenChars,
			Message: exception.AliasContainsForbiddenCharsMsg,
		})
		return
	}

	if !strings.Contains(packg.ParentId, ".") && strings.ToLower(packg.Alias) == "runenv" && !p.roleService.IsSysadm(ctx) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AliasContainsRunenvChars,
			Message: exception.AliasContainsRunenvCharsMsg,
		})
		return
	}

	newPackage, err := p.packageService.CreatePackage(ctx, packg)
	if err != nil {
		RespondWithError(w, "Failed to create package", err)
		return
	}
	if newPackage.ParentId != "" && (newPackage.Kind == entity.KIND_PACKAGE || newPackage.Kind == entity.KIND_DASHBOARD) {
		p.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.PackagesAndDashboardsCreated, newPackage.ParentId)
	}

	RespondWithJson(w, http.StatusCreated, newPackage)
}

func (p packageControllerImpl) UpdatePackage(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.CreateAndUpdatePackagePermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var patchPackage view.PatchPackageReq

	err = json.Unmarshal(body, &patchPackage)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	updatedPackage, err := p.packageService.UpdatePackage(ctx, &patchPackage, packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to update Package info", err)
		return
	}

	RespondWithJson(w, http.StatusOK, updatedPackage)
}

func (p packageControllerImpl) GetAvailableVersionStatusesForPublish(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	availableVersionStatusesForPublish, err := p.packageService.GetAvailableVersionPublishStatuses(ctx, packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to get available version statuses for publish", err)
		return
	}
	RespondWithJson(w, http.StatusOK, availableVersionStatusesForPublish)
}

func (p packageControllerImpl) RecalculateOperationGroups(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.CreateAndUpdatePackagePermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err = p.packageService.RecalculateOperationGroups(ctx, packageId)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to recalculate operation groups", err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (p packageControllerImpl) CalculateOperationGroups(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	groupingPrefix, err := url.QueryUnescape(r.URL.Query().Get("groupingPrefix"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupingPrefix"},
			Debug:   err.Error(),
		})
		return
	}

	groups, err := p.packageService.CalculateOperationGroups(packageId, groupingPrefix)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, p.ptHandler, packageId, "Failed to calculate operation groups", err)
		return
	}

	RespondWithJson(w, http.StatusOK, groups)
}
