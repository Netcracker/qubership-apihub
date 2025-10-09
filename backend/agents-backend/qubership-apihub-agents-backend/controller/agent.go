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
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/service"
	"github.com/Netcracker/qubership-apihub-agents-backend/utils"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
)

type AgentController interface {
	ProcessAgentSignal(w http.ResponseWriter, r *http.Request)
	ListAgents(w http.ResponseWriter, r *http.Request)
	GetAgent(w http.ResponseWriter, r *http.Request)
	GetAgentNamespaces(w http.ResponseWriter, r *http.Request)
	ListServiceNames(w http.ResponseWriter, r *http.Request)
}

func NewAgentController(agentService service.AgentService, agentClient client.AgentClient) AgentController {
	return &agentControllerImpl{
		agentService: agentService,
		agentClient:  agentClient,
	}
}

type agentControllerImpl struct {
	agentService service.AgentService
	agentClient  client.AgentClient
}

func (a agentControllerImpl) ProcessAgentSignal(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges := secctx.IsSysadm(ctx)
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
	var message view.AgentKeepaliveMessage
	err = json.Unmarshal(body, &message)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(message)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}
	version, err := a.agentService.ProcessAgentSignal(message)
	if err != nil {
		respondWithError(w, fmt.Sprintf("Failed to process agent keepalive message %+v", message), err)
		return
	}
	respondWithJson(w, http.StatusOK, version)
}

func (a agentControllerImpl) ListAgents(w http.ResponseWriter, r *http.Request) {
	onlyActiveStr := r.URL.Query().Get("onlyActive")
	var err error
	onlyActive := true
	if onlyActiveStr != "" {
		onlyActive, err = strconv.ParseBool(onlyActiveStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "onlyActive", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	showIncompatibleStr := r.URL.Query().Get("showIncompatible")
	showIncompatible := false
	if showIncompatibleStr != "" {
		showIncompatible, err = strconv.ParseBool(showIncompatibleStr)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "showIncompatible", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}

	result, err := a.agentService.ListAgents(onlyActive, showIncompatible)
	if err != nil {
		respondWithError(w, "Failed to list agents", err)
		return
	}

	respondWithJson(w, http.StatusOK, result)
}

func (a agentControllerImpl) GetAgent(w http.ResponseWriter, r *http.Request) {
	agentId := getStringParam(r, "id")

	agent, err := a.agentService.GetAgent(agentId)
	if err != nil {
		respondWithError(w, "Failed to get agent", err)
		return
	}
	if agent == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	respondWithJson(w, http.StatusOK, agent)
}

func (a agentControllerImpl) GetAgentNamespaces(w http.ResponseWriter, r *http.Request) {
	agentId := getStringParam(r, "agentId")

	agent, err := a.agentService.GetAgent(agentId)
	if err != nil {
		respondWithError(w, "Failed to get agent namespaces", err)
		return
	}
	if agent == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"agentId": agentId},
		})
		return
	}
	if agent.Status != view.AgentStatusActive {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.InactiveAgent,
			Message: exception.InactiveAgentMsg,
			Params:  map[string]interface{}{"agentId": agentId}})
		return
	}
	if agent.AgentVersion == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.IncompatibleAgentVersion,
			Message: exception.IncompatibleAgentVersionMsg,
			Params:  map[string]interface{}{"version": agent.AgentVersion},
		})
		return
	}
	if agent.CompatibilityError != nil && agent.CompatibilityError.Severity == view.SeverityError {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Message: agent.CompatibilityError.Message,
		})
		return
	}
	agentNamespaces, err := a.agentClient.GetNamespaces(secctx.MakeUserContext(r), agent.AgentUrl)
	if err != nil {
		respondWithError(w, "Failed to get agent namespaces", err)
		return
	}
	respondWithJson(w, http.StatusOK, agentNamespaces)
}

func (a agentControllerImpl) ListServiceNames(w http.ResponseWriter, r *http.Request) {
	agentId := getStringParam(r, "agentId")
	namespace := getStringParam(r, "namespace")

	agent, err := a.agentService.GetAgent(agentId)
	if err != nil {
		respondWithError(w, "Failed to get agent namespaces", err)
		return
	}
	if agent == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"agentId": agentId},
		})
		return
	}
	if agent.Status != view.AgentStatusActive {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.InactiveAgent,
			Message: exception.InactiveAgentMsg,
			Params:  map[string]interface{}{"agentId": agentId}})
		return
	}
	if agent.AgentVersion == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.IncompatibleAgentVersion,
			Message: exception.IncompatibleAgentVersionMsg,
			Params:  map[string]interface{}{"version": agent.AgentVersion},
		})
		return
	}
	if agent.CompatibilityError != nil && agent.CompatibilityError.Severity == view.SeverityError {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Message: agent.CompatibilityError.Message,
		})
		return
	}

	serviceNames, err := a.agentClient.ListServiceNames(secctx.MakeUserContext(r), agent.AgentUrl, namespace)
	if err != nil {
		respondWithError(w, "Failed to get service names", err)
		return
	}
	respondWithJson(w, http.StatusOK, serviceNames)
}
