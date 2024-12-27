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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/gorilla/mux"
)

type BuildCleanupController interface {
	StartMigrationBuildCleanup(w http.ResponseWriter, r *http.Request)
	GetMigrationBuildCleanupResult(w http.ResponseWriter, r *http.Request)
}

func NewBuildCleanupController(buildCleanupService service.DBCleanupService, isSysadm func(context.SecurityContext) bool) BuildCleanupController {
	return &buildCleanupControllerImpl{
		buildCleanupService: buildCleanupService,
		isSysadm:            isSysadm,
	}
}

type buildCleanupControllerImpl struct {
	buildCleanupService service.DBCleanupService
	isSysadm            func(context.SecurityContext) bool
}

func (b buildCleanupControllerImpl) StartMigrationBuildCleanup(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := b.isSysadm(ctx)
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	id, err := b.buildCleanupService.StartMigrationBuildDataCleanup()
	if err != nil {
		RespondWithError(w, "Failed to cleanup migration builds", err)
	}

	result := map[string]interface{}{}
	result["id"] = id

	RespondWithJson(w, http.StatusOK, result)
}

func (b buildCleanupControllerImpl) GetMigrationBuildCleanupResult(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := b.isSysadm(ctx)
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	params := mux.Vars(r)
	id := params["id"]

	result, err := b.buildCleanupService.GetMigrationBuildDataCleanupResult(id)
	if err != nil {
		RespondWithError(w, "Failed to get remove migration build data", err)
	}

	RespondWithJson(w, http.StatusOK, result)
}
