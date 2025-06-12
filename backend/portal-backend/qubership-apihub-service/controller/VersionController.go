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
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type VersionController interface {
	GetPackageVersionContent_deprecated(w http.ResponseWriter, r *http.Request)
	GetPackageVersionContent(w http.ResponseWriter, r *http.Request)
	GetPackageVersionsList_deprecated(w http.ResponseWriter, r *http.Request)
	GetPackageVersionsList(w http.ResponseWriter, r *http.Request)
	DeleteVersion(w http.ResponseWriter, r *http.Request)
	PatchVersion(w http.ResponseWriter, r *http.Request)
	GetVersionedContentFileRaw(w http.ResponseWriter, r *http.Request)
	GetVersionedDocument_deprecated(w http.ResponseWriter, r *http.Request)
	GetVersionedDocument(w http.ResponseWriter, r *http.Request)
	GetVersionDocuments(w http.ResponseWriter, r *http.Request)
	GetSharedContentFile(w http.ResponseWriter, r *http.Request)
	SharePublishedFile(w http.ResponseWriter, r *http.Request)
	GetVersionChanges(w http.ResponseWriter, r *http.Request)
	GetVersionProblems(w http.ResponseWriter, r *http.Request)
	GetVersionReferences(w http.ResponseWriter, r *http.Request) //deprecated
	GetVersionReferencesV3(w http.ResponseWriter, r *http.Request)
	GetVersionRevisionsList_deprecated(w http.ResponseWriter, r *http.Request)
	GetVersionRevisionsList(w http.ResponseWriter, r *http.Request)
	DeleteVersionsRecursively(w http.ResponseWriter, r *http.Request)
	CopyVersion(w http.ResponseWriter, r *http.Request)
	GetPublishedVersionsHistory(w http.ResponseWriter, r *http.Request)
	PublishFromCSV(w http.ResponseWriter, r *http.Request)
	GetCSVDashboardPublishStatus(w http.ResponseWriter, r *http.Request)
	GetCSVDashboardPublishReport(w http.ResponseWriter, r *http.Request)
}

func NewVersionController(versionService service.VersionService, roleService service.RoleService, monitoringService service.MonitoringService,
	ptHandler service.PackageTransitionHandler, isSysadm func(context.SecurityContext) bool) VersionController {
	return &versionControllerImpl{
		versionService:    versionService,
		roleService:       roleService,
		monitoringService: monitoringService,
		ptHandler:         ptHandler,
		isSysadm:          isSysadm,
	}
}

type versionControllerImpl struct {
	versionService    service.VersionService
	roleService       service.RoleService
	monitoringService service.MonitoringService
	ptHandler         service.PackageTransitionHandler
	isSysadm          func(context.SecurityContext) bool
}

func (v versionControllerImpl) SharePublishedFile(w http.ResponseWriter, r *http.Request) {
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
	var sharedFilesReq view.SharedFilesReq
	err = json.Unmarshal(body, &sharedFilesReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(sharedFilesReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, sharedFilesReq.PackageId, view.ReadPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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
	sharedUrlInfo, err := v.versionService.SharePublishedFile(sharedFilesReq.PackageId, sharedFilesReq.Version, sharedFilesReq.Slug)
	if err != nil {
		RespondWithError(w, "Failed to create shared URL for content", err)
		return
	}
	RespondWithJson(w, http.StatusOK, sharedUrlInfo)
}

func (v versionControllerImpl) GetSharedContentFile(w http.ResponseWriter, r *http.Request) {
	sharedFileId := getStringParam(r, "sharedFileId")

	contentData, attachmentFileName, err := v.versionService.GetSharedFile(sharedFileId)
	if err != nil {
		RespondWithError(w, "Failed to get published content by shared ID", err)
		return
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachmentFileName))
	w.Header().Set("Content-Type", "text/plain") // For frontend it's convenient to get all types as plain text
	w.WriteHeader(http.StatusOK)
	w.Write(contentData)
}

// deprecated
func (v versionControllerImpl) GetVersionedDocument_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	slug := getStringParam(r, "slug")

	v.monitoringService.AddDocumentOpenCount(packageId, versionName, slug)
	v.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.DocumentsCalled, packageId)

	document, err := v.versionService.GetLatestDocumentBySlug_deprecated(packageId, versionName, slug)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get versioned document", err)
		return
	}
	RespondWithJson(w, http.StatusOK, document)
}

func (v versionControllerImpl) GetVersionedDocument(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	slug := getStringParam(r, "slug")

	v.monitoringService.AddDocumentOpenCount(packageId, versionName, slug)
	v.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.DocumentsCalled, packageId)

	document, err := v.versionService.GetLatestDocumentBySlug(packageId, versionName, slug)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get versioned document", err)
		return
	}
	RespondWithJson(w, http.StatusOK, document)
}

func (v versionControllerImpl) GetVersionDocuments(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	apiType := r.URL.Query().Get("apiType")
	if apiType != "" {
		_, err = view.ParseApiType(apiType)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"param": "apiType", "value": apiType},
				Debug:   err.Error(),
			})
			return
		}
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

	versionDocumentsFilterReq := view.DocumentsFilterReq{
		Limit:      limit,
		Offset:     limit * page,
		TextFilter: textFilter,
		ApiType:    apiType,
	}

	documents, err := v.versionService.GetLatestDocuments(packageId, versionName, skipRefs, versionDocumentsFilterReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get version documents", err)
		return
	}
	RespondWithJson(w, http.StatusOK, documents)
}

func (v versionControllerImpl) DeleteVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
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
	versionStatus, err := v.versionService.GetVersionStatus(packageId, versionName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges(get version status)", err)
		return
	}
	sufficientPrivileges, err := v.roleService.HasManageVersionPermission(ctx, packageId, versionStatus)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	err = v.versionService.DeleteVersion(ctx, packageId, versionName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to delete package version", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (v versionControllerImpl) PatchVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
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
	var req view.VersionPatchRequest
	err = json.Unmarshal(body, &req)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	if req.Status == nil && req.VersionLabels == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: "All patch parameters are null which is not allowed",
		})
		return
	}

	statuses := make([]string, 0)
	if req.Status != nil {
		_, err := view.ParseVersionStatus(*req.Status)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: err.Error(),
			})
			return
		}
		statuses = append(statuses, *req.Status)
	}

	if req.VersionLabels != nil {
		versionStatus, err := v.versionService.GetVersionStatus(packageId, versionName)
		if err != nil {
			handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges (get version status)", err)
			return
		}
		statuses = append(statuses, versionStatus)
	}
	sufficientPrivileges, err := v.roleService.HasManageVersionPermission(ctx, packageId, statuses...)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	content, err := v.versionService.PatchVersion(context.Create(r), packageId, versionName, req.Status, req.VersionLabels)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to patch version", err)
		return
	}

	RespondWithJson(w, http.StatusOK, content)
}

func (v versionControllerImpl) GetPackageVersionsList_deprecated(w http.ResponseWriter, r *http.Request) {
	var err error

	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	status, err := url.QueryUnescape(r.URL.Query().Get("status"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "status"},
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

	versionLabel, err := url.QueryUnescape(r.URL.Query().Get("versionLabel"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "versionLabel"},
			Debug:   err.Error(),
		})
		return
	}

	checkRevisions := false
	if r.URL.Query().Get("checkRevisions") != "" {
		checkRevisions, err = strconv.ParseBool(r.URL.Query().Get("checkRevisions"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "checkRevisions", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	sortBy := r.URL.Query().Get("sortBy")
	if sortBy == "" {
		sortBy = view.VersionSortByVersion
	}
	sortOrder := r.URL.Query().Get("sortOrder")
	if sortOrder == "" {
		sortOrder = view.VersionSortOrderDesc
	}

	versionListReq := view.VersionListReq{
		PackageId:      packageId,
		Status:         status,
		Limit:          limit,
		Page:           page,
		TextFilter:     textFilter,
		SortBy:         sortBy,
		SortOrder:      sortOrder,
		Label:          versionLabel,
		CheckRevisions: checkRevisions,
	}

	versions, err := v.versionService.GetPackageVersionsView_deprecated(versionListReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get package versions", err)
		return
	}
	RespondWithJson(w, http.StatusOK, versions)
}
func (v versionControllerImpl) GetPackageVersionsList(w http.ResponseWriter, r *http.Request) {
	var err error

	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	status := r.URL.Query().Get("status")

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

	textFilter := r.URL.Query().Get("textFilter")
	versionLabel := r.URL.Query().Get("versionLabel")
	sortBy := r.URL.Query().Get("sortBy")
	if sortBy == "" {
		sortBy = view.VersionSortByVersion
	}
	sortOrder := r.URL.Query().Get("sortOrder")
	if sortOrder == "" {
		sortOrder = view.VersionSortOrderDesc
	}

	checkRevisions := false
	if r.URL.Query().Get("checkRevisions") != "" {
		checkRevisions, err = strconv.ParseBool(r.URL.Query().Get("checkRevisions"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "checkRevisions", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	versionListReq := view.VersionListReq{
		PackageId:      packageId,
		Status:         status,
		Limit:          limit,
		Page:           page,
		TextFilter:     textFilter,
		Label:          versionLabel,
		CheckRevisions: checkRevisions,
		SortBy:         sortBy,
		SortOrder:      sortOrder,
	}

	versions, err := v.versionService.GetPackageVersionsView(versionListReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get package versions", err)
		return
	}
	RespondWithJson(w, http.StatusOK, versions)
}

func (v versionControllerImpl) GetPackageVersionContent_deprecated(w http.ResponseWriter, r *http.Request) {
	var err error
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	includeSummary := false
	if r.URL.Query().Get("includeSummary") != "" {
		includeSummary, err = strconv.ParseBool(r.URL.Query().Get("includeSummary"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeSummary", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	includeOperations := false
	if r.URL.Query().Get("includeOperations") != "" {
		includeOperations, err = strconv.ParseBool(r.URL.Query().Get("includeOperations"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeOperations", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	includeGroups := false
	if r.URL.Query().Get("includeGroups") != "" {
		includeGroups, err = strconv.ParseBool(r.URL.Query().Get("includeGroups"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeGroups", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	v.monitoringService.AddVersionOpenCount(packageId, version)

	content, err := v.versionService.GetPackageVersionContent_deprecated(packageId, version, includeSummary, includeOperations, includeGroups)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get package version content", err)
		return
	}

	RespondWithJson(w, http.StatusOK, content)
}

func (v versionControllerImpl) GetPackageVersionContent(w http.ResponseWriter, r *http.Request) {
	var err error
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	includeSummary := false
	if r.URL.Query().Get("includeSummary") != "" {
		includeSummary, err = strconv.ParseBool(r.URL.Query().Get("includeSummary"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeSummary", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	includeOperations := false
	if r.URL.Query().Get("includeOperations") != "" {
		includeOperations, err = strconv.ParseBool(r.URL.Query().Get("includeOperations"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeOperations", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	includeGroups := false
	if r.URL.Query().Get("includeGroups") != "" {
		includeGroups, err = strconv.ParseBool(r.URL.Query().Get("includeGroups"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeGroups", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	v.monitoringService.AddVersionOpenCount(packageId, version)

	content, err := v.versionService.GetPackageVersionContent(packageId, version, includeSummary, includeOperations, includeGroups)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get package version content", err)
		return
	}

	RespondWithJson(w, http.StatusOK, content)
}

func (v versionControllerImpl) GetVersionedContentFileRaw(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	slug := getStringParam(r, "slug")

	v.monitoringService.AddDocumentOpenCount(packageId, versionName, slug)
	v.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.DocumentsCalled, packageId)

	content, contentData, err := v.versionService.GetLatestContentDataBySlug(packageId, versionName, slug)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get published content", err)
		return
	}
	w.Header().Set("Content-Type", contentData.DataType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", content.Name))
	w.WriteHeader(http.StatusOK)
	w.Write(contentData.Data)
}

func (v versionControllerImpl) GetVersionChanges(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	changes, err := v.versionService.GetVersionValidationChanges(packageId, versionName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get version changes", err)
		return
	}

	RespondWithJson(w, http.StatusOK, changes)
}

func (v versionControllerImpl) GetVersionProblems(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	problems, err := v.versionService.GetVersionValidationProblems(packageId, versionName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get version problems", err)
		return
	}

	RespondWithJson(w, http.StatusOK, problems)
}

// deprecated
func (v versionControllerImpl) GetVersionReferences(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	versionReferencesFilterReq := view.VersionReferencesReq{
		Limit:              limit,
		Page:               page,
		TextFilter:         textFilter,
		Kind:               kind,
		ShowAllDescendants: showAllDescendants,
	}

	references, err := v.versionService.GetVersionReferences(packageId, versionName, versionReferencesFilterReq)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get version references", err)
		return
	}
	RespondWithJson(w, http.StatusOK, references)
}

func (v versionControllerImpl) GetVersionReferencesV3(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	references, err := v.versionService.GetVersionReferencesV3(packageId, versionName)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get version references", err)
		return
	}
	RespondWithJson(w, http.StatusOK, references)
}

func (v versionControllerImpl) GetVersionRevisionsList_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	pagingFilter := view.PagingFilterReq{
		TextFilter: textFilter,
		Limit:      limit,
		Offset:     limit * page,
	}
	versionRevisionsList, err := v.versionService.GetVersionRevisionsList_deprecated(packageId, versionName, pagingFilter)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get version revisions list", err)
		return
	}
	RespondWithJson(w, http.StatusOK, versionRevisionsList)
}
func (v versionControllerImpl) GetVersionRevisionsList(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	pagingFilter := view.PagingFilterReq{
		TextFilter: textFilter,
		Limit:      limit,
		Offset:     limit * page,
	}
	versionRevisionsList, err := v.versionService.GetVersionRevisionsList(packageId, versionName, pagingFilter)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to get version revisions list", err)
		return
	}
	RespondWithJson(w, http.StatusOK, versionRevisionsList)
}

func (v versionControllerImpl) DeleteVersionsRecursively(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ManageDraftVersionPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	var req view.DeleteVersionsRecursivelyReq
	err = json.Unmarshal(body, &req)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	id, err := v.versionService.DeleteVersionsRecursively(ctx, packageId, req.OlderThanDate)
	if err != nil {
		RespondWithError(w, "failed to cleanup old versions", err)
		return
	}
	RespondWithJson(w, http.StatusOK, map[string]string{"jobId": id})
}

func (v versionControllerImpl) CopyVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
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
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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
	body, err := io.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var req view.CopyVersionReq
	err = json.Unmarshal(body, &req)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(req)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}
	_, err = view.ParseVersionStatus(req.TargetStatus)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: err.Error(),
		})
		return
	}
	sufficientPrivileges, err = v.roleService.HasManageVersionPermission(ctx, req.TargetPackageId, req.TargetStatus)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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

	publishId, err := v.versionService.CopyVersion(ctx, packageId, version, req)
	if err != nil {
		RespondWithError(w, "Failed to copy published version", err)
		return
	}
	RespondWithJson(w, http.StatusAccepted, view.CopyVersionResp{PublishId: publishId})
}

func (v versionControllerImpl) GetPublishedVersionsHistory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !v.isSysadm(ctx) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	var err error
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
	filter := view.PublishedVersionHistoryFilter{
		Limit: limit,
		Page:  page,
	}
	if r.URL.Query().Get("publishedBefore") != "" {
		publishedBefore, err := time.Parse(time.RFC3339, r.URL.Query().Get("publishedBefore"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "publishedBefore", "type": "time"},
				Debug:   err.Error(),
			})
			return
		}
		filter.PublishedBefore = &publishedBefore
	}
	if r.URL.Query().Get("publishedAfter") != "" {
		publishedAfter, err := time.Parse(time.RFC3339, r.URL.Query().Get("publishedAfter"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "publishedAfter", "type": "time"},
				Debug:   err.Error(),
			})
			return
		}
		filter.PublishedAfter = &publishedAfter
	}
	status := r.URL.Query().Get("status")
	if status != "" {
		filter.Status = &status
	}

	history, err := v.versionService.GetPublishedVersionsHistory(filter)
	if err != nil {
		RespondWithError(w, "Failed to get published versions history", err)
		return
	}
	RespondWithJson(w, http.StatusOK, history)
}

func (v versionControllerImpl) PublishFromCSV(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, v.ptHandler, packageId, "Failed to check user privileges", err)
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

	err = r.ParseMultipartForm(0)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	defer func() {
		err := r.MultipartForm.RemoveAll()
		if err != nil {
			log.Debugf("failed to remove temporary data: %+v", err)
		}
	}()
	csvPublishReq := view.PublishFromCSVReq{}
	csvPublishReq.PackageId = packageId
	csvPublishReq.Version = r.FormValue("version")
	csvPublishReq.ServicesWorkspaceId = r.FormValue("servicesWorkspaceId")
	csvPublishReq.PreviousVersion = r.FormValue("previousVersion")
	csvPublishReq.PreviousVersionPackageId = r.FormValue("previousVersionPackageId")
	csvPublishReq.Status = r.FormValue("status")
	versionLabelsArrStr := r.FormValue("versionLabels")
	if versionLabelsArrStr != "" {
		err = json.Unmarshal([]byte(versionLabelsArrStr), &csvPublishReq.VersionLabels)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BadRequestBody,
				Message: exception.BadRequestBodyMsg,
				Debug:   fmt.Sprintf("failed to unmarshal versionLabels field: %v", err.Error()),
			})
			return
		}
	}
	csvFile, _, err := r.FormFile("csvFile")
	if err != http.ErrMissingFile {
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		csvData, err := io.ReadAll(csvFile)
		closeErr := csvFile.Close()
		if closeErr != nil {
			log.Errorf("failed to close temporary file: %+v", err)
		}
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		csvPublishReq.CSVData = csvData
	} else if r.FormValue("csvFile") != "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidMultipartFileType,
			Message: exception.InvalidMultipartFileTypeMsg,
			Params:  map[string]interface{}{"field": "csvFile"},
		})
		return
	}
	validationErr := utils.ValidateObject(csvPublishReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	_, err = view.ParseVersionStatus(csvPublishReq.Status)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: err.Error(),
		})
		return
	}
	sufficientPrivileges, err = v.roleService.HasManageVersionPermission(ctx, csvPublishReq.PackageId, csvPublishReq.Status)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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

	publishId, err := v.versionService.StartPublishFromCSV(ctx, csvPublishReq)
	if err != nil {
		RespondWithError(w, "Failed to start dashboard publish from csv", err)
		return
	}
	RespondWithJson(w, http.StatusAccepted, view.PublishFromCSVResp{PublishId: publishId})
}

func (v versionControllerImpl) GetCSVDashboardPublishStatus(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	publishId := getStringParam(r, "publishId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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

	publishStatus, err := v.versionService.GetCSVDashboardPublishStatus(publishId)
	if err != nil {
		RespondWithError(w, "Failed to get publish status", err)
		return
	}
	RespondWithJson(w, http.StatusOK, publishStatus)
}

func (v versionControllerImpl) GetCSVDashboardPublishReport(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	publishId := getStringParam(r, "publishId")
	ctx := context.Create(r)
	sufficientPrivileges, err := v.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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

	publishReport, err := v.versionService.GetCSVDashboardPublishReport(publishId)
	if err != nil {
		RespondWithError(w, "Failed to get publish report", err)
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=publish_report_%v.csv", time.Now().Format("2006-01-02 15-04-05")))
	w.Header().Set("Expires", "0")
	w.WriteHeader(http.StatusOK)
	w.Write(publishReport)
}
