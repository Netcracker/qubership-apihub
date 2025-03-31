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
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type TransformationController interface {
	TransformDocuments_deprecated(w http.ResponseWriter, r *http.Request)
	TransformDocuments(w http.ResponseWriter, r *http.Request)
	GetDataForDocumentsTransformation(w http.ResponseWriter, r *http.Request)
}

func NewTransformationController(roleService service.RoleService, buildService service.BuildService, versionService service.VersionService, transformationService service.TransformationService, operationGroupService service.OperationGroupService) TransformationController {
	return transformationControllerImpl{roleService: roleService, buildService: buildService, versionService: versionService, transformationService: transformationService, operationGroupService: operationGroupService}
}

type transformationControllerImpl struct {
	roleService           service.RoleService
	buildService          service.BuildService
	versionService        service.VersionService
	transformationService service.TransformationService
	operationGroupService service.OperationGroupService
}

func (t transformationControllerImpl) TransformDocuments_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := t.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	exists, err := t.operationGroupService.CheckOperationGroupExists(packageId, versionName, apiType, groupName)
	if err != nil {
		RespondWithError(w, "Failed to check if operation group exists", err)
		return
	}
	if !exists {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		})
		return
	}

	builderId, err := url.QueryUnescape(r.URL.Query().Get("builderId"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "builderId"},
			Debug:   err.Error(),
		})
		return
	}
	clientBuild := false
	if r.URL.Query().Get("clientBuild") != "" {
		clientBuild, err = strconv.ParseBool(r.URL.Query().Get("clientBuild"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "clientBuild", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	if clientBuild && builderId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "builderId"},
		})
		return
	}

	reCalculate := false
	if r.URL.Query().Get("reCalculate") != "" {
		reCalculate, err = strconv.ParseBool(r.URL.Query().Get("reCalculate"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "reCalculate", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	_, revision, err := service.SplitVersionRevision(versionName)
	if err != nil {
		RespondWithError(w, "Failed to split version revision", err)
		return
	}
	if revision == 0 {
		latestRevision, err := t.versionService.GetLatestRevision(packageId, versionName)
		if err != nil {
			RespondWithError(w, "Failed to get version", err)
			return
		}
		versionName = fmt.Sprintf("%s@%d", versionName, latestRevision)
	}
	buildConfig := view.BuildConfig{
		PackageId: packageId,
		Version:   versionName,
		BuildType: view.DocumentGroupType_deprecated,
		CreatedBy: ctx.GetUserId(),
		ApiType:   apiType,
		GroupName: groupName,
	}

	if reCalculate {
		buildId, buildConfig, err := t.buildService.CreateBuildWithoutDependencies(buildConfig, clientBuild, builderId)
		if err != nil {
			RespondWithError(w, "Failed to create documentGroup type build", err)
			return
		}
		RespondWithJson(w, http.StatusCreated, view.DocumentTransformConfigView{
			PackageId: buildConfig.PackageId,
			Version:   buildConfig.Version,
			ApiType:   buildConfig.ApiType,
			GroupName: buildConfig.GroupName,
			BuildType: buildConfig.BuildType,
			CreatedBy: buildConfig.CreatedBy,
			BuildId:   buildId,
		})
		return
	}

	content, err := t.versionService.GetTransformedDocuments_deprecated(packageId, versionName, apiType, groupName, string(view.JsonDocumentFormat))
	if err != nil {
		RespondWithError(w, "Failed to get transformed documents", err)
		return
	}
	if content != nil {
		w.WriteHeader(http.StatusOK)
		return
	}

	searchRequest := view.DocumentGroupBuildSearchRequest{
		PackageId: packageId,
		Version:   versionName,
		BuildType: view.DocumentGroupType_deprecated,
		ApiType:   apiType,
		GroupName: groupName,
	}
	var calculationProcessStatus view.CalculationProcessStatus
	buildView, err := t.buildService.GetBuildViewByDocumentGroupSearchQuery(searchRequest)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			if customError.Status == http.StatusNotFound {

				buildId, buildConfig, err := t.buildService.CreateBuildWithoutDependencies(buildConfig, clientBuild, builderId)
				if err != nil {
					RespondWithError(w, "Failed to create documentGroup type build", err)
					return
				}
				RespondWithJson(w, http.StatusCreated, view.DocumentTransformConfigView{
					PackageId: buildConfig.PackageId,
					Version:   buildConfig.Version,
					ApiType:   buildConfig.ApiType,
					GroupName: buildConfig.GroupName,
					BuildType: buildConfig.BuildType,
					CreatedBy: buildConfig.CreatedBy,
					BuildId:   buildId,
				})
				return
			}
		}
		RespondWithError(w, "Failed to get buildStatus", err)
		return
	}
	switch buildView.Status {
	case string(view.StatusError):
		calculationProcessStatus = view.CalculationProcessStatus{
			Status:  string(view.StatusError),
			Message: buildView.Details,
		}
		RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
		return
	case string(view.StatusComplete):
		//this case is possible only if we have an old finished build for which we don't have a transformed documents (rebuild required)
		//or if this build completed during this method execution (rebuild is not requried)
		content, err := t.versionService.GetTransformedDocuments_deprecated(packageId, versionName, apiType, groupName, string(view.JsonDocumentFormat))
		if err != nil {
			RespondWithError(w, "Failed to get transformed documents", err)
			return
		}
		if content != nil {
			w.WriteHeader(http.StatusOK)
			return
		}
		buildId, buildConfig, err := t.buildService.CreateBuildWithoutDependencies(buildConfig, clientBuild, builderId)
		if err != nil {
			RespondWithError(w, "Failed to create documentGroup type build", err)
			return
		}
		RespondWithJson(w, http.StatusCreated, view.DocumentTransformConfigView{
			PackageId: buildConfig.PackageId,
			Version:   buildConfig.Version,
			ApiType:   buildConfig.ApiType,
			GroupName: buildConfig.GroupName,
			BuildType: buildConfig.BuildType,
			CreatedBy: buildConfig.CreatedBy,
			BuildId:   buildId,
		})
		return
	default:
		calculationProcessStatus = view.CalculationProcessStatus{
			Status: string(view.StatusRunning),
		}
		RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
		return
	}
}

func (t transformationControllerImpl) TransformDocuments(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := t.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	if format == "" {
		format = string(view.JsonDocumentFormat)
	}

	err = view.ValidateFormatForBuildType(buildType, format)
	if err != nil {
		RespondWithError(w, "buildType format validation failed", err)
		return
	}

	exists, err := t.operationGroupService.CheckOperationGroupExists(packageId, versionName, apiType, groupName)
	if err != nil {
		RespondWithError(w, "Failed to check if operation group exists", err)
		return
	}
	if !exists {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationGroupNotFound,
			Message: exception.OperationGroupNotFoundMsg,
			Params:  map[string]interface{}{"groupName": groupName},
		})
		return
	}

	builderId, err := url.QueryUnescape(r.URL.Query().Get("builderId"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "builderId"},
			Debug:   err.Error(),
		})
		return
	}
	clientBuild := false
	if r.URL.Query().Get("clientBuild") != "" {
		clientBuild, err = strconv.ParseBool(r.URL.Query().Get("clientBuild"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "clientBuild", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	if clientBuild && builderId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "builderId"},
		})
		return
	}

	reCalculate := false
	if r.URL.Query().Get("reCalculate") != "" {
		reCalculate, err = strconv.ParseBool(r.URL.Query().Get("reCalculate"))
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "reCalculate", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	_, revision, err := service.SplitVersionRevision(versionName)
	if err != nil {
		RespondWithError(w, "Failed to split version revision", err)
		return
	}
	if revision == 0 {
		latestRevision, err := t.versionService.GetLatestRevision(packageId, versionName)
		if err != nil {
			RespondWithError(w, "Failed to get version", err)
			return
		}
		versionName = view.MakeVersionRefKey(versionName, latestRevision)
	}
	buildConfig := view.BuildConfig{
		PackageId: packageId,
		Version:   versionName,
		BuildType: buildType,
		Format:    format,
		CreatedBy: ctx.GetUserId(),
		ApiType:   apiType,
		GroupName: groupName,
	}

	if reCalculate {
		buildId, buildConfig, err := t.buildService.CreateBuildWithoutDependencies(buildConfig, clientBuild, builderId)
		if err != nil {
			RespondWithError(w, "Failed to create documentGroup type build", err)
			return
		}
		RespondWithJson(w, http.StatusCreated, view.DocumentTransformConfigView{
			PackageId: buildConfig.PackageId,
			Version:   buildConfig.Version,
			ApiType:   buildConfig.ApiType,
			GroupName: buildConfig.GroupName,
			BuildType: buildConfig.BuildType,
			Format:    buildConfig.Format,
			CreatedBy: buildConfig.CreatedBy,
			BuildId:   buildId,
		})
		return
	}

	content, err := t.versionService.GetTransformedDocuments(packageId, versionName, apiType, groupName, buildType, format)
	if err != nil {
		RespondWithError(w, "Failed to get transformed documents", err)
		return
	}
	if content != nil {
		w.WriteHeader(http.StatusOK)
		return
	}

	searchRequest := view.DocumentGroupBuildSearchRequest{
		PackageId: packageId,
		Version:   versionName,
		BuildType: buildType,
		Format:    format,
		ApiType:   apiType,
		GroupName: groupName,
	}
	var calculationProcessStatus view.CalculationProcessStatus
	buildView, err := t.buildService.GetBuildViewByDocumentGroupSearchQuery(searchRequest)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			if customError.Status == http.StatusNotFound {

				buildId, buildConfig, err := t.buildService.CreateBuildWithoutDependencies(buildConfig, clientBuild, builderId)
				if err != nil {
					RespondWithError(w, "Failed to create documentGroup type build", err)
					return
				}
				RespondWithJson(w, http.StatusCreated, view.DocumentTransformConfigView{
					PackageId: buildConfig.PackageId,
					Version:   buildConfig.Version,
					ApiType:   buildConfig.ApiType,
					GroupName: buildConfig.GroupName,
					BuildType: buildConfig.BuildType,
					Format:    buildConfig.Format,
					CreatedBy: buildConfig.CreatedBy,
					BuildId:   buildId,
				})
				return
			}
		}
		RespondWithError(w, "Failed to get buildStatus", err)
		return
	}
	switch buildView.Status {
	case string(view.StatusError):
		calculationProcessStatus = view.CalculationProcessStatus{
			Status:  string(view.StatusError),
			Message: buildView.Details,
		}
		RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
		return
	case string(view.StatusComplete):
		//this case is possible only if we have an old finished build for which we don't have a transformed documents (rebuild required)
		//or if this build completed during this method execution (rebuild is not requried)
		content, err := t.versionService.GetTransformedDocuments(packageId, versionName, apiType, groupName, buildType, format)
		if err != nil {
			RespondWithError(w, "Failed to get transformed documents", err)
			return
		}
		if content != nil {
			w.WriteHeader(http.StatusOK)
			return
		}
		buildId, buildConfig, err := t.buildService.CreateBuildWithoutDependencies(buildConfig, clientBuild, builderId)
		if err != nil {
			RespondWithError(w, "Failed to create documentGroup type build", err)
			return
		}
		RespondWithJson(w, http.StatusCreated, view.DocumentTransformConfigView{
			PackageId: buildConfig.PackageId,
			Version:   buildConfig.Version,
			ApiType:   buildConfig.ApiType,
			GroupName: buildConfig.GroupName,
			BuildType: buildConfig.BuildType,
			Format:    buildConfig.Format,
			CreatedBy: buildConfig.CreatedBy,
			BuildId:   buildId,
		})
		return
	default:
		calculationProcessStatus = view.CalculationProcessStatus{
			Status: string(view.StatusRunning),
		}
		RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
		return
	}
}

func (t transformationControllerImpl) GetDataForDocumentsTransformation(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := t.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	documentsForTransformationFilterReq := view.DocumentsForTransformationFilterReq{
		Limit:                  limit,
		Offset:                 limit * page,
		FilterByOperationGroup: groupName,
		ApiType:                apiType,
	}

	data, err := t.transformationService.GetDataForDocumentsTransformation(packageId, versionName, documentsForTransformationFilterReq)
	if err != nil {
		RespondWithError(w, "Failed to get version documents", err)
		return
	}
	RespondWithJson(w, http.StatusOK, data)
}
