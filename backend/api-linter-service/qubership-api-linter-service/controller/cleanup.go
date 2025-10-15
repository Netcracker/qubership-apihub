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

	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/service"
)

type CleanupController interface {
	ClearTestData(w http.ResponseWriter, r *http.Request)
}

type cleanupControllerImpl struct {
	cleanupService       service.CleanupService
	authorizationService service.AuthorizationService
	systemInfoService    service.SystemInfoService
}

func NewCleanupController(cleanupService service.CleanupService, authorizationService service.AuthorizationService, systemInfoService service.SystemInfoService) CleanupController {
	return &cleanupControllerImpl{
		cleanupService:       cleanupService,
		authorizationService: authorizationService,
		systemInfoService:    systemInfoService,
	}
}

func (c cleanupControllerImpl) ClearTestData(w http.ResponseWriter, r *http.Request) {
	if c.systemInfoService.IsProductionMode() {
		RespondWithCustomError(w, &exception.CustomError{
			Status: http.StatusNotFound,
		})
	}
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.authorizationService.HasRulesetManagementPermission(ctx)
	if err != nil {
		respondWithError(w, "Failed to check permissions", err)
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

	testId, err := getUnescapedStringParam(r, "testId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "testId"},
			Debug:   err.Error(),
		})
		return
	}

	err = c.cleanupService.ClearTestData(ctx, testId)
	if err != nil {
		respondWithError(w, "Failed to clear test data", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
