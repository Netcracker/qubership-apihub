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
	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/service"
	"github.com/Netcracker/qubership-api-linter-service/view"
	log "github.com/sirupsen/logrus"
	"io/ioutil"
	"net/http"
)

type RulesetController interface {
	CreateRuleset(w http.ResponseWriter, r *http.Request)
	ActivateRuleset(w http.ResponseWriter, r *http.Request)
	ListRulesets(w http.ResponseWriter, r *http.Request)
	GetRuleset(w http.ResponseWriter, r *http.Request)
	GetRulesetData(w http.ResponseWriter, r *http.Request)
	GetRulesetActivationHistory(w http.ResponseWriter, r *http.Request)
	DeleteRuleset(w http.ResponseWriter, r *http.Request)
}

type rulesetControllerImpl struct {
	rulesetService       service.RulesetService
	authorizationService service.AuthorizationService
}

func NewRulesetController(rulesetService service.RulesetService, authorizationService service.AuthorizationService) RulesetController {
	return &rulesetControllerImpl{
		rulesetService:       rulesetService,
		authorizationService: authorizationService,
	}
}

func (c rulesetControllerImpl) CreateRuleset(w http.ResponseWriter, r *http.Request) {
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

	err = r.ParseMultipartForm(1024 * 1024)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	defer func() {
		err := r.MultipartForm.RemoveAll()
		if err != nil {
			log.Debugf("failed to remove temporal data: %+v", err)
		}
	}()

	name := r.FormValue("rulesetName")
	if name == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "rulesetName"},
		})
		return
	}

	apiTypeStr := r.FormValue("apiType")
	if apiTypeStr == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "apiType"},
		})
		return
	}

	apiType := view.ApiType(apiTypeStr)
	err = validateApiType(apiType)
	if err != nil {
		respondWithError(w, "incorrect api type", err)
		return
	}

	linterStr := r.FormValue("linter")
	if linterStr == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "linter"},
		})
		return
	}
	linter := view.Linter(linterStr)
	err = validateLinter(linter)
	if err != nil {
		respondWithError(w, "incorrect linter", err)
		return
	}

	var data []byte
	sourcesFile, fileHeader, err := r.FormFile("rulesetFile")
	if err != nil {
		if err == http.ErrMissingFile {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.RequiredParamsMissing,
				Message: exception.RequiredParamsMissingMsg,
				Params:  map[string]interface{}{"params": "data"},
			})
			return
		}
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectMultipartFile,
			Message: exception.IncorrectMultipartFileMsg,
			Debug:   err.Error()})
		return
	}
	data, err = ioutil.ReadAll(sourcesFile)
	closeErr := sourcesFile.Close()
	if closeErr != nil {
		log.Debugf("failed to close temporal file: %+v", err)
	}
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectMultipartFile,
			Message: exception.IncorrectMultipartFileMsg,
			Debug:   err.Error()})
		return
	}

	result, err := c.rulesetService.CreateRuleset(ctx, name, apiType, linter, fileHeader.Filename, data)
	if err != nil {
		respondWithError(w, "Failed to create ruleset", err)
		return
	}
	respondWithJson(w, http.StatusCreated, result)
}

func (c rulesetControllerImpl) ActivateRuleset(w http.ResponseWriter, r *http.Request) {
	rulesetId := getStringParam(r, "ruleset_id")

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

	err = c.rulesetService.ActivateRuleset(ctx, rulesetId)
	if err != nil {
		respondWithError(w, "Failed to activate ruleset", err)
		return
	}
}

func (c rulesetControllerImpl) ListRulesets(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.authorizationService.HasRulesetReadPermission(ctx)
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

	result, err := c.rulesetService.ListRulesets(ctx)
	if err != nil {
		respondWithError(w, "Failed to list rulesets", err)
		return
	}
	respondWithJson(w, http.StatusOK, result)
}

func (c rulesetControllerImpl) GetRuleset(w http.ResponseWriter, r *http.Request) {
	rulesetId := getStringParam(r, "ruleset_id")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.authorizationService.HasRulesetReadPermission(ctx)
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

	result, err := c.rulesetService.GetRuleset(ctx, rulesetId)
	if err != nil {
		respondWithError(w, "Failed to get ruleset", err)
		return
	}
	if result == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.EntityNotFound,
			Message: exception.EntityNotFoundMsg,
			Params:  map[string]interface{}{"entity": "ruleset", "id": rulesetId},
		})
		return
	}
	respondWithJson(w, http.StatusOK, result)
}

func (c rulesetControllerImpl) GetRulesetData(w http.ResponseWriter, r *http.Request) {
	rulesetId := getStringParam(r, "ruleset_id")
	// no auth checks by design
	disposition := r.URL.Query().Get("disposition")
	if disposition == "" {
		disposition = "inline"
	}

	if disposition != "attachment" && disposition != "inline" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"param": "disposition", "value": disposition},
		})
		return
	}

	data, filename, err := c.rulesetService.GetRulesetData(r.Context(), rulesetId)
	if err != nil {
		respondWithError(w, "Failed to get ruleset data", err)
		return
	}
	if data == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.EntityNotFound,
			Message: exception.EntityNotFoundMsg,
			Params:  map[string]interface{}{"entity": "ruleset", "id": rulesetId},
		})
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("%s; filename=\"%s\"", disposition, filename))
	// TODO: "Content-Type" header?

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (c rulesetControllerImpl) GetRulesetActivationHistory(w http.ResponseWriter, r *http.Request) {
	rulesetId := getStringParam(r, "ruleset_id")

	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.authorizationService.HasRulesetReadPermission(ctx)
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

	records, err := c.rulesetService.GetActivationHistory(ctx, rulesetId)
	if err != nil {
		respondWithError(w, "Failed to get activation history", err)
		return
	}

	result := view.ActivationHistoryResponse{
		Id:                rulesetId,
		ActivationHistory: records,
	}

	respondWithJson(w, http.StatusOK, result)
}

func (c rulesetControllerImpl) DeleteRuleset(w http.ResponseWriter, r *http.Request) {
	rulesetId := getStringParam(r, "ruleset_id")

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

	err = c.rulesetService.DeleteRuleset(ctx, rulesetId)
	if err != nil {
		respondWithError(w, "Failed to delete ruleset", err)
		return
	}
}

func validateApiType(at view.ApiType) error {
	switch at {
	case view.OpenAPI20Type, view.OpenAPI30Type, view.OpenAPI31Type:
		return nil
	default:
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"params": "apiType"},
		}
	}
}

func validateLinter(linter view.Linter) error {
	switch linter {
	case view.SpectralLinter:
		return nil
	default:
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"params": "linter"},
		}
	}
}
