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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	log "github.com/sirupsen/logrus"
)

type PublishedController interface {
	GetVersion(w http.ResponseWriter, r *http.Request)
	GetVersionSources(w http.ResponseWriter, r *http.Request)
	GetPublishedVersionSourceDataConfig(w http.ResponseWriter, r *http.Request)
	GetPublishedVersionBuildConfig(w http.ResponseWriter, r *http.Request)
	GetSharedContentFile(w http.ResponseWriter, r *http.Request)
	SharePublishedFile(w http.ResponseWriter, r *http.Request)
	GenerateFileDocumentation(w http.ResponseWriter, r *http.Request)
	GenerateVersionDocumentation(w http.ResponseWriter, r *http.Request)
}

func NewPublishedController(versionService service.PublishedService, portalService service.PortalService, searchService service.SearchService) PublishedController {
	return &publishControllerImpl{
		publishedService: versionService,
		portalService:    portalService,
		searchService:    searchService,
	}
}

type publishControllerImpl struct {
	publishedService service.PublishedService
	portalService    service.PortalService
	searchService    service.SearchService
}

func (v publishControllerImpl) GetVersion(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
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
	importFiles := r.URL.Query().Get("importFiles") == "true"
	//dependFiles := r.URL.Query().Get("dependFiles") == "true"
	dependFiles := false //TODO for now this option is disabled
	version, err := v.publishedService.GetVersion(packageId, versionName, importFiles, dependFiles)
	if err != nil {
		log.Error("Failed to get package version: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, version)
}

func (v publishControllerImpl) GetVersionSources(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
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
	srcArchive, err := v.publishedService.GetVersionSources(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version sources: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
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
		RespondWithCustomError(w, &exception.CustomError{
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
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version sources",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, publishedVersionSourceDataConfig)
}

func (v publishControllerImpl) GetPublishedVersionBuildConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
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

	publishedVersionBuildConfig, err := v.publishedService.GetPublishedVersionBuildConfig(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version build config: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version build config",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, publishedVersionBuildConfig)
}

func (v publishControllerImpl) GetSharedContentFile(w http.ResponseWriter, r *http.Request) {
	sharedUrl := getStringParam(r, "shared_id")

	contentData, err := v.publishedService.GetSharedFile(sharedUrl)
	if err != nil {
		log.Error("Failed to get published content by shared ID: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get published content by shared ID",
				Debug:   err.Error()})
		}
		return
	}
	w.Header().Set("Content-Type", "text/plain") // For frontend it's convenient to get all types as plain text
	w.WriteHeader(http.StatusOK)
	w.Write(contentData)
}

func (v publishControllerImpl) SharePublishedFile(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
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
	fileSlug, err := url.QueryUnescape(getStringParam(r, "fileSlug"))
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileSlug"},
			Debug:   err.Error(),
		})
		return
	}

	sharedUrlInfo, err := v.publishedService.SharePublishedFile(packageId, versionName, fileSlug)
	if err != nil {
		log.Error("Failed to create shared URL for content: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to create shared URL for content",
				Debug:   err.Error()})
		}
		return
	}
	RespondWithJson(w, http.StatusOK, sharedUrlInfo)
}

func (v publishControllerImpl) GenerateFileDocumentation(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
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

	var data []byte
	switch docType {
	case view.DTInteractive:
		var filename string
		data, filename, err = v.portalService.GenerateInteractivePageForPublishedFile(packageId, versionName, slug)
		if err != nil {
			log.Error("Failed to generate interactive HTML page for file ", packageId+":"+versionName+":"+slug, " ", err.Error())
			if customError, ok := err.(*exception.CustomError); ok {
				RespondWithCustomError(w, customError)
			} else {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: "Failed to generate interactive HTML page for file",
					Debug:   err.Error()})
			}
			return
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%v", filename))

	case view.DTRaw:
		content, cd, err := v.publishedService.GetLatestContentDataBySlug(packageId, versionName, slug)
		if err != nil {
			log.Error("Failed to get published content as file: ", err.Error())
			if customError, ok := err.(*exception.CustomError); ok {
				RespondWithCustomError(w, customError)
			} else {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: "Failed to get published content as file",
					Debug:   err.Error()})
			}
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
	}

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (v publishControllerImpl) GenerateVersionDocumentation(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
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

	var data []byte
	var filename string
	switch docType {
	case view.DTInteractive:
		data, filename, err = v.portalService.GenerateInteractivePageForPublishedVersion(packageId, versionName)

		if err != nil {
			log.Error("Failed to generate interactive HTML page for version ", packageId+":"+versionName, " ", err.Error())
			if customError, ok := err.(*exception.CustomError); ok {
				RespondWithCustomError(w, customError)
			} else {
				RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: "Failed to generate interactive HTML page for version",
					Debug:   err.Error()})
			}
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
	}

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
