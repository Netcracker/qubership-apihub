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
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type SearchController interface {
	Search_deprecated(w http.ResponseWriter, r *http.Request)
	Search(w http.ResponseWriter, r *http.Request)
}

func NewSearchController(operationService service.OperationService, versionService service.VersionService, monitoringService service.MonitoringService) SearchController {
	return &searchControllerImpl{
		operationService:  operationService,
		versionService:    versionService,
		monitoringService: monitoringService,
	}
}

type searchControllerImpl struct {
	operationService  service.OperationService
	versionService    service.VersionService
	monitoringService service.MonitoringService
}

// deprecated
func (s searchControllerImpl) Search_deprecated(w http.ResponseWriter, r *http.Request) {
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
	var searchQuery view.SearchQueryReq

	err = json.Unmarshal(body, &searchQuery)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(searchQuery)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
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
				Debug:   err.Error()})
			return
		}
	}
	searchLevel := getStringParam(r, "searchLevel")
	searchQuery.Limit = limit
	searchQuery.Page = page

	switch searchLevel {
	case view.SearchLevelOperations:
		{
			result, err := s.operationService.SearchForOperations_deprecated(searchQuery)
			if err != nil {
				RespondWithError(w, "Failed to perform search for operations", err)
				return
			}
			RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelPackages:
		{
			result, err := s.versionService.SearchForPackages(searchQuery)
			if err != nil {
				RespondWithError(w, "Failed to perform search for packages", err)
				return
			}
			RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelDocuments:
		{
			result, err := s.versionService.SearchForDocuments(searchQuery)
			if err != nil {
				RespondWithError(w, "Failed to perform search for documents", err)
				return
			}
			RespondWithJson(w, http.StatusOK, result)
		}
	default:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "searchLevel", "value": searchLevel},
		})
		return
	}
}

func (s searchControllerImpl) Search(w http.ResponseWriter, r *http.Request) {
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
	var searchQuery view.SearchQueryReq

	err = json.Unmarshal(body, &searchQuery)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(searchQuery)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
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
				Debug:   err.Error()})
			return
		}
	}
	searchLevel := getStringParam(r, "searchLevel")
	searchQuery.Limit = limit
	searchQuery.Page = page

	s.monitoringService.AddEndpointCall(getTemplatePath(r), view.MakeSearchEndpointOptions(searchLevel, searchQuery.OperationSearchParams))
	switch searchLevel {
	case view.SearchLevelOperations:
		{
			result, err := s.operationService.SearchForOperations(searchQuery)
			if err != nil {
				RespondWithError(w, "Failed to perform search for operations", err)
				return
			}
			RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelPackages:
		{
			result, err := s.versionService.SearchForPackages(searchQuery)
			if err != nil {
				RespondWithError(w, "Failed to perform search for packages", err)
				return
			}
			RespondWithJson(w, http.StatusOK, result)
		}
	case view.SearchLevelDocuments:
		{
			result, err := s.versionService.SearchForDocuments(searchQuery)
			if err != nil {
				RespondWithError(w, "Failed to perform search for documents", err)
				return
			}
			RespondWithJson(w, http.StatusOK, result)
		}
	default:
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "searchLevel", "value": searchLevel},
		})
		return
	}
}
