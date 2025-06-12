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
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type PublishV2Controller interface {
	Publish(w http.ResponseWriter, r *http.Request)
	GetPublishStatus(w http.ResponseWriter, r *http.Request)
	GetPublishStatuses(w http.ResponseWriter, r *http.Request)
	GetFreeBuild(w http.ResponseWriter, r *http.Request)
	SetPublishStatus_deprecated(w http.ResponseWriter, r *http.Request)
	SetPublishStatus(w http.ResponseWriter, r *http.Request)
}

func NewPublishV2Controller(buildService service.BuildService,
	publishedService service.PublishedService,
	buildResultService service.BuildResultService,
	roleService service.RoleService,
	systemInfoService service.SystemInfoService) PublishV2Controller {

	publishArchiveSizeLimit := systemInfoService.GetPublishArchiveSizeLimitMB()
	publishFileSizeLimit := systemInfoService.GetPublishFileSizeLimitMB()

	return &publishV2ControllerImpl{
		buildService:            buildService,
		publishedService:        publishedService,
		buildResultService:      buildResultService,
		roleService:             roleService,
		publishArchiveSizeLimit: publishArchiveSizeLimit,
		publishFileSizeLimit:    publishFileSizeLimit,
		systemInfoService:       systemInfoService,
	}
}

type publishV2ControllerImpl struct {
	buildService       service.BuildService
	publishedService   service.PublishedService
	buildResultService service.BuildResultService
	roleService        service.RoleService
	systemInfoService  service.SystemInfoService

	publishArchiveSizeLimit int64
	publishFileSizeLimit    int64
}

func (p publishV2ControllerImpl) Publish(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	r.Body = http.MaxBytesReader(w, r.Body, p.publishArchiveSizeLimit)

	if r.ContentLength > p.publishArchiveSizeLimit {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ArchiveSizeExceeded,
			Message: exception.ArchiveSizeExceededMsg,
			Params:  map[string]interface{}{"size": p.publishArchiveSizeLimit},
		})
		return
	}

	err := r.ParseMultipartForm(0)
	if err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ArchiveSizeExceeded,
				Message: exception.ArchiveSizeExceededMsg,
				Params:  map[string]interface{}{"size": p.publishArchiveSizeLimit},
			})
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.BadRequestBody,
				Message: exception.BadRequestBodyMsg,
				Debug:   err.Error(),
			})
		}
		return
	}
	defer func() {
		err := r.MultipartForm.RemoveAll()
		if err != nil {
			log.Debugf("failed to remove temporal data: %+v", err)
		}
	}()

	clientBuild := false
	clientBuildStr := r.FormValue("clientBuild")
	if clientBuildStr != "" {
		clientBuild, err = strconv.ParseBool(clientBuildStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "clientBuild"},
				Debug:   err.Error(),
			})
			return
		}
	}

	resolveRefs := true
	resolveRefsStr := r.FormValue("resolveRefs")
	if resolveRefsStr != "" {
		resolveRefs, err = strconv.ParseBool(resolveRefsStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "resolveRefs"},
				Debug:   err.Error(),
			})
			return
		}
	}

	resolveConflicts := true
	resolveConflictsStr := r.FormValue("resolveConflicts")
	if resolveConflictsStr != "" {
		resolveConflicts, err = strconv.ParseBool(resolveConflictsStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "resolveConflicts"},
				Debug:   err.Error(),
			})
			return
		}
	}

	var sourcesData []byte
	_, srcExists := r.MultipartForm.File["sources"]
	if srcExists {
		sourcesFile, archiveFileHeader, err := r.FormFile("sources")
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}

		sourcesData, err = ioutil.ReadAll(sourcesFile)
		closeErr := sourcesFile.Close()
		if closeErr != nil {
			log.Debugf("failed to close temporal file: %+v", err)
		}
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}

		if !strings.HasSuffix(archiveFileHeader.Filename, ".zip") {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "sources file name, expecting .zip archive"},
			})
			return
		}
		encoding := r.Header.Get("Content-Transfer-Encoding")
		if strings.EqualFold(encoding, "base64") {
			_, err := base64.StdEncoding.Decode(sourcesData, sourcesData)
			if err != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.IncorrectMultipartFile,
					Message: exception.IncorrectMultipartFileMsg,
					Debug:   err.Error()})
				return
			}
		}
	}

	configStr := r.FormValue("config")
	if configStr == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "config"},
		})
		return
	}

	var config view.BuildConfig
	err = json.Unmarshal([]byte(configStr), &config)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "config"},
			Debug:   err.Error(),
		})
		return
	}
	if config.PackageId == "" {
		config.PackageId = packageId
	} else {
		if packageId != config.PackageId {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.PackageIdMismatch,
				Message: exception.PackageIdMismatchMsg,
				Params:  map[string]interface{}{"configPackageId": config.PackageId, "packageId": packageId},
			})
		}
	}

	config.CreatedBy = ctx.GetUserId()
	config.BuildType = view.PublishType

	for i, file := range config.Files {
		if file.Publish == nil {
			deflt := true
			config.Files[i].Publish = &deflt
		}
	}

	_, err = view.ParseVersionStatus(config.Status)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: err.Error(),
		})
		return
	}

	sufficientPrivileges, err := p.roleService.HasManageVersionPermission(ctx, packageId, config.Status)
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
	var dependencies []string
	dependenciesStr := r.FormValue("dependencies")
	if dependenciesStr != "" {
		err = json.Unmarshal([]byte(dependenciesStr), &dependencies)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "dependencies"},
				Debug:   err.Error(),
			})
			return
		}
	}
	builderId := r.FormValue("builderId")
	if clientBuild && builderId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "builderId"},
		})
		return
	}
	result, err := p.buildService.PublishVersion(ctx, config, sourcesData, clientBuild, builderId, dependencies, resolveRefs, resolveConflicts)
	if err != nil {
		RespondWithError(w, "Failed to publish package", err)
		return
	}
	if result.PublishId == "" {
		w.WriteHeader(http.StatusNoContent)
	} else {
		RespondWithJson(w, http.StatusAccepted, result)
	}
}

func (p publishV2ControllerImpl) GetPublishStatus(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	publishId := getStringParam(r, "publishId")

	status, details, err := p.buildService.GetStatus(publishId)
	if err != nil {
		RespondWithError(w, "Failed to get publish status", err)
		return
	}

	if status == "" && details == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Message: "build not found",
		})
		return
	}

	RespondWithJson(w, http.StatusOK, view.PublishStatusResponse{
		PublishId: publishId,
		Status:    status,
		Message:   details,
	})
}

func (p publishV2ControllerImpl) GetPublishStatuses(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	var req view.BuildsStatusRequest
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

	result, err := p.buildService.GetStatuses(req.PublishIds)
	if err != nil {
		RespondWithError(w, "Failed to get publish statuses", err)
		return
	}

	if result == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Message: "builds not found",
		})
		return
	}

	RespondWithJson(w, http.StatusOK, result)
}

func (p publishV2ControllerImpl) SetPublishStatus_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	publishId := getStringParam(r, "publishId") //buildId

	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	err = r.ParseMultipartForm(1024 * 1024)
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
			log.Debugf("failed to remove temporal data: %+v", err)
		}
	}()

	var status view.BuildStatusEnum
	statusStr := r.FormValue("status")
	status, err = view.BuildStatusFromString(statusStr)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "status"},
			Debug:   err.Error(),
		})
		return
	}

	builderId := r.FormValue("builderId")
	if builderId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "builderId"},
		})
		return
	}
	err = p.buildService.ValidateBuildOwnership(publishId, builderId)
	if err != nil {
		RespondWithError(w, "Failed to validate build ownership", err)
		return
	}

	details := ""
	switch status {
	case view.StatusError:
		details = r.FormValue("errors")
		err = p.buildService.UpdateBuildStatus(publishId, status, details)
		if err != nil {
			RespondWithError(w, "Failed to update build status", err)
			return
		}
	case view.StatusComplete:
		var packageData []byte
		sourcesFile, archiveFileHeader, err := r.FormFile("data")
		if err != nil {
			if err == http.ErrMissingFile {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.RequiredParamsMissing,
					Message: exception.RequiredParamsMissingMsg,
					Params:  map[string]interface{}{"params": "data"},
				})
				return
			}
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		packageData, err = ioutil.ReadAll(sourcesFile)
		closeErr := sourcesFile.Close()
		if closeErr != nil {
			log.Debugf("failed to close temporal file: %+v", err)
		}
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		if !strings.HasSuffix(archiveFileHeader.Filename, ".zip") {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidParameterMsg,
				Params:  map[string]interface{}{"param": "data file name, expecting .zip archive"},
			})
			return
		}
		encoding := r.Header.Get("Content-Transfer-Encoding")
		if strings.EqualFold(encoding, "base64") {
			_, err := base64.StdEncoding.Decode(packageData, packageData)
			if err != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.IncorrectMultipartFile,
					Message: exception.IncorrectMultipartFileMsg,
					Debug:   err.Error()})
				return
			}
		}
		availableVersionStatuses, err := p.roleService.GetAvailableVersionPublishStatuses(ctx, packageId)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
		// TODO: enable for debug only?
		utils.SafeAsync(func() {
			err = p.buildResultService.StoreBuildResult(publishId, packageData)
			if err != nil {
				log.Errorf("Failed to save build result for %s: %s", publishId, err.Error())
				return
			}
		})
		err = p.buildResultService.SaveBuildResult_deprecated(packageId, packageData, publishId, availableVersionStatuses)
		if err != nil {
			RespondWithError(w, "Failed to publish build package", err)
			return
		}
	case view.StatusNotStarted:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Message: fmt.Sprintf("Value '%v' is not acceptable for status", status),
		})
		return
	case view.StatusRunning:
		err = p.buildService.UpdateBuildStatus(publishId, status, details)
		if err != nil {
			RespondWithError(w, "Failed to update build status", err)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (p publishV2ControllerImpl) SetPublishStatus(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	buildId := getStringParam(r, "publishId") //buildId

	ctx := context.Create(r)
	sufficientPrivileges, err := p.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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

	err = r.ParseMultipartForm(1024 * 1024)
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
			log.Debugf("failed to remove temporal data: %+v", err)
		}
	}()

	var status view.BuildStatusEnum
	statusStr := r.FormValue("status")
	status, err = view.BuildStatusFromString(statusStr)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "status"},
			Debug:   err.Error(),
		})
		return
	}

	builderId := r.FormValue("builderId")
	if builderId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "builderId"},
		})
		return
	}
	err = p.buildService.ValidateBuildOwnership(buildId, builderId)
	if err != nil {
		RespondWithError(w, "Failed to validate build ownership", err)
		return
	}

	details := ""
	switch status {
	case view.StatusError:
		details = r.FormValue("errors")
		err = p.buildService.UpdateBuildStatus(buildId, status, details)
		if err != nil {
			RespondWithError(w, "Failed to update build status", err)
			return
		}
	case view.StatusComplete:
		var data []byte
		sourcesFile, fileHeader, err := r.FormFile("data")
		if err != nil {
			if err == http.ErrMissingFile {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.RequiredParamsMissing,
					Message: exception.RequiredParamsMissingMsg,
					Params:  map[string]interface{}{"params": "data"},
				})
				return
			}
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		data, err = ioutil.ReadAll(sourcesFile)
		closeErr := sourcesFile.Close()
		if closeErr != nil {
			log.Debugf("failed to close temporal file: %+v", err)
		}
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectMultipartFile,
				Message: exception.IncorrectMultipartFileMsg,
				Debug:   err.Error()})
			return
		}
		encoding := r.Header.Get("Content-Transfer-Encoding")
		if strings.EqualFold(encoding, "base64") {
			_, err := base64.StdEncoding.Decode(data, data)
			if err != nil {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.IncorrectMultipartFile,
					Message: exception.IncorrectMultipartFileMsg,
					Debug:   err.Error()})
				return
			}
		}
		availableVersionStatuses, err := p.roleService.GetAvailableVersionPublishStatuses(ctx, packageId)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
		err = p.buildResultService.SaveBuildResult(packageId, data, fileHeader.Filename, buildId, availableVersionStatuses)
		if err != nil {
			RespondWithError(w, "Failed to publish build package", err)
			return
		}
	case view.StatusNotStarted:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Message: fmt.Sprintf("Value '%v' is not acceptable for status", status),
		})
		return
	case view.StatusRunning:
		err = p.buildService.UpdateBuildStatus(buildId, status, details)
		if err != nil {
			RespondWithError(w, "Failed to update build status", err)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (p publishV2ControllerImpl) GetFreeBuild(w http.ResponseWriter, r *http.Request) {
	builderId := getStringParam(r, "builderId")
	start := time.Now()

	src, err := p.buildService.GetFreeBuild(builderId)

	if err != nil {
		RespondWithError(w, "Failed to get free build", err)
		return
	}

	if src != nil {
		w.Header().Set("Content-Type", "application/zip")
		w.Write(src)
	} else {
		w.WriteHeader(http.StatusNoContent)
	}
	log.Debugf("GetFreeBuild took %dms", time.Since(start).Milliseconds())
}
