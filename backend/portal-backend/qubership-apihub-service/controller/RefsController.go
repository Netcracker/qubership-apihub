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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type RefController interface {
	UpdateRefs(w http.ResponseWriter, r *http.Request)
}

func NewRefController(draftRefService service.DraftRefService,
	wsBranchService service.WsBranchService) RefController {
	return &refControllerImpl{
		draftRefService: draftRefService,
		wsBranchService: wsBranchService,
	}
}

type refControllerImpl struct {
	draftRefService service.DraftRefService
	wsBranchService service.WsBranchService
}

func (c refControllerImpl) UpdateRefs(w http.ResponseWriter, r *http.Request) {
	var err error
	projectId := getStringParam(r, "projectId")
	branchName, err := getUnescapedStringParam(r, "branchName")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "branchName"},
			Debug:   err.Error(),
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
	var refPatch view.RefPatch
	err = json.Unmarshal(body, &refPatch)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(refPatch)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	err = c.draftRefService.UpdateRefs(context.Create(r), projectId, branchName, refPatch)
	if err != nil {
		log.Error("Failed to update refs: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			c.wsBranchService.DisconnectClients(projectId, branchName)
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to update refs",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}
