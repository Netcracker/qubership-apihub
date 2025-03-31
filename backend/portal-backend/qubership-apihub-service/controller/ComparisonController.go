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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ComparisonController interface {
	CompareTwoVersions(w http.ResponseWriter, r *http.Request)
	GetComparisonChangesSummary(w http.ResponseWriter, r *http.Request)
}

func NewComparisonController(operationService service.OperationService,
	versionService service.VersionService,
	buildService service.BuildService,
	roleService service.RoleService,
	comparisonService service.ComparisonService,
	monitoringService service.MonitoringService,
	ptHandler service.PackageTransitionHandler) ComparisonController {
	return &comparisonControllerImpl{
		operationService:  operationService,
		versionService:    versionService,
		buildService:      buildService,
		roleService:       roleService,
		comparisonService: comparisonService,
		monitoringService: monitoringService,
		ptHandler:         ptHandler,
	}
}

type comparisonControllerImpl struct {
	operationService  service.OperationService
	versionService    service.VersionService
	buildService      service.BuildService
	roleService       service.RoleService
	comparisonService service.ComparisonService
	monitoringService service.MonitoringService
	ptHandler         service.PackageTransitionHandler
}

func (c comparisonControllerImpl) CompareTwoVersions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
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

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)

	var compareVersionsReq view.CompareVersionsReq
	err = json.Unmarshal(body, &compareVersionsReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	if err := utils.ValidateObject(compareVersionsReq); err != nil {
		RespondWithError(w, "", exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidCompareVersionReq,
			Message: exception.InvalidCompareVersionReqMsg,
			Params:  map[string]interface{}{"compareVersionReq": compareVersionsReq, "error": err.Error()},
		})
	}

	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, compareVersionsReq.PackageId, view.ReadPermission)
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

	revision, err := c.versionService.GetLatestRevision(compareVersionsReq.PackageId, compareVersionsReq.Version)
	if err != nil {
		RespondWithError(w, "Failed to get version", err)
		return
	}
	prevVersionRevision, err := c.versionService.GetLatestRevision(compareVersionsReq.PreviousVersionPackageId, compareVersionsReq.PreviousVersion)
	if err != nil {
		RespondWithError(w, "Failed to get previous version", err)
		return
	}

	buildConfig := view.BuildConfig{
		PackageId:                compareVersionsReq.PackageId,
		Version:                  compareVersionsReq.Version,
		PreviousVersionPackageId: compareVersionsReq.PreviousVersionPackageId,
		PreviousVersion:          compareVersionsReq.PreviousVersion,
		BuildType:                view.ChangelogType,
		CreatedBy:                ctx.GetUserId(),

		ComparisonRevision:     revision,
		ComparisonPrevRevision: prevVersionRevision,
	}

	if reCalculate {
		buildId, buildConfig, err := c.buildService.CreateChangelogBuild(buildConfig, clientBuild, builderId)
		if err != nil {
			RespondWithError(w, "Failed to create changelog type build", err)
			return
		}
		if clientBuild {
			RespondWithJson(w, http.StatusCreated, view.ChangelogBuildConfigView{
				PackageId:                buildConfig.PackageId,
				Version:                  buildConfig.Version,
				PreviousVersionPackageId: buildConfig.PreviousVersionPackageId,
				PreviousVersion:          buildConfig.PreviousVersion,
				BuildType:                buildConfig.BuildType,
				CreatedBy:                buildConfig.CreatedBy,
				BuildId:                  buildId,
			})
			return
		}
		calculationProcessStatus := view.CalculationProcessStatus{
			Status: string(view.StatusRunning),
		}
		RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
		return
	}

	compareResult, err := c.comparisonService.ValidComparisonResultExists(compareVersionsReq.PackageId, compareVersionsReq.Version, compareVersionsReq.PreviousVersionPackageId, compareVersionsReq.PreviousVersion)
	if err != nil {
		RespondWithError(w, "Failed to get versions comparison result", err)
		return
	}
	if compareResult {
		w.WriteHeader(http.StatusOK)
		return
	}

	searchRequest := view.ChangelogBuildSearchRequest{
		PackageId:                compareVersionsReq.PackageId,
		Version:                  compareVersionsReq.Version,
		PreviousVersionPackageId: compareVersionsReq.PreviousVersionPackageId,
		PreviousVersion:          compareVersionsReq.PreviousVersion,
		BuildType:                view.ChangelogType,

		ComparisonRevision:     revision,
		ComparisonPrevRevision: prevVersionRevision,
	}
	var calculationProcessStatus view.CalculationProcessStatus
	buildView, err := c.buildService.GetBuildViewByChangelogSearchQuery(searchRequest)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			if customError.Status == http.StatusNotFound {
				buildId, buildConfig, err := c.buildService.CreateChangelogBuild(buildConfig, clientBuild, builderId)
				if err != nil {
					RespondWithError(w, "Failed to create changelog type build", err)
					return
				}
				if clientBuild {
					RespondWithJson(w, http.StatusCreated, view.ChangelogBuildConfigView{
						PackageId:                buildConfig.PackageId,
						Version:                  buildConfig.Version,
						PreviousVersionPackageId: buildConfig.PreviousVersionPackageId,
						PreviousVersion:          buildConfig.PreviousVersion,
						BuildType:                buildConfig.BuildType,
						CreatedBy:                buildConfig.CreatedBy,
						BuildId:                  buildId,
					})
					return
				}
				calculationProcessStatus = view.CalculationProcessStatus{
					Status: string(view.StatusRunning),
				}
				RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
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
		//this case is possible only if we have an old finished build for which we don't have a comparison (rebuild required)
		//or if this build completed during this method execution (rebuild is not requried)
		compareResult, err := c.comparisonService.ValidComparisonResultExists(compareVersionsReq.PackageId, compareVersionsReq.Version, compareVersionsReq.PreviousVersionPackageId, compareVersionsReq.PreviousVersion)
		if err != nil {
			RespondWithError(w, "Failed to get versions comparison result", err)
			return
		}
		if compareResult {
			w.WriteHeader(http.StatusOK)
			return
		}
		buildId, buildConfig, err := c.buildService.CreateChangelogBuild(buildConfig, clientBuild, builderId)
		if err != nil {
			RespondWithError(w, "Failed to create changelog type build", err)
			return
		}
		if clientBuild {
			RespondWithJson(w, http.StatusCreated, view.ChangelogBuildConfigView{
				PackageId:                buildConfig.PackageId,
				Version:                  buildConfig.Version,
				PreviousVersionPackageId: buildConfig.PreviousVersionPackageId,
				PreviousVersion:          buildConfig.PreviousVersion,
				BuildType:                buildConfig.BuildType,
				CreatedBy:                buildConfig.CreatedBy,
				BuildId:                  buildId,
			})
			return
		}
		calculationProcessStatus = view.CalculationProcessStatus{
			Status: string(view.StatusRunning),
		}
		RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
		return
	default:
		calculationProcessStatus = view.CalculationProcessStatus{
			Status: string(view.StatusRunning),
		}
		RespondWithJson(w, http.StatusAccepted, calculationProcessStatus)
		return
	}
}

func (c comparisonControllerImpl) GetComparisonChangesSummary(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to check user privileges", err)
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

	c.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ComparisonsCalled, packageId)
	if previousVersionPackageId != "" {
		c.monitoringService.IncreaseBusinessMetricCounter(ctx.GetUserId(), metrics.ComparisonsCalled, previousVersionPackageId)
	}

	comparisonSummary, err := c.comparisonService.GetComparisonResult(packageId, version, previousVersionPackageId, previousVersion)
	if err != nil {
		handlePkgRedirectOrRespondWithError(w, r, c.ptHandler, packageId, "Failed to get comparison changes summary", err)
		return
	}
	RespondWithJson(w, http.StatusOK, comparisonSummary)
}
