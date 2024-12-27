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
)

type SysAdminController interface {
	GetSystemAdministrators(w http.ResponseWriter, r *http.Request)
	AddSystemAdministrator(w http.ResponseWriter, r *http.Request)
	DeleteSystemAdministrator(w http.ResponseWriter, r *http.Request)
}

func NewSysAdminController(roleService service.RoleService) SysAdminController {
	return &sysAdminControllerImpl{
		roleService: roleService,
	}
}

type sysAdminControllerImpl struct {
	roleService service.RoleService
}

func (a sysAdminControllerImpl) GetSystemAdministrators(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := a.roleService.IsSysadm(ctx)
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	admins, err := a.roleService.GetSystemAdministrators()
	if err != nil {
		RespondWithError(w, "Failed to get system administrators", err)
		return
	}
	RespondWithJson(w, http.StatusOK, admins)
}

func (a sysAdminControllerImpl) AddSystemAdministrator(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	sufficientPrivileges := a.roleService.IsSysadm(ctx)
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
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
	var addSysadmReq view.AddSysadmReq
	err = json.Unmarshal(body, &addSysadmReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(addSysadmReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	admins, err := a.roleService.AddSystemAdministrator(addSysadmReq.UserId)
	if err != nil {
		RespondWithError(w, "Failed to add system administrator", err)
		return
	}
	RespondWithJson(w, http.StatusOK, admins)
}

func (a sysAdminControllerImpl) DeleteSystemAdministrator(w http.ResponseWriter, r *http.Request) {
	userId := getStringParam(r, "userId")
	ctx := context.Create(r)
	sufficientPrivileges := a.roleService.IsSysadm(ctx)
	if !sufficientPrivileges {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	err := a.roleService.DeleteSystemAdministrator(userId)
	if err != nil {
		RespondWithError(w, "Failed to delete system administrator", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
