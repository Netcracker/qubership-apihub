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
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/Netcracker/qubership-apihub-agent/view"
	log "github.com/sirupsen/logrus"
)

type DocumentController interface {
	GetServiceDocument(w http.ResponseWriter, r *http.Request)
}

func NewDocumentController(documentService service.DocumentService) DocumentController {
	return documentControllerImpl{documentService: documentService}
}

type documentControllerImpl struct {
	documentService service.DocumentService
}

func (d documentControllerImpl) GetServiceDocument(w http.ResponseWriter, r *http.Request) {
	namespace := getStringParam(r, "name")
	workspaceId := getStringParam(r, "workspaceId")
	//v1 support
	if workspaceId == "" {
		workspaceId = view.DefaultWorkspaceId
	}
	serviceId := getStringParam(r, "serviceId")
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

	content, err := d.documentService.GetDocumentById(namespace, workspaceId, serviceId, fileId)

	if err != nil {
		log.Error("Failed to get document by id: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get document by id",
				Debug:   err.Error()})
		}
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}
