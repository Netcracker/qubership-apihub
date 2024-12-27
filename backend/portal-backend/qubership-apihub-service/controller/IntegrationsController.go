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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/shaj13/go-guardian/v2/auth"
	log "github.com/sirupsen/logrus"
)

type IntegrationsController interface {
	GetUserApiKeyStatus(w http.ResponseWriter, r *http.Request)
	SetUserApiKey(w http.ResponseWriter, r *http.Request)
	ListRepositories(w http.ResponseWriter, r *http.Request)
	ListBranchesAndTags(w http.ResponseWriter, r *http.Request)
}

func NewIntegrationsController(service service.IntegrationsService) IntegrationsController {
	return &integrationsControllerImpl{service: service}
}

type integrationsControllerImpl struct {
	service service.IntegrationsService
}

func (c integrationsControllerImpl) GetUserApiKeyStatus(w http.ResponseWriter, r *http.Request) {
	integration, err := view.GitIntegrationTypeFromStr(getStringParam(r, "integrationId"))
	if err != nil {
		log.Error("Failed to read integration type: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get user api key status",
				Debug:   err.Error()})
		}
		return
	}

	user := auth.User(r)
	userId := user.GetID()
	if userId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UserIdNotFound,
			Message: exception.UserIdNotFoundMsg,
		})
		return
	}

	status, err := c.service.GetUserApiKeyStatus(integration, userId)
	if err != nil {
		log.Error("Failed to get user api key status: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get user api key status",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, status)
}

func (c integrationsControllerImpl) SetUserApiKey(w http.ResponseWriter, r *http.Request) {
	integration, err := view.GitIntegrationTypeFromStr(getStringParam(r, "integrationId"))
	if err != nil {
		log.Error("Failed to read integration type: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to set user api key",
				Debug:   err.Error()})
		}
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
	var request view.ApiKeyRequest
	err = json.Unmarshal(body, &request)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	if request.ApiKey == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.EmptyParameter,
			Message: exception.EmptyParameterMsg,
			Params:  map[string]interface{}{"param": "apikey"},
		})
		return
	}

	user := auth.User(r)
	userId := user.GetID()
	if userId == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UserIdNotFound,
			Message: exception.UserIdNotFoundMsg,
		})
		return
	}

	err = c.service.SetUserApiKey(integration, userId, request.ApiKey)
	if err != nil {
		log.Error("Failed to set api key: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to set api key",
				Debug:   err.Error()})
		}
		return
	}
	//todo err is needed? err is always nil
	status, err := c.service.GetUserApiKeyStatus(integration, userId)
	if err != nil {
		log.Error("Failed to get user api key status: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to set api key",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, status)
}

func (c integrationsControllerImpl) ListRepositories(w http.ResponseWriter, r *http.Request) {
	integration, err := view.GitIntegrationTypeFromStr(getStringParam(r, "integrationId"))
	if err != nil {
		log.Error("Failed to read integration type: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to list repositories",
				Debug:   err.Error()})
		}
		return
	}

	filter := r.URL.Query().Get("filter")

	repos, groups, err := c.service.ListRepositories(context.Create(r), integration, filter)
	if err != nil {
		log.Error("Failed to list repositories: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to list repositories",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, view.RepositoriesList{Repositories: repos, Groups: groups})
}

func (c integrationsControllerImpl) ListBranchesAndTags(w http.ResponseWriter, r *http.Request) {
	filter := r.URL.Query().Get("filter")
	integration, err := view.GitIntegrationTypeFromStr(getStringParam(r, "integrationId"))
	if err != nil {
		log.Error("Failed to read integration type: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to list branches",
				Debug:   err.Error()})
		}
		return
	}

	repoId := getStringParam(r, "repositoryId")

	branches, err := c.service.ListBranchesAndTags(context.Create(r), integration, repoId, filter)
	if err != nil {
		log.Error("Failed to list branches: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to list branches",
				Debug:   err.Error()})
		}
		return
	}

	RespondWithJson(w, http.StatusOK, branches)
}
