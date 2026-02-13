package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/gorilla/mux"
)

type OperationsMigrationController interface {
	StartOpsMigration(w http.ResponseWriter, r *http.Request)
	GetMigrationReport(w http.ResponseWriter, r *http.Request)
	CancelRunningMigrations(w http.ResponseWriter, r *http.Request)
	GetSuspiciousBuilds(w http.ResponseWriter, r *http.Request)
	GetMigrationPerfReport(w http.ResponseWriter, r *http.Request)
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
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	defer r.Body.Close()
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
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
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	id, err := t.migrationService.StartMigrateOperations(req)
	if err != nil {
		utils.RespondWithError(w, "Failed to start operations migration", err)
		return
	}

	result := map[string]interface{}{}
	result["id"] = id

	utils.RespondWithJson(w, http.StatusCreated, result)
}

func (t operationsMigrationControllerImpl) GetMigrationReport(w http.ResponseWriter, r *http.Request) {
	var err error
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
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
			utils.RespondWithCustomError(w, &exception.CustomError{
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
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    "999",
			Message: "Failed to get migration result",
			Debug:   err.Error(),
		})
		return
	}
	if report == nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    "998",
			Message: "Migration not found",
		})
		return
	}

	utils.RespondWithJson(w, http.StatusOK, report)
}

func (t operationsMigrationControllerImpl) CancelRunningMigrations(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err := t.migrationService.CancelRunningMigrations()
	if err != nil {
		utils.RespondWithError(w, "Failed to cancel running migrations", err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (t operationsMigrationControllerImpl) GetSuspiciousBuilds(w http.ResponseWriter, r *http.Request) {
	var err error
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
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
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "limit", "type": "int"},
				Debug:   err.Error(),
			})
			return
		}
		if limit < 1 || limit > maxLimit {
			utils.RespondWithCustomError(w, &exception.CustomError{
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
			utils.RespondWithCustomError(w, &exception.CustomError{
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
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to get migration result",
			Debug:   err.Error(),
		})
		return
	}

	utils.RespondWithJson(w, http.StatusOK, suspiciousBuilds)
}

func (t operationsMigrationControllerImpl) GetMigrationPerfReport(w http.ResponseWriter, r *http.Request) {
	var err error
	ctx := context.Create(r)
	sufficientPrivileges := t.isSysadm(ctx)
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	params := mux.Vars(r)
	migrationId := params["migrationId"]

	includeHourPackageData := false
	inc := r.URL.Query().Get("includeHourPackageData")
	if inc == "true" {
		includeHourPackageData = true
	}

	var stageFilter *view.OpsMigrationStage

	stStr := r.URL.Query().Get("stage")
	if stStr != "" {
		cast := view.OpsMigrationStage(stStr)
		stageFilter = &cast
	}

	report, err := t.migrationService.GetMigrationPerfReport(migrationId, includeHourPackageData, stageFilter)
	if err != nil {
		utils.RespondWithError(w, "Failed to get migration perf report", err)
		return
	}
	
	response, _ := json.MarshalIndent(report, "", "    ")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response)
}
