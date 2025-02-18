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
	"errors"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"io"
	"net/http"
)

type PersonalAccessTokenController interface {
	CreatePAT(w http.ResponseWriter, r *http.Request)
	ListPATs(w http.ResponseWriter, r *http.Request)
	DeletePAT(w http.ResponseWriter, r *http.Request)
}

func NewPersonalAccessTokenController(svc service.PersonalAccessTokenService) PersonalAccessTokenController {
	return &PersonalAccessTokenControllerImpl{
		svc: svc,
	}
}

type PersonalAccessTokenControllerImpl struct {
	svc service.PersonalAccessTokenService
}

func (u PersonalAccessTokenControllerImpl) CreatePAT(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	var req view.PersonalAccessTokenCreateRequest
	err = json.Unmarshal(body, &req)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(req)
	if validationErr != nil {
		var customError *exception.CustomError
		if errors.As(validationErr, &customError) {
			RespondWithCustomError(w, customError)
			return
		}
	}

	ctx := context.Create(r)

	resp, err := u.svc.CreatePAT(ctx, req)
	if err != nil {
		RespondWithError(w, "Failed to create personal access token", err)
		return
	}
	// TODO: do we need business metric for PATs?

	RespondWithJson(w, http.StatusOK, resp) //TODO: StatusCreated?
}

func (u PersonalAccessTokenControllerImpl) ListPATs(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	result, err := u.svc.ListPATs(ctx.GetUserId())
	if err != nil {
		RespondWithError(w, "Failed to list personal access tokens", err)
		return
	}
	RespondWithJson(w, http.StatusOK, result)
}

func (u PersonalAccessTokenControllerImpl) DeletePAT(w http.ResponseWriter, r *http.Request) {
	id := getStringParam(r, "id")
	ctx := context.Create(r)
	err := u.svc.DeletePAT(ctx, id)
	if err != nil {
		RespondWithError(w, "Failed to list personal access tokens", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
