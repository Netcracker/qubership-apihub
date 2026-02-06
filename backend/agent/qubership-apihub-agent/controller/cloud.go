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

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type CloudController interface {
	ListAllServices_deprecated(w http.ResponseWriter, r *http.Request)
	StartAllDiscovery_deprecated(w http.ResponseWriter, r *http.Request)
}

func NewCloudController(cloudService service.CloudService) CloudController {
	return &cloudControllerImpl{cloudService: cloudService}
}

type cloudControllerImpl struct {
	cloudService service.CloudService
}

func (c cloudControllerImpl) ListAllServices_deprecated(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	result := c.cloudService.GetAllServicesList_deprecated(workspaceId)
	respondWithJson(w, http.StatusOK, result)
}

func (c cloudControllerImpl) StartAllDiscovery_deprecated(w http.ResponseWriter, r *http.Request) {
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	err := c.cloudService.StartAllDiscovery_deprecated(secctx.Create(r), workspaceId)
	if err != nil {
		log.Error("Failed to start discovery all process: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to start discovery all process",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusAccepted)
}
