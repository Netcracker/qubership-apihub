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
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type InternalDocumentController interface {
	GetVersionInternalDocuments(w http.ResponseWriter, r *http.Request)
	GetVersionInternalDocumentData(w http.ResponseWriter, r *http.Request)
	GetComparisonInternalDocuments(w http.ResponseWriter, r *http.Request)
	GetComparisonInternalDocumentData(w http.ResponseWriter, r *http.Request)
}

func NewInternalDocumentController(publishedService service.PublishedService, roleService service.RoleService) InternalDocumentController {
	return &internalDocumentControllerImpl{
		publishedService: publishedService,
		roleService:      roleService,
	}
}

type internalDocumentControllerImpl struct {
	publishedService service.PublishedService
	roleService      service.RoleService
}

func (c *internalDocumentControllerImpl) GetVersionInternalDocuments(w http.ResponseWriter, r *http.Request) {
	var err error
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	version, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	response, err := c.publishedService.GetVersionInternalDocuments(packageId, version)
	if err != nil {
		utils.RespondWithError(w, "Failed to get internal documents for version", err)
		return
	}

	utils.RespondWithJson(w, http.StatusOK, response)
}

func (c *internalDocumentControllerImpl) GetVersionInternalDocumentData(w http.ResponseWriter, r *http.Request) {
	hash := getStringParam(r, "hash")

	data, filename, err := c.publishedService.GetVersionInternalDocumentData(hash)
	if err != nil {
		utils.RespondWithError(w, "Failed to get internal document data", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (c *internalDocumentControllerImpl) GetComparisonInternalDocuments(w http.ResponseWriter, r *http.Request) {
	var err error
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		utils.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	version, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	refPackageId := r.URL.Query().Get("refPackageId")

	response, err := c.publishedService.GetComparisonInternalDocuments(packageId, version, previousVersionPackageId, previousVersion, refPackageId)
	if err != nil {
		utils.RespondWithError(w, "Failed to get internal documents for comparison", err)
		return
	}

	utils.RespondWithJson(w, http.StatusOK, response)
}

func (c *internalDocumentControllerImpl) GetComparisonInternalDocumentData(w http.ResponseWriter, r *http.Request) {
	hash := getStringParam(r, "hash")

	data, filename, err := c.publishedService.GetComparisonInternalDocumentData(hash)
	if err != nil {
		utils.RespondWithError(w, "Failed to get internal document data", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
