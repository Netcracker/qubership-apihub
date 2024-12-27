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

package service

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/crypto"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type ApihubApiKeyService interface {
	CreateApiKey_deprecated(ctx context.SecurityContext, packageId, name string, requestRoles []string) (*view.ApihubApiKey_deprecated, error)
	CreateApiKey_v3_deprecated(ctx context.SecurityContext, packageId, name string, requestRoles []string) (*view.ApihubApiKey_v3_deprecated, error)
	CreateApiKey(ctx context.SecurityContext, packageId, name string, createdFor string, requestRoles []string) (*view.ApihubApiKey, error)
	RevokePackageApiKey(ctx context.SecurityContext, apiKeyId string, packageId string) error
	GetProjectApiKeys_deprecated(packageId string) (*view.ApihubApiKeys_deprecated, error)
	GetProjectApiKeys_v3_deprecated(packageId string) (*view.ApihubApiKeys_v3_deprecated, error)
	GetProjectApiKeys(packageId string) (*view.ApihubApiKeys, error)
	GetApiKeyStatus(apiKey string, packageId string) (bool, *view.ApihubApiKey, error)
	GetApiKeyByKey(apiKey string) (*view.ApihubApiKeyExtAuthView, error)
	GetApiKeyById(apiKeyId string) (*view.ApihubApiKeyExtAuthView, error)
	CreateSystemApiKey(apiKey string) error
}

func NewApihubApiKeyService(apihubApiKeyRepository repository.ApihubApiKeyRepository,
	publishedRepo repository.PublishedRepository,
	atService ActivityTrackingService,
	userService UserService,
	roleRepository repository.RoleRepository,
	isSysadm func(context.SecurityContext) bool) ApihubApiKeyService {

	return &apihubApiKeyServiceImpl{
		apiKeyRepository: apihubApiKeyRepository,
		publishedRepo:    publishedRepo,
		atService:        atService,
		userService:      userService,
		roleRepository:   roleRepository,
		isSysadm:         isSysadm,
	}
}

type apihubApiKeyServiceImpl struct {
	apiKeyRepository repository.ApihubApiKeyRepository
	publishedRepo    repository.PublishedRepository
	atService        ActivityTrackingService
	userService      UserService
	roleRepository   repository.RoleRepository
	isSysadm         func(context.SecurityContext) bool
}

const API_KEY_PREFIX = "api-key_"

func (t apihubApiKeyServiceImpl) CreateApiKey_deprecated(ctx context.SecurityContext, packageId, name string, requestRoles []string) (*view.ApihubApiKey_deprecated, error) {
	// validate request roles first
	if len(requestRoles) > 0 {
		allRoles, err := t.roleRepository.GetAllRoles()
		if err != nil {
			return nil, err
		}
		existingIds := map[string]struct{}{}
		for _, role := range allRoles {
			existingIds[role.Id] = struct{}{}
		}
		for _, roleId := range requestRoles {
			if _, exists := existingIds[roleId]; !exists {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.RoleNotFound,
					Message: exception.RoleNotFoundMsg,
					Params:  map[string]interface{}{"role": roleId},
				}
			}
		}
	}

	var resultRoles []string

	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(packageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
		if packageEnt.DefaultRole == view.NoneRoleId && packageEnt.ParentId == "" {
			if !t.isSysadm(ctx) {
				return nil, &exception.CustomError{
					Status:  http.StatusForbidden,
					Code:    exception.InsufficientPrivileges,
					Message: exception.InsufficientPrivilegesMsg,
					Debug:   exception.PrivateWorkspaceNotModifiableMsg,
				}
			}
		}
		roleEnts, err := t.roleRepository.GetAvailablePackageRoles(packageId, ctx.GetUserId())
		if err != nil {
			return nil, err
		}
		if len(requestRoles) > 0 {
			// check requested roles against available for current user
			availableIds := map[string]struct{}{}
			for _, role := range roleEnts {
				availableIds[role.Id] = struct{}{}
			}
			for _, roleId := range requestRoles {
				if _, exists := availableIds[roleId]; !exists {
					// user do not have permission for the role
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.NotAvailableRole,
						Message: exception.NotAvailableRoleMsg,
						Params:  map[string]interface{}{"role": roleId},
					}
				}
			}
			// all request roles passed the check, so now we can add it to result
			resultRoles = append(resultRoles, requestRoles...)
		} else {
			userRoles, err := t.roleRepository.GetPackageRolesHierarchyForUser(packageId, ctx.GetUserId())
			if err != nil {
				return nil, err
			}
			for _, roleEnt := range userRoles {
				resultRoles = append(resultRoles, roleEnt.RoleId)
			}
			if !utils.SliceContains(resultRoles, packageEnt.DefaultRole) {
				resultRoles = append(resultRoles, packageEnt.DefaultRole)
			}
		}
	} else {
		if len(requestRoles) > 0 {
			resultRoles = append(resultRoles, requestRoles...) // set all request roles to result. Requester is sysadmin(requirements for *), so it's ok
		} else {
			resultRoles = append(resultRoles, view.SysadmRole) // request roles not set - fallback to sysadmin role to keep old behavior
		}
	}
	apiKey := crypto.CreateRandomHash()
	keyToCreate := view.ApihubApiKey_deprecated{
		Id:        t.makeApiKeyId(),
		PackageId: packageId,
		Name:      name,
		CreatedBy: ctx.GetUserId(),
		CreatedAt: time.Now(),
		ApiKey:    apiKey,
		Roles:     resultRoles,
	}
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apihubApiKeyEntity := entity.MakeApihubApiKeyEntity_deprecated(keyToCreate, apiKeyHash)
	err := t.apiKeyRepository.SaveApiKey_deprecated(apihubApiKeyEntity)
	if err != nil {
		return nil, err
	}

	if packageId != "*" {
		dataMap := map[string]interface{}{}
		dataMap["apiKeyId"] = apihubApiKeyEntity.Id
		dataMap["apiKeyName"] = apihubApiKeyEntity.Name
		dataMap["apiKeyRoleIds"] = apihubApiKeyEntity.Roles
		t.atService.TrackEvent(view.ActivityTrackingEvent{
			Type:      view.ATETGenerateApiKey,
			Data:      dataMap,
			PackageId: packageId, // Will not work for * case due to constraint in DB
			Date:      time.Now(),
			UserId:    ctx.GetUserId(),
		})
	}

	return &keyToCreate, nil
}

func (t apihubApiKeyServiceImpl) CreateApiKey_v3_deprecated(ctx context.SecurityContext, packageId, name string, requestRoles []string) (*view.ApihubApiKey_v3_deprecated, error) {
	// validate request roles first
	if len(requestRoles) > 0 {
		allRoles, err := t.roleRepository.GetAllRoles()
		if err != nil {
			return nil, err
		}
		existingIds := map[string]struct{}{}
		for _, role := range allRoles {
			existingIds[role.Id] = struct{}{}
		}
		for _, roleId := range requestRoles {
			if _, exists := existingIds[roleId]; !exists {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.RoleNotFound,
					Message: exception.RoleNotFoundMsg,
					Params:  map[string]interface{}{"role": roleId},
				}
			}
		}
	}

	var resultRoles []string

	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(packageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
		if packageEnt.DefaultRole == view.NoneRoleId && packageEnt.ParentId == "" {
			if !t.isSysadm(ctx) {
				return nil, &exception.CustomError{
					Status:  http.StatusForbidden,
					Code:    exception.InsufficientPrivileges,
					Message: exception.InsufficientPrivilegesMsg,
					Debug:   exception.PrivateWorkspaceNotModifiableMsg,
				}
			}
		}
		if len(requestRoles) > 0 {
			var availableRoles []entity.RoleEntity
			if t.isSysadm(ctx) {
				availableRoles, err = t.roleRepository.GetAllRoles()
				if err != nil {
					return nil, err
				}
			} else {
				availableRoles, err = t.roleRepository.GetAvailablePackageRoles(packageId, ctx.GetUserId())
				if err != nil {
					return nil, err
				}
			}
			// check requested roles against available for current user
			availableIds := map[string]struct{}{}
			for _, role := range availableRoles {
				availableIds[role.Id] = struct{}{}
			}
			for _, roleId := range requestRoles {
				if _, exists := availableIds[roleId]; !exists {
					// user do not have permission for the role
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.NotAvailableRole,
						Message: exception.NotAvailableRoleMsg,
						Params:  map[string]interface{}{"role": roleId},
					}
				}
			}
			// all request roles passed the check, so now we can add it to result
			resultRoles = append(resultRoles, requestRoles...)
		} else {
			if t.isSysadm(ctx) {
				resultRoles = append(resultRoles, view.SysadmRole)
			} else {
				userRoles, err := t.roleRepository.GetPackageRolesHierarchyForUser(packageId, ctx.GetUserId())
				if err != nil {
					return nil, err
				}
				for _, roleEnt := range userRoles {
					resultRoles = append(resultRoles, roleEnt.RoleId)
				}
				if len(resultRoles) == 0 {
					resultRoles = append(resultRoles, packageEnt.DefaultRole)
				}
			}
		}
	} else {
		if len(requestRoles) > 0 {
			resultRoles = append(resultRoles, requestRoles...) // set all request roles to result. Requester is sysadmin(requirements for *), so it's ok
		} else {
			resultRoles = append(resultRoles, view.SysadmRole) // request roles not set - fallback to sysadmin role to keep old behavior
		}
	}
	apiKey := crypto.CreateRandomHash()
	keyToCreate := view.ApihubApiKey{
		Id:         t.makeApiKeyId(),
		PackageId:  packageId,
		Name:       name,
		CreatedBy:  view.User{Id: ctx.GetUserId()},
		CreatedFor: &view.User{Id: ""},
		CreatedAt:  time.Now(),
		ApiKey:     apiKey,
		Roles:      resultRoles,
	}
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apihubApiKeyEntity := entity.MakeApihubApiKeyEntity(keyToCreate, apiKeyHash)
	err := t.apiKeyRepository.SaveApiKey(apihubApiKeyEntity)
	if err != nil {
		return nil, err
	}

	if packageId != "*" {
		dataMap := map[string]interface{}{}
		dataMap["apiKeyId"] = apihubApiKeyEntity.Id
		dataMap["apiKeyName"] = apihubApiKeyEntity.Name
		dataMap["apiKeyRoleIds"] = apihubApiKeyEntity.Roles
		t.atService.TrackEvent(view.ActivityTrackingEvent{
			Type:      view.ATETGenerateApiKey,
			Data:      dataMap,
			PackageId: packageId, // Will not work for * case due to constraint in DB
			Date:      time.Now(),
			UserId:    ctx.GetUserId(),
		})
	}
	createdEnt, err := t.apiKeyRepository.GetPackageApiKey_deprecated(keyToCreate.Id, packageId)
	if err != nil {
		return nil, err
	}
	if createdEnt == nil {
		return nil, fmt.Errorf("failed to get created api key")
	}

	apiKeyView := entity.MakeApihubApiKeyView_v3_deprecated(*createdEnt)
	apiKeyView.ApiKey = apiKey
	return apiKeyView, nil
}

func (t apihubApiKeyServiceImpl) CreateApiKey(ctx context.SecurityContext, packageId, name string, createdFor string, requestRoles []string) (*view.ApihubApiKey, error) {
	// validate request roles first
	if len(requestRoles) > 0 {
		allRoles, err := t.roleRepository.GetAllRoles()
		if err != nil {
			return nil, err
		}
		existingIds := map[string]struct{}{}
		for _, role := range allRoles {
			existingIds[role.Id] = struct{}{}
		}
		for _, roleId := range requestRoles {
			if _, exists := existingIds[roleId]; !exists {
				return nil, &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.RoleNotFound,
					Message: exception.RoleNotFoundMsg,
					Params:  map[string]interface{}{"role": roleId},
				}
			}
		}
	}

	var resultRoles []string

	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(packageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
		if packageEnt.DefaultRole == view.NoneRoleId && packageEnt.ParentId == "" {
			if !t.isSysadm(ctx) {
				return nil, &exception.CustomError{
					Status:  http.StatusForbidden,
					Code:    exception.InsufficientPrivileges,
					Message: exception.InsufficientPrivilegesMsg,
					Debug:   exception.PrivateWorkspaceNotModifiableMsg,
				}
			}
		}
		if len(requestRoles) > 0 {
			var availableRoles []entity.RoleEntity
			allRoles, err := t.roleRepository.GetAllRoles()
			if err != nil {
				return nil, err
			}
			if t.isSysadm(ctx) {
				availableRoles = allRoles
			} else if ctx.GetApikeyPackageId() == packageId || strings.HasPrefix(packageId, ctx.GetApikeyPackageId()+".") || ctx.GetApikeyPackageId() == "*" {
				maxRoleRank := -1
				for _, apikeyRoleId := range ctx.GetApikeyRoles() {
					for _, role := range allRoles {
						if apikeyRoleId == role.Id {
							if maxRoleRank < role.Rank {
								maxRoleRank = role.Rank
							}
						}
					}
				}
				for _, role := range allRoles {
					if maxRoleRank >= role.Rank {
						availableRoles = append(availableRoles, role)
					}
				}
			} else {
				availableRoles, err = t.roleRepository.GetAvailablePackageRoles(packageId, ctx.GetUserId())
				if err != nil {
					return nil, err
				}
			}
			// check requested roles against available for current user
			availableRoleIds := map[string]struct{}{}
			for _, role := range availableRoles {
				availableRoleIds[role.Id] = struct{}{}
			}
			for _, roleId := range requestRoles {
				if _, exists := availableRoleIds[roleId]; !exists {
					// user do not have permission for the role
					return nil, &exception.CustomError{
						Status:  http.StatusBadRequest,
						Code:    exception.NotAvailableRole,
						Message: exception.NotAvailableRoleMsg,
						Params:  map[string]interface{}{"role": roleId},
					}
				}
			}
			// all request roles passed the check, so now we can add it to result
			resultRoles = append(resultRoles, requestRoles...)
		} else {
			if t.isSysadm(ctx) {
				resultRoles = append(resultRoles, view.SysadmRole)
			} else {
				userRoles, err := t.roleRepository.GetPackageRolesHierarchyForUser(packageId, ctx.GetUserId())
				if err != nil {
					return nil, err
				}
				for _, roleEnt := range userRoles {
					resultRoles = append(resultRoles, roleEnt.RoleId)
				}
				if len(resultRoles) == 0 {
					resultRoles = append(resultRoles, packageEnt.DefaultRole)
				}
			}
		}
	} else {
		if len(requestRoles) > 0 {
			resultRoles = append(resultRoles, requestRoles...) // set all request roles to result. Requester is sysadmin(requirements for *), so it's ok
		} else {
			resultRoles = append(resultRoles, view.SysadmRole) // request roles not set - fallback to sysadmin role to keep old behavior
		}
	}

	existingApiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys(packageId)
	if err != nil {
		return nil, err
	}
	for _, existingApiKeyEntity := range existingApiKeyEntities {
		if existingApiKeyEntity.DeletedAt == nil && existingApiKeyEntity.ApihubApiKeyEntity.Name == name {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ApiKeyNameDuplicate,
				Message: exception.ApiKeyNameDuplicateMsg,
				Params:  map[string]interface{}{"name": name},
			}
		}
	}

	var createdForUser *view.User
	if createdFor != "" {
		createdForUser, err = t.userService.GetUserFromDB(createdFor)
		if err != nil {
			return nil, err
		}
		if createdForUser == nil {
			usersFromLdap, err := t.userService.SearchUsersInLdap(view.LdapSearchFilterReq{FilterToValue: map[string]string{view.SAMAccountName: createdFor}, Limit: 1}, true)
			if err != nil {
				return nil, err
			}
			if usersFromLdap == nil || len(usersFromLdap.Users) == 0 {
				return nil, &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.UserNotFound,
					Message: exception.UserNotFoundMsg,
					Params:  map[string]interface{}{"userId": createdFor},
				}
			}
			user := usersFromLdap.Users[0]
			err = t.userService.StoreUserAvatar(user.Id, user.Avatar)
			if err != nil {
				return nil, err
			}
			externalUser := view.User{
				Id:        user.Id,
				Name:      user.Name,
				Email:     user.Email,
				AvatarUrl: fmt.Sprintf("/api/v2/users/%s/profile/avatar", user.Id),
			}
			createdForUser, err = t.userService.GetOrCreateUserForIntegration(externalUser, view.ExternalLdapIntegration)
			if err != nil {
				return nil, err
			}
		}
	}

	apiKey := crypto.CreateRandomHash()
	keyToCreate := view.ApihubApiKey{
		Id:         t.makeApiKeyId(),
		PackageId:  packageId,
		Name:       name,
		CreatedBy:  view.User{Id: ctx.GetUserId()},
		CreatedFor: createdForUser,
		CreatedAt:  time.Now(),
		ApiKey:     apiKey,
		Roles:      resultRoles,
	}
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apihubApiKeyEntity := entity.MakeApihubApiKeyEntity(keyToCreate, apiKeyHash)
	err = t.apiKeyRepository.SaveApiKey(apihubApiKeyEntity)
	if err != nil {
		return nil, err
	}

	if packageId != "*" {
		dataMap := map[string]interface{}{}
		dataMap["apiKeyId"] = apihubApiKeyEntity.Id
		dataMap["apiKeyName"] = apihubApiKeyEntity.Name
		dataMap["apiKeyRoleIds"] = apihubApiKeyEntity.Roles
		t.atService.TrackEvent(view.ActivityTrackingEvent{
			Type:      view.ATETGenerateApiKey,
			Data:      dataMap,
			PackageId: packageId, // Will not work for * case due to constraint in DB
			Date:      time.Now(),
			UserId:    ctx.GetUserId(),
		})
	}
	createdEnt, err := t.apiKeyRepository.GetPackageApiKey(keyToCreate.Id, packageId)
	if err != nil {
		return nil, err
	}
	if createdEnt == nil {
		return nil, fmt.Errorf("failed to get created api key")
	}

	apiKeyView := entity.MakeApihubApiKeyView(*createdEnt)
	apiKeyView.ApiKey = apiKey
	return apiKeyView, nil
}

func (t apihubApiKeyServiceImpl) RevokePackageApiKey(ctx context.SecurityContext, apiKeyId string, packageId string) error {
	apiKeyEntity, err := t.apiKeyRepository.GetPackageApiKey(apiKeyId, packageId)
	if err != nil {
		return err
	}
	if apiKeyEntity == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageApiKeyNotFound,
			Message: exception.PackageApiKeyNotFoundMsg,
			Params:  map[string]interface{}{"apiKeyId": apiKeyId, "packageId": packageId},
		}
	}
	if apiKeyEntity.DeletedAt != nil || apiKeyEntity.DeletedBy != "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageApiKeyAlreadyRevoked,
			Message: exception.PackageApiKeyAlreadyRevokedMsg,
			Params:  map[string]interface{}{"apiKeyId": apiKeyId, "packageId": packageId},
		}
	}
	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(packageId)
		if err != nil {
			return err
		}
		if packageEnt == nil {
			return &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
		if packageEnt.DefaultRole == view.NoneRoleId && packageEnt.ParentId == "" {
			if !t.isSysadm(ctx) {
				return &exception.CustomError{
					Status:  http.StatusForbidden,
					Code:    exception.InsufficientPrivileges,
					Message: exception.InsufficientPrivilegesMsg,
					Debug:   exception.PrivateWorkspaceNotModifiableMsg,
				}
			}
		}
	}

	err = t.apiKeyRepository.RevokeApiKey(apiKeyId, ctx.GetUserId())
	if err != nil {
		return err
	}
	dataMap := map[string]interface{}{}
	dataMap["apiKeyId"] = apiKeyEntity.Id
	dataMap["apiKeyName"] = apiKeyEntity.Name
	dataMap["apiKeyRoleIds"] = apiKeyEntity.Roles
	t.atService.TrackEvent(view.ActivityTrackingEvent{
		Type:      view.ATETRevokeApiKey,
		Data:      dataMap,
		PackageId: apiKeyEntity.PackageId,
		Date:      time.Now(),
		UserId:    ctx.GetUserId(),
	})
	return nil
}

func (t apihubApiKeyServiceImpl) GetProjectApiKeys_deprecated(packageId string) (*view.ApihubApiKeys_deprecated, error) {
	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(packageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
	}
	apiKeys := make([]view.ApihubApiKey_deprecated, 0)
	apiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys_deprecated(packageId)
	if err != nil {
		return nil, err
	}
	for _, apiKeyEntity := range apiKeyEntities {
		if apiKeyEntity.DeletedAt == nil {
			apiKeys = append(apiKeys, *entity.MakeApihubApiKeyView_deprecated(apiKeyEntity))
		}
	}
	return &view.ApihubApiKeys_deprecated{ApiKeys: apiKeys}, nil
}

func (t apihubApiKeyServiceImpl) GetProjectApiKeys_v3_deprecated(packageId string) (*view.ApihubApiKeys_v3_deprecated, error) {
	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(packageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
	}
	apiKeys := make([]view.ApihubApiKey_v3_deprecated, 0)
	apiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys_v3_deprecated(packageId)
	if err != nil {
		return nil, err
	}
	for _, apiKeyEntity := range apiKeyEntities {
		if apiKeyEntity.DeletedAt == nil {
			apiKeys = append(apiKeys, *entity.MakeApihubApiKeyView_v3_deprecated(apiKeyEntity))
		}
	}
	return &view.ApihubApiKeys_v3_deprecated{ApiKeys: apiKeys}, nil
}
func (t apihubApiKeyServiceImpl) GetProjectApiKeys(packageId string) (*view.ApihubApiKeys, error) {
	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(packageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.PackageNotFound,
				Message: exception.PackageNotFoundMsg,
				Params:  map[string]interface{}{"packageId": packageId},
			}
		}
	}
	apiKeys := make([]view.ApihubApiKey, 0)
	apiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys(packageId)
	if err != nil {
		return nil, err
	}
	for _, apiKeyEntity := range apiKeyEntities {
		if apiKeyEntity.DeletedAt == nil {
			apiKeys = append(apiKeys, *entity.MakeApihubApiKeyView(apiKeyEntity))
		}
	}
	return &view.ApihubApiKeys{ApiKeys: apiKeys}, nil
}

func (t apihubApiKeyServiceImpl) GetApiKeyStatus(apiKey string, packageId string) (bool, *view.ApihubApiKey, error) {
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apiKeyEnt, err := t.apiKeyRepository.GetApiKeyByHash(apiKeyHash)
	if err != nil {
		return false, nil, err
	}
	if apiKeyEnt == nil {
		//apiKey doesn't exist
		return false, nil, nil
	}
	apiKeyUserEnt := entity.ApihubApiKeyUserEntity{ApihubApiKeyEntity: *apiKeyEnt}
	if apiKeyEnt.DeletedAt != nil {
		//apiKey exists but it was revoked
		return true, entity.MakeApihubApiKeyView(apiKeyUserEnt), nil
	}

	if apiKeyEnt.PackageId != "*" && apiKeyEnt.PackageId != packageId && !strings.HasPrefix(packageId, apiKeyEnt.PackageId+".") {
		return false, nil, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		}
	}
	//apiKey exists
	return false, entity.MakeApihubApiKeyView(apiKeyUserEnt), nil
}

func (t apihubApiKeyServiceImpl) GetApiKeyByKey(apiKey string) (*view.ApihubApiKeyExtAuthView, error) {
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apiKeyEnt, err := t.apiKeyRepository.GetApiKeyByHash(apiKeyHash)
	if err != nil {
		return nil, err
	}
	if apiKeyEnt == nil {
		//apiKey doesn't exist
		return nil, nil
	}
	return &view.ApihubApiKeyExtAuthView{
		Id:        apiKeyEnt.Id,
		PackageId: apiKeyEnt.PackageId,
		Name:      apiKeyEnt.Name,
		Revoked:   apiKeyEnt.DeletedAt != nil,
		Roles:     apiKeyEnt.Roles,
	}, nil
}

func (t apihubApiKeyServiceImpl) GetApiKeyById(apiKeyId string) (*view.ApihubApiKeyExtAuthView, error) {
	apiKeyEnt, err := t.apiKeyRepository.GetApiKey(apiKeyId)
	if err != nil {
		return nil, err
	}
	if apiKeyEnt == nil {
		//apiKey doesn't exist
		return nil, nil
	}
	return &view.ApihubApiKeyExtAuthView{
		Id:        apiKeyEnt.Id,
		PackageId: apiKeyEnt.PackageId,
		Name:      apiKeyEnt.Name,
		Revoked:   apiKeyEnt.DeletedAt != nil,
		Roles:     apiKeyEnt.Roles,
	}, nil
}

func (t apihubApiKeyServiceImpl) CreateSystemApiKey(apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("system api key must not be empty")
	}

	packageId, apiKeyName := "*", "system_api_key"
	resultRoles := []string{view.SysadmRole}

	existingKey, err := t.GetApiKeyByKey(apiKey)
	if err != nil {
		return err
	}
	if existingKey != nil {
		log.Info("provided system api key already exists")
		return nil
	} else {
		log.Debug("system api key not found, creating new")

		email := os.Getenv(APIHUB_ADMIN_EMAIL)
		adminUser, err := t.userService.GetUserByEmail(email)
		if err != nil {
			return err
		}
		if adminUser == nil {
			return fmt.Errorf("failed to generate system api key: no sysadm user has found")
		}

		keyToCreate := view.ApihubApiKey{
			Id:         t.makeApiKeyId(),
			PackageId:  packageId,
			Name:       apiKeyName,
			CreatedBy:  view.User{Id: adminUser.Id},
			CreatedFor: nil,
			CreatedAt:  time.Now(),
			ApiKey:     apiKey,
			Roles:      resultRoles,
		}
		apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
		apihubApiKeyEntity := entity.MakeApihubApiKeyEntity(keyToCreate, apiKeyHash)
		err = t.apiKeyRepository.SaveApiKey(apihubApiKeyEntity)
		if err != nil {
			return err
		}
		log.Info("new system api key has been created")

		existingApiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys(packageId)
		if err != nil {
			return err
		}
		for _, existingApiKeyEntity := range existingApiKeyEntities {
			if existingApiKeyEntity.DeletedAt == nil &&
				existingApiKeyEntity.ApihubApiKeyEntity.Name == apiKeyName &&
				existingApiKeyEntity.Id != apihubApiKeyEntity.Id {
				err = t.RevokePackageApiKey(context.CreateFromId(adminUser.Id), existingApiKeyEntity.Id, packageId)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (t apihubApiKeyServiceImpl) makeApiKeyId() string {
	return API_KEY_PREFIX + uuid.New().String()
}
