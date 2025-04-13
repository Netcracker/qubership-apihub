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

type NamespaceController interface {
	ListNamespaces(w http.ResponseWriter, r *http.Request)
}

func NewNamespaceController(namespaceListCache service.NamespaceListCache) NamespaceController {
	return namespaceControllerImpl{namespaceListCache: namespaceListCache}
}

type namespaceControllerImpl struct {
	namespaceListCache service.NamespaceListCache
}

func (n namespaceControllerImpl) ListNamespaces(w http.ResponseWriter, r *http.Request) {

	nss, err := n.namespaceListCache.ListNamespaces()
	if err != nil {
		log.Error("Failed to list namespaces: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
		} else {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to list namespaces",
				Debug:   err.Error()})
		}
		return
	}

	resp := view.NamespacesListResponse{Namespaces: nss, CloudName: n.namespaceListCache.GetCloudName()}
	respondWithJson(w, http.StatusOK, resp)
}
