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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/controller"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

type OperationsMigrationController interface {
	StartOpsMigration(w http.ResponseWriter, r *http.Request)
	GetMigrationReport(w http.ResponseWriter, r *http.Request)
	CancelRunningMigrations(w http.ResponseWriter, r *http.Request)
	GetSuspiciousBuilds(w http.ResponseWriter, r *http.Request)
}

func NewTempMigrationController(migrationService service.DBMigrationService, isSysadmFunc func(context.SecurityContext) bool) OperationsMigrationController {
	return &operationsMigrationControllerImpl{
		migrationService: migrationService,
		isSysadm:         isSysadmFunc,
	}
}

type operationsMigrationControllerImpl struct {
	migrationService service.DBMigrationService
	isSysadm         func(context.SecurityContext) bool
}

func (t operationsMigrationControllerImpl) StartOpsMigration(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var req view.MigrationRequest

	err = json.Unmarshal(body, &req)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	id := uuid.New().String()

	utils.SafeAsync(func() {
		err := t.migrationService.MigrateOperations(id, req)
		if err != nil {
			log.Errorf("Operations migration process failed: %s", err)
		} else {
			log.Infof("Operations migration process complete")
		}
	})

	result := map[string]interface{}{}
	result["id"] = id

	controller.RespondWithJson(w, http.StatusCreated, result)
}

func (t operationsMigrationControllerImpl) GetMigrationReport(w http.ResponseWriter, r *http.Request) {
	var err error
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	params := mux.Vars(r)
	migrationId := params["migrationId"]

	includeBuildSamples := false
	if r.URL.Query().Get("includeBuildSamples") != "" {
		includeBuildSamples, err = strconv.ParseBool(r.URL.Query().Get("includeBuildSamples"))
		if err != nil {
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "includeBuildSamples", "type": "boolean"},
				Debug:   err.Error(),
			})
			return
		}
	}
	report, err := t.migrationService.GetMigrationReport(migrationId, includeBuildSamples)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    "999",
			Message: "Failed to get migration result",
			Debug:   err.Error(),
		})
		return
	}
	if report == nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    "998",
			Message: "Migration not found",
		})
		return
	}

	controller.RespondWithJson(w, http.StatusOK, report)
}

func (t operationsMigrationControllerImpl) CancelRunningMigrations(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err := t.migrationService.CancelRunningMigrations()
	if err != nil {
		controller.RespondWithError(w, "Failed to cancel running migrations", err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (t operationsMigrationControllerImpl) GetSuspiciousBuilds(w http.ResponseWriter, r *http.Request) {
	var err error
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	params := mux.Vars(r)
	migrationId := params["migrationId"]

	limit := 100
	maxLimit := 5000
	if r.URL.Query().Get("limit") != "" {
		limit, err = strconv.Atoi(r.URL.Query().Get("limit"))
		if err != nil {
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "limit", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
		if limit < 1 || limit > maxLimit {
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidLimitMsg,
				Params:  map[string]interface{}{"value": limit, "maxLimit": maxLimit},
			})
			return
		}
	}
	page := 0
	if r.URL.Query().Get("page") != "" {
		page, err = strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error()})
			return
		}
	}
	changedField := r.URL.Query().Get("changedField")

	suspiciousBuilds, err := t.migrationService.GetSuspiciousBuilds(migrationId, changedField, limit, page)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to get migration result",
			Debug:   err.Error(),
		})
		return
	}

	controller.RespondWithJson(w, http.StatusOK, suspiciousBuilds)
}
