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

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/service"
	log "github.com/sirupsen/logrus"
)

type SpecificationsController interface {
	GetServiceSpecification(w http.ResponseWriter, r *http.Request)
}

func NewSpecificationsController(agentClient client.AgentClient, agentService service.AgentService) SpecificationsController {
	return specificationsControllerImpl{agentClient: agentClient, agentService: agentService}
}

type specificationsControllerImpl struct {
	agentClient  client.AgentClient
	agentService service.AgentService
}

func (s specificationsControllerImpl) GetServiceSpecification(w http.ResponseWriter, r *http.Request) {
	agentId := getStringParam(r, "agentId")
	namespace := getStringParam(r, "namespace")
	workspaceId := getStringParam(r, "workspaceId")
	serviceId, err := getUnescapedStringParam(r, "serviceId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "serviceId"},
			Debug:   err.Error(),
		})
		return
	}
	fileId, err := getUnescapedStringParam(r, "fileId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "fileId"},
			Debug:   err.Error(),
		})
		return
	}
	agent, err := s.agentService.GetAgent(agentId)
	if err != nil {
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get agent by id - '$id'",
				Debug:   err.Error(),
				Params:  map[string]interface{}{"id": agentId}})
		}
		return
	}
	if agent == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.AgentNotFound,
			Message: exception.AgentNotFoundMsg,
			Params:  map[string]interface{}{"id": agentId}})
		return
	}

	specBytes, err := s.agentClient.GetServiceSpecification(secctx.MakeUserContext(r), namespace, workspaceId, serviceId, fileId, agent.AgentUrl)
	if err != nil {
		log.Error("Failed to get specification: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get specification",
				Debug:   err.Error()})
		}
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write(specBytes)
}
