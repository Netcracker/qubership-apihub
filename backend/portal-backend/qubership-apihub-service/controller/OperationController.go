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
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type OperationController interface {
	GetOperationList(w http.ResponseWriter, r *http.Request)
	GetOperation(w http.ResponseWriter, r *http.Request)
	GetOperationsTags(w http.ResponseWriter, r *http.Request)
	GetOperationChanges(w http.ResponseWriter, r *http.Request)
	GetOperationsChanges_deprecated(w http.ResponseWriter, r *http.Request)
	GetOperationChanges_deprecated_2(w http.ResponseWriter, r *http.Request)
	GetOperationsChanges(w http.ResponseWriter, r *http.Request)
	GetDeprecatedOperationsList(w http.ResponseWriter, r *http.Request)
	GetOperationDeprecatedItems(w http.ResponseWriter, r *http.Request)
	GetDeprecatedOperationsSummary(w http.ResponseWriter, r *http.Request)
	GetOperationModelUsages(w http.ResponseWriter, r *http.Request)
}

func NewOperationController(roleService service.RoleService,
	operationService service.OperationService,
	buildService service.BuildService,
	monitoringService service.MonitoringService,
	ptHandler service.PackageTransitionHandler) OperationController {
	return &operationControllerImpl{
		roleService:       roleService,
		operationService:  operationService,
		buildService:      buildService,
		monitoringService: monitoringService,
		ptHandler:         ptHandler,
	}
}

type operationControllerImpl struct {
	roleService       service.RoleService
	operationService  service.OperationService
	buildService      service.BuildService
	monitoringService service.MonitoringService
	ptHandler         service.PackageTransitionHandler
}

func (o operationControllerImpl) GetOperationList(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}

	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}

	kind, err := url.QueryUnescape(r.URL.Query().Get("kind"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "kind"},
			Debug:   err.Error(),
		})
		return
	}
	apiAudience := r.URL.Query().Get("apiAudience")
	if apiAudience == "all" {
		apiAudience = ""
	}
	if apiAudience != "" && !view.ValidApiAudience(apiAudience) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiAudience", "value": apiAudience},
		})
		return
	}

	tag, err := url.QueryUnescape(r.URL.Query().Get("tag"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "tag"},
			Debug:   err.Error(),
		})
		return
	}

	limit, customError := getLimitQueryParamWithExtendedMax(r)
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

	var deprecated *bool
	deprecatedStr := r.URL.Query().Get("deprecated")
	if deprecatedStr != "" {
		deprecatedBool, err := strconv.ParseBool(deprecatedStr)
		if err == nil {
			deprecated = &deprecatedBool
		}
	}

	hashList, customErr := getListFromParam(r, "hashList")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}

	ids, customErr := getListFromParam(r, "ids")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}

	includeData := false
	if r.URL.Query().Get("includeData") != "" {
		includeData, err = strconv.ParseBool(r.URL.Query().Get("includeData"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeData", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	emptyTag := false
	if r.URL.Query().Get("emptyTag") != "" {
		emptyTag, err = strconv.ParseBool(r.URL.Query().Get("emptyTag"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyTag", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	if emptyTag {
		tag = ""
	}

	skipRefs := false
	if r.URL.Query().Get("skipRefs") != "" {
		skipRefs, err = strconv.ParseBool(r.URL.Query().Get("skipRefs"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "skipRefs", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	documentSlug, err := url.QueryUnescape(r.URL.Query().Get("documentSlug"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "documentSlug"},
			Debug:   err.Error(),
		})
		return
	}

	emptyGroup := false
	if r.URL.Query().Get("emptyGroup") != "" {
		emptyGroup, err = strconv.ParseBool(r.URL.Query().Get("emptyGroup"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyGroup", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	group := r.URL.Query().Get("group")
	if emptyGroup && group != "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OverlappingQueryParameter,
			Message: exception.OverlappingQueryParameterMsg,
			Params:  map[string]interface{}{"param1": "emptyGroup", "param2": "group"},
		})
		return
	}
	refPackageId, err := url.QueryUnescape(r.URL.Query().Get("refPackageId"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "refPackageId"},
			Debug:   err.Error(),
		})
		return
	}

	restOperationListReq := view.OperationListReq{
		Deprecated:   deprecated,
		HashList:     hashList,
		Ids:          ids,
		IncludeData:  includeData,
		Kind:         kind,
		EmptyTag:     emptyTag,
		Tag:          tag,
		Limit:        limit,
		Page:         page,
		TextFilter:   textFilter,
		ApiType:      apiType,
		DocumentSlug: documentSlug,
		EmptyGroup:   emptyGroup,
		Group:        group,
		RefPackageId: refPackageId,
		ApiAudience:  apiAudience,
	}

	operations, err := o.operationService.GetOperations(packageId, versionName, skipRefs, restOperationListReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operations", err)
		return
	}
	RespondWithJson(w, http.StatusOK, operations)
}

func (o operationControllerImpl) GetOperation(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	operationId, err := getUnescapedStringParam(r, "operationId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "operationId"},
			Debug:   err.Error(),
		})
		return
	}

	o.monitoringService.AddOperationOpenCount(packageId, versionName, operationId)

	basicSearchFilter := view.OperationBasicSearchReq{
		PackageId:   packageId,
		Version:     versionName,
		ApiType:     apiType,
		OperationId: operationId,
	}

	operation, err := o.operationService.GetOperation(basicSearchFilter)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operation", err)
		return
	}
	RespondWithJson(w, http.StatusOK, operation)
}

func (o operationControllerImpl) GetOperationsTags(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	limit, customError := getLimitQueryParamWithIncreasedMax(r)
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
	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}
	kind, err := url.QueryUnescape(r.URL.Query().Get("kind"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "kind"},
			Debug:   err.Error(),
		})
		return
	}
	apiAudience := r.URL.Query().Get("apiAudience")
	if apiAudience == "all" {
		apiAudience = ""
	}
	if apiAudience != "" && !view.ValidApiAudience(apiAudience) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiAudience", "value": apiAudience},
		})
		return
	}
	skipRefs := false
	if r.URL.Query().Get("skipRefs") != "" {
		skipRefs, err = strconv.ParseBool(r.URL.Query().Get("skipRefs"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "skipRefs", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	basicSearchFilter := view.OperationBasicSearchReq{
		PackageId:   packageId,
		Version:     versionName,
		ApiType:     apiType,
		ApiKind:     kind,
		Limit:       limit,
		Offset:      limit * page,
		TextFilter:  textFilter,
		ApiAudience: apiAudience,
	}

	tags, err := o.operationService.GetOperationsTags(basicSearchFilter, skipRefs)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operations tags", err)
		return
	}
	RespondWithJson(w, http.StatusOK, tags)
}

func (o operationControllerImpl) GetOperationChanges(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	operationId, err := getUnescapedStringParam(r, "operationId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "operationId"},
			Debug:   err.Error(),
		})
		return
	}

	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	severities, customErr := getListFromParam(r, "severity")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}
	for _, severity := range severities {
		if !view.ValidSeverity(severity) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"param": "severity", "value": severity},
			})
			return
		}
	}
	changes, err := o.operationService.GetOperationChanges(packageId, versionName, operationId, previousVersionPackageId, previousVersion, severities)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operation changes", err)
		return
	}
	RespondWithJson(w, http.StatusOK, changes)
}

func (o operationControllerImpl) GetOperationChanges_deprecated_2(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	operationId, err := getUnescapedStringParam(r, "operationId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "operationId"},
			Debug:   err.Error(),
		})
		return
	}

	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	severities, customErr := getListFromParam(r, "severity")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}
	for _, severity := range severities {
		if !view.ValidSeverity(severity) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"param": "severity", "value": severity},
			})
			return
		}
	}
	changes, err := o.operationService.GetOperationChanges_deprecated_2(packageId, versionName, operationId, previousVersionPackageId, previousVersion, severities)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operation changes", err)
		return
	}
	RespondWithJson(w, http.StatusOK, changes)
}

func (o operationControllerImpl) GetOperationChanges_deprecated_2(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	operationId, err := getUnescapedStringParam(r, "operationId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "operationId"},
			Debug:   err.Error(),
		})
		return
	}

	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	severities, err := getListFromParam(r, "severity")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "severity"},
			Debug:   err.Error(),
		})
		return
	}
	for _, severity := range severities {
		if !view.ValidSeverity(severity) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"param": "severity", "value": severity},
			})
			return
		}
	}
	changes, err := o.operationService.GetOperationChanges_deprecated_2(packageId, versionName, operationId, previousVersionPackageId, previousVersion, severities)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operation changes", err)
		return
	}
	RespondWithJson(w, http.StatusOK, changes)
}

func (o operationControllerImpl) GetOperationsChanges_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
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
	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}
	apiKind := r.URL.Query().Get("apiKind")
	documentSlug := r.URL.Query().Get("documentSlug")
	refPackageId := r.URL.Query().Get("refPackageId")
	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")

	emptyTag := false
	emptyTagStr := r.URL.Query().Get("emptyTag")
	if emptyTagStr != "" {
		emptyTag, err = strconv.ParseBool(emptyTagStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyTag", "type": "bool"},
				Debug:   err.Error(),
			})
			return
		}
	}
	tags := make([]string, 0)
	var customErr *exception.CustomError
	if !emptyTag {
		tags, customErr = getListFromParam(r, "tag")
		if customErr != nil {
			RespondWithCustomError(w, customErr)
			return
		}
	}
	emptyGroup := false
	if r.URL.Query().Get("emptyGroup") != "" {
		emptyGroup, err = strconv.ParseBool(r.URL.Query().Get("emptyGroup"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyGroup", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	group := r.URL.Query().Get("group")
	if emptyGroup && group != "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OverlappingQueryParameter,
			Message: exception.OverlappingQueryParameterMsg,
			Params:  map[string]interface{}{"param1": "emptyGroup", "param2": "group"},
		})
		return
	}

	severities := make([]string, 0)
	severities, customErr = getListFromParam(r, "severity")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}
	if len(severities) > 0 {
		for _, severity := range severities {
			if !view.ValidSeverity(severity) {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameterValue,
					Message: exception.InvalidParameterValueMsg,
					Params:  map[string]interface{}{"param": "severity", "value": severity},
				})
				return
			}
		}
	}

	versionChangesSearchReq := view.VersionChangesReq{
		PreviousVersion:          previousVersion,
		PreviousVersionPackageId: previousVersionPackageId,
		DocumentSlug:             documentSlug,
		ApiKind:                  apiKind,
		EmptyTag:                 emptyTag,
		RefPackageId:             refPackageId,
		Tags:                     tags,
		TextFilter:               textFilter,
		Limit:                    limit,
		Offset:                   limit * page,
		EmptyGroup:               emptyGroup,
		Group:                    group,
		Severities:               severities,
	}

	changelog, err := o.operationService.GetVersionChanges_deprecated(packageId, versionName, apiType, versionChangesSearchReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operations changelog", err)
		return
	}
	RespondWithJson(w, http.StatusOK, changelog)
}

func (o operationControllerImpl) GetOperationsChanges(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
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
	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}
	apiKind := r.URL.Query().Get("apiKind")
	apiAudience := r.URL.Query().Get("apiAudience")
	if apiAudience == "all" {
		apiAudience = ""
	}
	if apiAudience != "" && !view.ValidApiAudience(apiAudience) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiAudience", "value": apiAudience},
		})
		return
	}
	documentSlug := r.URL.Query().Get("documentSlug")
	refPackageId := r.URL.Query().Get("refPackageId")
	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")

	emptyTag := false
	emptyTagStr := r.URL.Query().Get("emptyTag")
	if emptyTagStr != "" {
		emptyTag, err = strconv.ParseBool(emptyTagStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyTag", "type": "bool"},
				Debug:   err.Error(),
			})
			return
		}
	}
	tags := make([]string, 0)
	var customErr *exception.CustomError
	if !emptyTag {
		tags, customErr = getListFromParam(r, "tag")
		if customErr != nil {
			RespondWithCustomError(w, customErr)
			return
		}
	}
	emptyGroup := false
	if r.URL.Query().Get("emptyGroup") != "" {
		emptyGroup, err = strconv.ParseBool(r.URL.Query().Get("emptyGroup"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyGroup", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	group := r.URL.Query().Get("group")
	if emptyGroup && group != "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OverlappingQueryParameter,
			Message: exception.OverlappingQueryParameterMsg,
			Params:  map[string]interface{}{"param1": "emptyGroup", "param2": "group"},
		})
		return
	}

	severities := make([]string, 0)
	severities, customErr = getListFromParam(r, "severity")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}
	if len(severities) > 0 {
		for _, severity := range severities {
			if !view.ValidSeverity(severity) {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidParameterValue,
					Message: exception.InvalidParameterValueMsg,
					Params:  map[string]interface{}{"param": "severity", "value": severity},
				})
				return
			}
		}
	}

	versionChangesSearchReq := view.VersionChangesReq{
		PreviousVersion:          previousVersion,
		PreviousVersionPackageId: previousVersionPackageId,
		DocumentSlug:             documentSlug,
		ApiKind:                  apiKind,
		EmptyTag:                 emptyTag,
		RefPackageId:             refPackageId,
		Tags:                     tags,
		TextFilter:               textFilter,
		Limit:                    limit,
		Offset:                   limit * page,
		EmptyGroup:               emptyGroup,
		Group:                    group,
		Severities:               severities,
		ApiAudience:              apiAudience,
	}

	changelog, err := o.operationService.GetVersionChanges(packageId, versionName, apiType, versionChangesSearchReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operations changelog", err)
		return
	}
	RespondWithJson(w, http.StatusOK, changelog)
}

func (o operationControllerImpl) GetDeprecatedOperationsList(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}

	textFilter, err := url.QueryUnescape(r.URL.Query().Get("textFilter"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "textFilter"},
			Debug:   err.Error(),
		})
		return
	}

	kind, err := url.QueryUnescape(r.URL.Query().Get("apiKind"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiKind"},
			Debug:   err.Error(),
		})
		return
	}
	apiAudience := r.URL.Query().Get("apiAudience")
	if apiAudience == "all" {
		apiAudience = ""
	}
	if apiAudience != "" && !view.ValidApiAudience(apiAudience) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "apiAudience", "value": apiAudience},
		})
		return
	}

	tags := make([]string, 0)
	tags, customErr := getListFromParam(r, "tag")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
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

	ids, customErr := getListFromParam(r, "ids")
	if customErr != nil {
		RespondWithCustomError(w, customErr)
		return
	}

	includeDeprecatedItems := false
	if r.URL.Query().Get("includeDeprecatedItems") != "" {
		includeDeprecatedItems, err = strconv.ParseBool(r.URL.Query().Get("includeDeprecatedItems"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeDeprecatedItems", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	documentSlug, err := url.QueryUnescape(r.URL.Query().Get("documentSlug"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "documentSlug"},
			Debug:   err.Error(),
		})
		return
	}

	refPackageId, err := url.QueryUnescape(r.URL.Query().Get("refPackageId"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "refPackageId"},
			Debug:   err.Error(),
		})
		return
	}

	emptyTag := false
	if r.URL.Query().Get("emptyTag") != "" {
		emptyTag, err = strconv.ParseBool(r.URL.Query().Get("emptyTag"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyTag", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	emptyGroup := false
	if r.URL.Query().Get("emptyGroup") != "" {
		emptyGroup, err = strconv.ParseBool(r.URL.Query().Get("emptyGroup"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "emptyGroup", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	group := r.URL.Query().Get("group")
	if emptyGroup && group != "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.OverlappingQueryParameter,
			Message: exception.OverlappingQueryParameterMsg,
			Params:  map[string]interface{}{"param1": "emptyGroup", "param2": "group"},
		})
		return
	}

	o.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.DeprecatedOperationsCalled, packageId)

	deprecatedOperationListReq := view.DeprecatedOperationListReq{
		Ids:                    ids,
		Kind:                   kind,
		Tags:                   tags,
		Limit:                  limit,
		Page:                   page,
		TextFilter:             textFilter,
		ApiType:                apiType,
		DocumentSlug:           documentSlug,
		IncludeDeprecatedItems: includeDeprecatedItems,
		RefPackageId:           refPackageId,
		EmptyTag:               emptyTag,
		EmptyGroup:             emptyGroup,
		Group:                  group,
		ApiAudience:            apiAudience,
	}

	operations, err := o.operationService.GetDeprecatedOperations(packageId, versionName, deprecatedOperationListReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operations", err)
		return
	}
	RespondWithJson(w, http.StatusOK, operations)
}

func (o operationControllerImpl) GetOperationDeprecatedItems(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	operationId, err := getUnescapedStringParam(r, "operationId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "operationId"},
			Debug:   err.Error(),
		})
		return
	}

	o.monitoringService.AddOperationOpenCount(packageId, versionName, operationId)

	basicSearchFilter := view.OperationBasicSearchReq{
		PackageId:   packageId,
		Version:     versionName,
		ApiType:     apiType,
		OperationId: operationId,
	}

	operationDeprecatedItems, err := o.operationService.GetOperationDeprecatedItems(basicSearchFilter)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operation deprecated items", err)
		return
	}
	RespondWithJson(w, http.StatusOK, operationDeprecatedItems)
}

func (o operationControllerImpl) GetDeprecatedOperationsSummary(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	deprecatedOperationsSummary, err := o.operationService.GetDeprecatedOperationsSummary(packageId, versionName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operation deprecated summary", err)
		return
	}
	RespondWithJson(w, http.StatusOK, deprecatedOperationsSummary)

}

func (o operationControllerImpl) GetOperationModelUsages(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := o.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to check user privileges", err)
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
	version, err := getUnescapedStringParam(r, "version")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	apiType, err := getUnescapedStringParam(r, "apiType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "apiType"},
			Debug:   err.Error(),
		})
		return
	}
	operationId, err := getUnescapedStringParam(r, "operationId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "operationId"},
			Debug:   err.Error(),
		})
		return
	}
	modelName, err := getUnescapedStringParam(r, "modelName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "modelName"},
			Debug:   err.Error(),
		})
		return
	}
	modelUsages, err := o.operationService.GetOperationModelUsages(packageId, version, apiType, operationId, modelName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, o.ptHandler, packageId, "Failed to get operation model usages", err)
		return
	}
	RespondWithJson(w, http.StatusOK, modelUsages)
}
