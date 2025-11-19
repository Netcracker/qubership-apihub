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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	log "github.com/sirupsen/logrus"
)

type PublishedController interface {
	GetVersionSources(w http.ResponseWriter, r *http.Request)
	GetPublishedVersionSourceDataConfig(w http.ResponseWriter, r *http.Request)
	GetPublishedVersionBuildConfig(w http.ResponseWriter, r *http.Request)
}

func NewPublishedController(versionService service.PublishedService, portalService service.PortalService) PublishedController {
	return &publishControllerImpl{
		publishedService: versionService,
		portalService:    portalService,
	}
}

type publishControllerImpl struct {
	publishedService service.PublishedService
	portalService    service.PortalService
}

func (v publishControllerImpl) GetVersionSources(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	srcArchive, err := v.publishedService.GetVersionSources(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version sources: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
		} else {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version sources",
				Debug:   err.Error()})
		}
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
	w.Write(srcArchive)
}

func (v publishControllerImpl) GetPublishedVersionSourceDataConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	publishedVersionSourceDataConfig, err := v.publishedService.GetPublishedVersionSourceDataConfig(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version sources: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
		} else {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version sources",
				Debug:   err.Error()})
		}
		return
	}

	utils.RespondWithJson(w, http.StatusOK, publishedVersionSourceDataConfig)
}

func (v publishControllerImpl) GetPublishedVersionBuildConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	publishedVersionBuildConfig, err := v.publishedService.GetPublishedVersionBuildConfig(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version build config: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
		} else {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version build config",
				Debug:   err.Error()})
		}
		return
	}

	utils.RespondWithJson(w, http.StatusOK, publishedVersionBuildConfig)
}
