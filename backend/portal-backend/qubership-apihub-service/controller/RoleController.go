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

type RoleController interface {
	GetPackageMembers(w http.ResponseWriter, r *http.Request)
	DeletePackageMember(w http.ResponseWriter, r *http.Request)
	AddPackageMembers(w http.ResponseWriter, r *http.Request)
	UpdatePackageMembers(w http.ResponseWriter, r *http.Request)
	CreateRole(w http.ResponseWriter, r *http.Request)
	DeleteRole(w http.ResponseWriter, r *http.Request)
	UpdateRole(w http.ResponseWriter, r *http.Request)
	GetExistingRoles(w http.ResponseWriter, r *http.Request)
	GetAvailablePackageRoles(w http.ResponseWriter, r *http.Request)
	SetRoleOrder(w http.ResponseWriter, r *http.Request)
	GetExistingPermissions(w http.ResponseWriter, r *http.Request)

	GetAvailableUserPackagePromoteStatuses(w http.ResponseWriter, r *http.Request)
	TestSetUserSystemRole(w http.ResponseWriter, r *http.Request)
}

func NewRoleController(roleService service.RoleService) RoleController {
	return &roleControllerImpl{
		roleService: roleService,
	}
}

type roleControllerImpl struct {
	roleService service.RoleService
}

func (c roleControllerImpl) GetPackageMembers(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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
	members, err := c.roleService.GetPackageMembers(packageId)
	if err != nil {
		RespondWithError(w, "Failed to get package members", err)
		return
	}
	RespondWithJson(w, http.StatusOK, members)
}

func (c roleControllerImpl) DeletePackageMember(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.UserAccessManagementPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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
	userId, err := getUnescapedStringParam(r, "userId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "userId"},
			Debug:   err.Error(),
		})
		return
	}

	indirectMemberRole, err := c.roleService.DeletePackageMember(ctx, packageId, userId)
	if err != nil {
		RespondWithError(w, "Failed to delete package member", err)
		return
	}
	if indirectMemberRole == nil {
		w.WriteHeader(http.StatusNoContent)
	} else {
		RespondWithJson(w, http.StatusOK, indirectMemberRole)
	}
}

func (c roleControllerImpl) AddPackageMembers(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.UserAccessManagementPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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
	var packageMembersReq view.PackageMembersAddReq
	err = json.Unmarshal(body, &packageMembersReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(packageMembersReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	members, err := c.roleService.AddPackageMembers(ctx, packageId, packageMembersReq.Emails, packageMembersReq.RoleIds)
	if err != nil {
		RespondWithError(w, "Failed to add package members", err)
		return
	}
	RespondWithJson(w, http.StatusCreated, members)
}

func (c roleControllerImpl) UpdatePackageMembers(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.UserAccessManagementPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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
	userId, err := getUnescapedStringParam(r, "userId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "userId"},
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
	var packageMemberUpdatePatch view.PackageMemberUpdatePatch
	err = json.Unmarshal(body, &packageMemberUpdatePatch)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(packageMemberUpdatePatch)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	err = c.roleService.UpdatePackageMember(ctx, packageId, userId, packageMemberUpdatePatch.RoleId, packageMemberUpdatePatch.Action)
	if err != nil {
		RespondWithError(w, "Failed to update package member", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c roleControllerImpl) CreateRole(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !c.roleService.IsSysadm(ctx) {
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
	var createRoleReq view.PackageRoleCreateReq
	err = json.Unmarshal(body, &createRoleReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(createRoleReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	createdRole, err := c.roleService.CreateRole(createRoleReq.Role, createRoleReq.Permissions)
	if err != nil {
		RespondWithError(w, "Failed to create new role", err)
		return
	}
	RespondWithJson(w, http.StatusCreated, createdRole)
}

func (c roleControllerImpl) DeleteRole(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !c.roleService.IsSysadm(ctx) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	roleId := getStringParam(r, "roleId")
	err := c.roleService.DeleteRole(roleId)
	if err != nil {
		RespondWithError(w, "Failed to delete role", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c roleControllerImpl) UpdateRole(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !c.roleService.IsSysadm(ctx) {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	roleId := getStringParam(r, "roleId")
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
	var updateRoleReq view.PackageRoleUpdateReq
	err = json.Unmarshal(body, &updateRoleReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	if updateRoleReq.Permissions != nil {
		err = c.roleService.SetRolePermissions(roleId, *updateRoleReq.Permissions)
		if err != nil {
			RespondWithError(w, "Failed to update role permissions", err)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c roleControllerImpl) GetExistingRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := c.roleService.GetExistingRolesExcludingNone()
	if err != nil {
		RespondWithError(w, "Failed to get existing roles", err)
		return
	}
	RespondWithJson(w, http.StatusOK, roles)
}

func (c roleControllerImpl) GetExistingPermissions(w http.ResponseWriter, r *http.Request) {
	permissions, err := c.roleService.GetExistingPermissions()
	if err != nil {
		RespondWithError(w, "Failed to get permissions list", err)
		return
	}
	RespondWithJson(w, http.StatusOK, permissions)
}

func (c roleControllerImpl) GetAvailablePackageRoles(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	packageId := getStringParam(r, "packageId")
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		RespondWithError(w, "Failed to check user privileges", err)
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
	availableRoles, err := c.roleService.GetAvailablePackageRoles(ctx, packageId, true)
	if err != nil {
		RespondWithError(w, "Failed to get available package roles", err)
		return
	}
	RespondWithJson(w, http.StatusOK, availableRoles)
}

func (c roleControllerImpl) SetRoleOrder(w http.ResponseWriter, r *http.Request) {
	ctx := context.Create(r)
	if !c.roleService.IsSysadm(ctx) {
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
	var setRoleOrderReq view.PackageRoleOrderReq
	err = json.Unmarshal(body, &setRoleOrderReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(setRoleOrderReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	err = c.roleService.SetRoleOrder(setRoleOrderReq.Roles)
	if err != nil {
		RespondWithError(w, "Failed to update role permissions", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c roleControllerImpl) GetAvailableUserPackagePromoteStatuses(w http.ResponseWriter, r *http.Request) {
	userId, err := getUnescapedStringParam(r, "userId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "userId"},
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
	var packages view.PackagesReq
	err = json.Unmarshal(body, &packages)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	availablePackagePromoteStatuses, err := c.roleService.GetUserPackagePromoteStatuses(packages.Packages, userId)
	if err != nil {
		RespondWithError(w, "Failed to get package promote statuses available for user", err)
		return
	}
	RespondWithJson(w, http.StatusOK, availablePackagePromoteStatuses)
}

func (c roleControllerImpl) TestSetUserSystemRole(w http.ResponseWriter, r *http.Request) {
	userId, err := getUnescapedStringParam(r, "userId")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "userId"},
			Debug:   err.Error(),
		})
		return
	}

	defer r.Body.Close()
	params, err := getParamsFromBody(r)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	role, err := getBodyStringParam(params, "role")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "role"},
			Debug:   err.Error(),
		})
		return
	}

	err = c.roleService.SetUserSystemRole(userId, role)
	if err != nil {
		RespondWithError(w, "Failed to set user system role", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
