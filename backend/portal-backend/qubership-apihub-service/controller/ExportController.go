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
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"io"
	"net/http"
	"net/url"
	"strconv"

	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ExportController interface {
	GenerateVersionDoc(w http.ResponseWriter, r *http.Request) //deprecated
	GenerateFileDoc(w http.ResponseWriter, r *http.Request)    //deprecated
	GenerateApiChangesExcelReportV3(w http.ResponseWriter, r *http.Request)
	GenerateApiChangesExcelReport(w http.ResponseWriter, r *http.Request) //deprecated
	GenerateOperationsExcelReport(w http.ResponseWriter, r *http.Request)
	GenerateDeprecatedOperationsExcelReport(w http.ResponseWriter, r *http.Request)
	ExportOperationGroupAsOpenAPIDocuments_deprecated(w http.ResponseWriter, r *http.Request)   //deprecated
	ExportOperationGroupAsOpenAPIDocuments_deprecated_2(w http.ResponseWriter, r *http.Request) //deprecated

	StartAsyncExport(w http.ResponseWriter, r *http.Request)
	GetAsyncExportStatus(w http.ResponseWriter, r *http.Request)
}

func NewExportController(publishedService service.PublishedService,
	portalService service.PortalService,
	searchService service.SearchService,
	roleService service.RoleService,
	excelService service.ExcelService,
	versionService service.VersionService,
	monitoringService service.MonitoringService,
	exportService service.ExportService,
	packageService service.PackageService) ExportController {
	return &exportControllerImpl{
		publishedService:  publishedService,
		portalService:     portalService,
		searchService:     searchService,
		roleService:       roleService,
		excelService:      excelService,
		versionService:    versionService,
		monitoringService: monitoringService,
		exportService:     exportService,
		packageService:    packageService,
	}
}

type exportControllerImpl struct {
	publishedService  service.PublishedService
	portalService     service.PortalService
	searchService     service.SearchService
	roleService       service.RoleService
	excelService      service.ExcelService
	versionService    service.VersionService
	monitoringService service.MonitoringService
	exportService     service.ExportService
	packageService    service.PackageService
}

func (e exportControllerImpl) ExportOperationGroupAsOpenAPIDocuments_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}
	format, err := url.QueryUnescape(r.URL.Query().Get("format"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "format"},
			Debug:   err.Error(),
		})
		return
	}

	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	content, err := e.versionService.GetTransformedDocuments_deprecated(packageId, version, apiType, groupName, format)
	if err != nil {
		log.Errorf("Failed to export api changes error - %s", err.Error())
		RespondWithError(w, "Failed to export group name openAPI", err)
		return
	}
	if content == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.TransformedDocumentsNotFound,
			Message: exception.TransformedDocumentsNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": version, "apiType": apiType, "groupName": groupName},
		})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s_%s_%s.zip", groupName, packageId, version))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}

func (e exportControllerImpl) ExportOperationGroupAsOpenAPIDocuments_deprecated_2(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	groupName, err := getUnescapedStringParam(r, "groupName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "groupName"},
			Debug:   err.Error(),
		})
		return
	}
	buildType, err := getUnescapedStringParam(r, "buildType")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "buildType"},
			Debug:   err.Error(),
		})
		return
	}
	format := r.URL.Query().Get("format")

	err = view.ValidateFormatForBuildType(buildType, format)
	if err != nil {
		RespondWithError(w, "buildType format validation failed", err)
		return
	}
	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	content, err := e.versionService.GetTransformedDocuments(packageId, version, apiType, groupName, buildType, format)
	if err != nil {
		RespondWithError(w, "Failed to export operations group", err)
		return
	}
	if content == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.TransformedDocumentsNotFound,
			Message: exception.TransformedDocumentsNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": version, "apiType": apiType, "groupName": groupName},
		})
		return
	}
	switch view.BuildType(buildType) {
	case view.ReducedSourceSpecificationsType_deprecated:
		w.Header().Set("Content-Type", "application/zip")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s_%s_%s.zip", groupName, packageId, version))
		w.Header().Set("Content-Transfer-Encoding", "binary")
	case view.MergedSpecificationType_deprecated:
		switch format {
		// html format for mergedSpecification not supported yet
		// case string(view.HtmlDocumentFormat):
		// 	w.Header().Set("Content-Type", "application/zip")
		// 	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s_%s_%s.zip", groupName, packageId, version))
		// 	w.Header().Set("Content-Transfer-Encoding", "binary")
		case string(view.JsonDocumentFormat):
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s_%s_%s.json", groupName, packageId, version))
		case string(view.YamlDocumentFormat):
			w.Header().Set("Content-Type", "application/yaml")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s_%s_%s.yaml", groupName, packageId, version))
		}
	}

	w.Header().Set("Expires", "0")
	w.WriteHeader(http.StatusOK)
	w.Write(content)

}

func (e exportControllerImpl) GenerateVersionDoc(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	docType := view.GetDtFromStr(r.URL.Query().Get("docType"))

	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	var data []byte
	var filename string
	switch docType {
	case view.DTInteractive:
		data, filename, err = e.portalService.GenerateInteractivePageForPublishedVersion(packageId, versionName)

		if err != nil {
			RespondWithError(w, fmt.Sprintf("Failed to generate interactive HTML page for version %s:%s", packageId, versionName), err)
			return
		}

		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", filename))

	case view.DTRaw:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Message: "Document type " + string(docType) + " is not applicable for version"})
		return

	case view.DTPdf, view.DTStatic:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotImplemented,
			Message: "Document type " + string(docType) + " is not supported yet"})
		return
	default:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Message: "Document type " + string(docType) + " is invalid"})
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (e exportControllerImpl) GenerateFileDoc(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	docType := view.GetDtFromStr(r.URL.Query().Get("docType"))

	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	var data []byte
	switch docType {
	case view.DTInteractive:
		var filename string
		data, filename, err = e.portalService.GenerateInteractivePageForPublishedFile(packageId, versionName, slug)
		if err != nil {
			RespondWithError(w, fmt.Sprintf("Failed to generate interactive HTML page for file %s:%s:%s", packageId, versionName, slug), err)
			return
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", filename))

	case view.DTRaw:
		content, cd, err := e.publishedService.GetLatestContentDataBySlug(packageId, versionName, slug)
		if err != nil {
			RespondWithError(w, "Failed to get published content as file", err)
			return
		}
		data = cd.Data
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", content.Name))

	case view.DTPdf, view.DTStatic:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotImplemented,
			Message: "Document type " + string(docType) + " is not supported yet"})
		return
	default:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Message: "Document type " + string(docType) + " is invalid"})
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// GenerateApiChangesExcelReport deprecated
func (e exportControllerImpl) GenerateApiChangesExcelReport(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	format, err := url.QueryUnescape(r.URL.Query().Get("format"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "format"},
			Debug:   err.Error(),
		})
		return
	}
	if format == "" {
		format = view.ExportFormatXlsx
	} else {
		supportedFormat := view.ValidateApiChangesExportFormat(format)
		if !supportedFormat {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.UnsupportedFormat,
				Message: exception.UnsupportedFormatMsg,
				Params:  map[string]interface{}{"format": format},
			})
			return
		}
	}
	previousVersion, err := url.QueryUnescape(r.URL.Query().Get("previousVersion"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "previousVersion"},
			Debug:   err.Error(),
		})
		return
	}
	previousVersionPackageId, err := url.QueryUnescape(r.URL.Query().Get("previousVersionPackageId"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "previousVersionPackageId"},
			Debug:   err.Error(),
		})
		return
	}

	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	exportApiChangesRequestView := view.ExportApiChangesRequestView{
		PreviousVersionPackageId: previousVersionPackageId,
		PreviousVersion:          previousVersion,
	}
	apiChangesReport, versionName, err := e.excelService.ExportApiChanges(packageId, version, "", []string{}, exportApiChangesRequestView)
	if err != nil {
		log.Errorf("Failed to export api changes error - %s", err.Error())
		RespondWithError(w, "Failed to export api changes", err)
		return
	}
	if apiChangesReport == nil {
		log.Info("ApiChangeReport is empty")
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ChangesAreEmpty,
			Message: exception.ChangesAreEmptyMsg,
		})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=APIChanges_%s_%s.xlsx", packageId, versionName))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	apiChangesReport.Write(w)
}

func (e exportControllerImpl) GenerateApiChangesExcelReportV3(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	previousVersion, err := url.QueryUnescape(r.URL.Query().Get("previousVersion"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "previousVersion"},
			Debug:   err.Error(),
		})
		return
	}
	previousVersionPackageId, err := url.QueryUnescape(r.URL.Query().Get("previousVersionPackageId"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "previousVersionPackageId"},
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
	refPackageId := r.URL.Query().Get("refPackageId")

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

	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	exportApiChangesRequestView := view.ExportApiChangesRequestView{
		PreviousVersionPackageId: previousVersionPackageId,
		PreviousVersion:          previousVersion,
		ApiKind:                  apiKind,
		Tags:                     tags,
		RefPackageId:             refPackageId,
		TextFilter:               textFilter,
		EmptyTag:                 emptyTag,
		Group:                    group,
		EmptyGroup:               emptyGroup,
		ApiAudience:              apiAudience,
	}
	apiChangesReport, versionName, err := e.excelService.ExportApiChanges(packageId, version, apiType, severities, exportApiChangesRequestView)
	if err != nil {
		log.Errorf("Failed to export api changes error - %s", err.Error())
		RespondWithError(w, "Failed to export api changes", err)
		return
	}
	if apiChangesReport == nil {
		log.Info("ApiChangeReport is empty")
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ChangesAreEmpty,
			Message: exception.ChangesAreEmptyMsg,
		})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=APIChanges_%s_%s.xlsx", packageId, versionName))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	apiChangesReport.Write(w)
}

func (e exportControllerImpl) GenerateOperationsExcelReport(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	exportOperationsRequestView := view.ExportOperationRequestView{
		Tag:          tag,
		TextFilter:   textFilter,
		EmptyTag:     emptyTag,
		Kind:         kind,
		RefPackageId: refPackageId,
		EmptyGroup:   emptyGroup,
		Group:        group,
		ApiAudience:  apiAudience,
	}
	operationsReport, versionName, err := e.excelService.ExportOperations(packageId, version, apiType, exportOperationsRequestView)
	if err != nil {
		log.Errorf("Excel error - %s", err.Error())
		RespondWithError(w, "Failed to export operations", err)
		return
	}
	if operationsReport == nil {
		log.Info("Operations are empty")
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationsAreEmpty,
			Message: exception.OperationsAreEmptyMsg,
		})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=APIOperations_%s_%s.xlsx", packageId, versionName))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	operationsReport.Write(w)
}

func (e exportControllerImpl) GenerateDeprecatedOperationsExcelReport(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	tags := make([]string, 0)
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
	if !emptyTag {
		var customErr *exception.CustomError
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

	e.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ExportsCalled, packageId)

	exportOperationsRequestView := view.ExportOperationRequestView{
		Tags:         tags,
		TextFilter:   textFilter,
		Kind:         kind,
		RefPackageId: refPackageId,
		EmptyTag:     emptyTag,
		EmptyGroup:   emptyGroup,
		Group:        group,
		ApiAudience:  apiAudience,
	}
	deprecatedOperationsReport, versionName, err := e.excelService.ExportDeprecatedOperations(packageId, version, apiType, exportOperationsRequestView)
	if err != nil {
		log.Errorf("Excel error - %s", err.Error())
		RespondWithError(w, "Failed to export operations", err)
		return
	}
	if deprecatedOperationsReport == nil {
		log.Info("Deprecated operations are empty")
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationsAreEmpty,
			Message: exception.OperationsAreEmptyMsg,
		})
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=DeprecatedOperations_%s_%s.xlsx", packageId, versionName))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	deprecatedOperationsReport.Write(w)
}

func (e exportControllerImpl) StartAsyncExport(w http.ResponseWriter, r *http.Request) {
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

	var discriminator view.ExportRequestDiscriminator

	err = json.Unmarshal(body, &discriminator)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	var exportRequest interface{}
	switch discriminator.ExportedEntity {
	case view.ExportEntityVersion:
		exportRequest = &view.ExportVersionReq{}
	case view.ExportEntityRestDocument:
		exportRequest = &view.ExportOASDocumentReq{}
	case view.ExportEntityRestOperationsGroup:
		exportRequest = &view.ExportRestOperationsGroupReq{}
	default:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: "Invalid exportedEntity value",
			Params:  map[string]interface{}{"param": "exportedEntity"},
		})
		return
	}

	err = json.Unmarshal(body, &exportRequest)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	validationErr := utils.ValidateObject(exportRequest)
	if validationErr != nil {
		var customError *exception.CustomError
		if errors.As(validationErr, &customError) {
			RespondWithCustomError(w, customError)
			return
		}
	}

	err = e.validatePackageAndVersion(discriminator)
	if err != nil {
		RespondWithError(w, "request validation failed", err)
	}

	ctx := context.Create(r)

	sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, discriminator.PackageId, view.ReadPermission)
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

	var exportID string
	switch discriminator.ExportedEntity {
	case view.ExportEntityVersion:
		exportID, err = e.exportService.StartVersionExport(ctx, *exportRequest.(*view.ExportVersionReq))
	case view.ExportEntityRestDocument:
		exportID, err = e.exportService.StartOASDocExport(ctx, *exportRequest.(*view.ExportOASDocumentReq))
	case view.ExportEntityRestOperationsGroup:
		exportID, err = e.exportService.StartRESTOpGroupExport(ctx, *exportRequest.(*view.ExportRestOperationsGroupReq))
	}
	if err != nil {
		RespondWithError(w, "Failed to start export process", err)
		return
	}
	RespondWithJson(w, http.StatusAccepted, view.ExportResponse{
		ExportID: exportID,
	})
}

func (e exportControllerImpl) validatePackageAndVersion(req view.ExportRequestDiscriminator) error {
	pkgExists, err := e.packageService.PackageExists(req.PackageId)
	if err != nil {
		return fmt.Errorf("failed to check if package %s exists: %s", req.PackageId, err)
	}
	if !pkgExists {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": req.PackageId},
		}
	}
	verExists, err := e.publishedService.VersionPublished(req.PackageId, req.Version)
	if err != nil {
		return fmt.Errorf("failed to check if version %s exists for package %s: %s", req.Version, req.PackageId, err)
	}
	if !verExists {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": req.Version, "packageId": req.PackageId},
		}
	}
	return nil
}

func (e exportControllerImpl) GetAsyncExportStatus(w http.ResponseWriter, r *http.Request) {
	exportId := getStringParam(r, "exportId")

	status, result, packageId, err := e.exportService.GetAsyncExportStatus(exportId)
	if err != nil {
		RespondWithError(w, "Failed to get publish status", err)
		return
	}

	if status == nil && result == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ExportProcessNotFound,
			Message: exception.ExportProcessNotFoundMsg,
			Params:  map[string]interface{}{"exportId": exportId},
		})
		return
	}

	if status != nil {
		RespondWithJson(w, http.StatusOK, status)
		return
	}

	if packageId != "" { // do permissions check for sensitive data like export content. Export status is considered as non-sensitive.
		ctx := context.Create(r)
		sufficientPrivileges, err := e.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", result.FileName))
	w.WriteHeader(http.StatusOK)
	w.Write(result.Data)
}
