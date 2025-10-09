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
	"io"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/service"
	"github.com/Netcracker/qubership-apihub-agents-backend/utils"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
)

type NamespaceSecurityController interface {
	StartAuthSecurityCheck(w http.ResponseWriter, r *http.Request)
	GetAuthSecurityCheckReports(w http.ResponseWriter, r *http.Request)
	GetAuthSecurityCheckStatus(w http.ResponseWriter, r *http.Request)
	GetAuthSecurityCheckResult(w http.ResponseWriter, r *http.Request)
}

func NewNamespaceSecurityController(namespaceSecurityService service.NamespaceSecurityService, excelService service.ExcelService) NamespaceSecurityController {
	return &namespaceSecurityControllerImpl{
		namespaceSecurityService: namespaceSecurityService,
		excelService:             excelService,
	}
}

type namespaceSecurityControllerImpl struct {
	namespaceSecurityService service.NamespaceSecurityService
	excelService             service.ExcelService
}

func (n namespaceSecurityControllerImpl) StartAuthSecurityCheck(w http.ResponseWriter, r *http.Request) {
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
	var requestView view.StartNamespaceSecurityCheckReq
	err = json.Unmarshal(body, &requestView)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(requestView)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	processId, err := n.namespaceSecurityService.StartAuthSecurityCheckProcess(secctx.MakeUserContext(r), requestView)
	if err != nil {
		respondWithError(w, "Failed to start auth security check process", err)
		return
	}
	respondWithJson(w, http.StatusAccepted, view.ProcessId{ProcessId: processId})
}

func (n namespaceSecurityControllerImpl) GetAuthSecurityCheckReports(w http.ResponseWriter, r *http.Request) {
	agentId := r.URL.Query().Get("agentId")
	namespace := r.URL.Query().Get("name")
	workspaceId := r.URL.Query().Get("workspaceId")
	limit, cErr := getLimitQueryParam(r)
	if cErr != nil {
		respondWithError(w, cErr.Error(), cErr)
		return
	}
	page, cErr := getPageQueryParam(r)
	if cErr != nil {
		respondWithError(w, cErr.Error(), cErr)
		return
	}
	requestView := view.GetNamespaceSecurityCheckReq{
		AgentId:     agentId,
		Namespace:   namespace,
		WorkspaceId: workspaceId,
		Limit:       limit,
		Page:        page,
	}
	reports, err := n.namespaceSecurityService.GetAuthSecurityCheckReports(requestView)
	if err != nil {
		respondWithError(w, "Failed to list auth security check reports", err)
		return
	}
	respondWithJson(w, http.StatusOK, reports)
}

func (n namespaceSecurityControllerImpl) GetAuthSecurityCheckStatus(w http.ResponseWriter, r *http.Request) {
	processId := getStringParam(r, "processId")
	status, err := n.namespaceSecurityService.GetAuthSecurityCheckStatus(processId)
	if err != nil {
		respondWithError(w, "Failed to get auth security check status", err)
		return
	}
	respondWithJson(w, http.StatusOK, status)
}

func (n namespaceSecurityControllerImpl) GetAuthSecurityCheckResult(w http.ResponseWriter, r *http.Request) {
	processId := getStringParam(r, "processId")
	report, filename, err := n.excelService.GetNamespaceSecurityAuthCheckReport(processId)
	if err != nil {
		respondWithError(w, "Failed to get auth security check results", err)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%v"`, filename))
	w.Header().Set("Content-Transfer-Encoding", "binary")
	w.Header().Set("Expires", "0")
	report.Write(w)
	report.Close()
}
