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

type ApihubApiKeyController interface {
	CreateApiKey_deprecated(w http.ResponseWriter, r *http.Request)
	CreateApiKey_v3_deprecated(w http.ResponseWriter, r *http.Request)
	CreateApiKey(w http.ResponseWriter, r *http.Request)
	RevokeApiKey(w http.ResponseWriter, r *http.Request)
	GetApiKeys_deprecated(w http.ResponseWriter, r *http.Request)
	GetApiKeys_v3_deprecated(w http.ResponseWriter, r *http.Request)
	GetApiKeys(w http.ResponseWriter, r *http.Request)
	GetApiKeyByKey(w http.ResponseWriter, r *http.Request)
	GetApiKeyById(w http.ResponseWriter, r *http.Request)
}

func NewApihubApiKeyController(apihubApiKeyService service.ApihubApiKeyService, roleService service.RoleService) ApihubApiKeyController {
	return &ApihubApiKeyControllerImpl{
		apihubApiKeyService: apihubApiKeyService,
		roleService:         roleService,
	}
}

type ApihubApiKeyControllerImpl struct {
	apihubApiKeyService service.ApihubApiKeyService
	roleService         service.RoleService
}

func (a ApihubApiKeyControllerImpl) CreateApiKey_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)

	if packageId == "*" {
		if !a.roleService.IsSysadm(ctx) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Only system administrator can create api key for all packages",
			})
			return
		}
	} else {
		sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.AccessTokenManagementPermission)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
		if !sufficientPrivileges {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Access token management permission is required to create api key for the package",
			})
			return
		}
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
	var createApiKeyReq view.ApihubApiKeyCreateReq_deprecated
	err = json.Unmarshal(body, &createApiKeyReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(createApiKeyReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	apiKey, err := a.apihubApiKeyService.CreateApiKey_deprecated(ctx, packageId, createApiKeyReq.Name, createApiKeyReq.Roles)
	if err != nil {
		RespondWithError(w, "Failed to create apihub api key", err)
		return
	}
	RespondWithJson(w, http.StatusOK, apiKey)
}

func (a ApihubApiKeyControllerImpl) CreateApiKey_v3_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)

	if packageId == "*" {
		if !a.roleService.IsSysadm(ctx) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Only system administrator can create api key for all packages",
			})
			return
		}
	} else {
		sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.AccessTokenManagementPermission)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
		if !sufficientPrivileges {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Access token management permission is required to create api key for the package",
			})
			return
		}
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
	var createApiKeyReq view.ApihubApiKeyCreateReq
	err = json.Unmarshal(body, &createApiKeyReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(createApiKeyReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	apiKey, err := a.apihubApiKeyService.CreateApiKey_v3_deprecated(ctx, packageId, createApiKeyReq.Name, createApiKeyReq.Roles)
	if err != nil {
		RespondWithError(w, "Failed to create apihub api key", err)
		return
	}
	RespondWithJson(w, http.StatusOK, apiKey)
}

func (a ApihubApiKeyControllerImpl) CreateApiKey(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)

	if packageId == "*" {
		if !a.roleService.IsSysadm(ctx) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Only system administrator can create api key for all packages",
			})
			return
		}
	} else {
		sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.AccessTokenManagementPermission)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
		if !sufficientPrivileges {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Access token management permission is required to create api key for the package",
			})
			return
		}
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
	var createApiKeyReq view.ApihubApiKeyCreateReq
	err = json.Unmarshal(body, &createApiKeyReq)
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}
	validationErr := utils.ValidateObject(createApiKeyReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			RespondWithCustomError(w, customError)
			return
		}
	}

	apiKey, err := a.apihubApiKeyService.CreateApiKey(ctx, packageId, createApiKeyReq.Name, createApiKeyReq.CreatedFor, createApiKeyReq.Roles)
	if err != nil {
		RespondWithError(w, "Failed to create apihub api key", err)
		return
	}
	RespondWithJson(w, http.StatusOK, apiKey)
}

func (a ApihubApiKeyControllerImpl) RevokeApiKey(w http.ResponseWriter, r *http.Request) {
	apiKeyId := getStringParam(r, "id")
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)

	if packageId == "*" {
		if !a.roleService.IsSysadm(ctx) {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Only system administrator can revoke api key for all packages",
			})
			return
		}
	} else {
		sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.AccessTokenManagementPermission)
		if err != nil {
			RespondWithError(w, "Failed to check user privileges", err)
			return
		}
		if !sufficientPrivileges {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusForbidden,
				Code:    exception.InsufficientPrivileges,
				Message: exception.InsufficientPrivilegesMsg,
				Debug:   "Access token management permission is required to revoke api key for the package",
			})
			return
		}
	}
	err := a.apihubApiKeyService.RevokePackageApiKey(ctx, apiKeyId, packageId)
	if err != nil {
		RespondWithError(w, "Failed to revoke apihub api key", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a ApihubApiKeyControllerImpl) GetApiKeys_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	apiKeys, err := a.apihubApiKeyService.GetProjectApiKeys_deprecated(packageId)
	if err != nil {
		RespondWithError(w, "Failed to get all apihub api keys", err)
		return
	}
	RespondWithJson(w, http.StatusOK, apiKeys)
}

func (a ApihubApiKeyControllerImpl) GetApiKeys_v3_deprecated(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	apiKeys, err := a.apihubApiKeyService.GetProjectApiKeys(packageId)
	if err != nil {
		RespondWithError(w, "Failed to get all apihub api keys", err)
		return
	}
	RespondWithJson(w, http.StatusOK, apiKeys)
}

func (a ApihubApiKeyControllerImpl) GetApiKeys(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	ctx := context.Create(r)
	sufficientPrivileges, err := a.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
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
	apiKeys, err := a.apihubApiKeyService.GetProjectApiKeys(packageId)
	if err != nil {
		RespondWithError(w, "Failed to get all apihub api keys", err)
		return
	}
	RespondWithJson(w, http.StatusOK, apiKeys)
}

func (a ApihubApiKeyControllerImpl) GetApiKeyByKey(w http.ResponseWriter, r *http.Request) {
	apiKeyHeader := r.Header.Get("api-key")
	if apiKeyHeader == "" {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ApiKeyHeaderIsEmpty,
			Message: exception.ApiKeyHeaderIsEmptyMsg,
		})
		return
	}
	apiKey, err := a.apihubApiKeyService.GetApiKeyByKey(apiKeyHeader)
	if err != nil {
		RespondWithError(w, "Failed to get apihub api key", err)
		return
	}
	if apiKey == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ApiKeyNotFoundByKey,
			Message: exception.ApiKeyNotFoundByKeyMsg,
		})
		return
	}
	RespondWithJson(w, http.StatusOK, apiKey)
}

func (a ApihubApiKeyControllerImpl) GetApiKeyById(w http.ResponseWriter, r *http.Request) {
	apiKeyId := getStringParam(r, "apiKeyId")

	apiKey, err := a.apihubApiKeyService.GetApiKeyById(apiKeyId)
	if err != nil {
		RespondWithError(w, "Failed to get apihub api key by id", err)
		return
	}
	if apiKey == nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ApiKeyNotFoundById,
			Message: exception.ApiKeyNotFoundByIdMsg,
			Params:  map[string]interface{}{"apiKeyId": apiKeyId},
		})
		return
	}
	RespondWithJson(w, http.StatusOK, apiKey)
}
