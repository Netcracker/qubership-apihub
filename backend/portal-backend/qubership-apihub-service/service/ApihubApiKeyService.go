package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/crypto"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type ApihubApiKeyService interface {
	CreateApiKey(ctx context.Context, packageId, name string, createdFor string, requestRoles []string) (*view.ApihubApiKey, error)
	RevokePackageApiKey(ctx context.Context, apiKeyId string, packageId string) error
	GetProjectApiKeys(ctx context.Context, packageId string) (*view.ApihubApiKeys, error)
	GetApiKeyStatus(ctx context.Context, apiKey string) (bool, *view.ApihubApiKey, error)
	GetApiKeyByKey(ctx context.Context, apiKey string) (*view.ApihubApiKeyExtAuthView, error)
	GetApiKeyById(ctx context.Context, apiKeyId string) (*view.ApihubApiKeyExtAuthView, error)
	CreateSystemApiKey(ctx context.Context) error
}

func NewApihubApiKeyService(apihubApiKeyRepository repository.ApihubApiKeyRepository,
	publishedRepo repository.PublishedRepository,
	atService ActivityTrackingService,
	userService UserService,
	roleRepository repository.RoleRepository,
	systemInfoService SystemInfoService) ApihubApiKeyService {

	return &apihubApiKeyServiceImpl{
		apiKeyRepository:  apihubApiKeyRepository,
		publishedRepo:     publishedRepo,
		atService:         atService,
		userService:       userService,
		roleRepository:    roleRepository,
		systemInfoService: systemInfoService,
	}
}

type apihubApiKeyServiceImpl struct {
	apiKeyRepository  repository.ApihubApiKeyRepository
	publishedRepo     repository.PublishedRepository
	atService         ActivityTrackingService
	userService       UserService
	roleRepository    repository.RoleRepository
	systemInfoService SystemInfoService
}

const API_KEY_PREFIX = "api-key_"

func (t apihubApiKeyServiceImpl) CreateApiKey(ctx context.Context, packageId, name string, createdFor string, requestRoles []string) (*view.ApihubApiKey, error) {
	// validate request roles first
	if len(requestRoles) > 0 {
		allRoles, err := t.roleRepository.GetAllRoles(ctx)
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
		packageEnt, err := t.publishedRepo.GetPackage(ctx, packageId)
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
			if !secctx.IsSysadm(ctx) {
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
			allRoles, err := t.roleRepository.GetAllRoles(ctx)
			if err != nil {
				return nil, err
			}
			if secctx.IsSysadm(ctx) {
				availableRoles = allRoles
			} else if secctx.GetApiKeyPackageId(ctx) == packageId || strings.HasPrefix(packageId, secctx.GetApiKeyPackageId(ctx)+".") || secctx.GetApiKeyPackageId(ctx) == "*" {
				maxRoleRank := -1
				for _, apikeyRoleId := range secctx.GetApiKeyRoles(ctx) {
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
				availableRoles, err = t.roleRepository.GetAvailablePackageRoles(ctx, packageId, secctx.GetUserId(ctx))
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
			if secctx.IsSysadm(ctx) {
				resultRoles = append(resultRoles, view.SysadmRole)
			} else {
				userRoles, err := t.roleRepository.GetPackageRolesHierarchyForUser(ctx, packageId, secctx.GetUserId(ctx))
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

	existingApiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys(ctx, packageId)
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
		createdForUser, err = t.userService.GetUserFromDB(ctx, createdFor)
		if err != nil {
			return nil, err
		}
		if createdForUser == nil {
			usersFromLdap, err := t.userService.SearchUsersInLdap(ctx, view.LdapSearchFilterReq{FilterToValue: map[string]string{view.SAMAccountName: createdFor}, Limit: 1}, true)
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
			err = t.userService.StoreUserAvatar(ctx, user.Id, user.Avatar)
			if err != nil {
				return nil, err
			}
			externalUser := view.User{
				Id:        user.Id,
				Name:      user.Name,
				Email:     user.Email,
				AvatarUrl: fmt.Sprintf("/api/v2/users/%s/profile/avatar", user.Id),
			}
			createdForUser, err = t.userService.GetOrCreateUserForIntegration(ctx, externalUser, view.ExternalLdapIntegration, "")
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
		CreatedBy:  view.User{Id: secctx.GetUserId(ctx)},
		CreatedFor: createdForUser,
		CreatedAt:  time.Now(),
		ApiKey:     apiKey,
		Roles:      resultRoles,
	}
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apihubApiKeyEntity := entity.MakeApihubApiKeyEntity(keyToCreate, apiKeyHash)
	err = t.apiKeyRepository.SaveApiKey(ctx, apihubApiKeyEntity)
	if err != nil {
		return nil, err
	}

	if packageId != "*" {
		dataMap := map[string]interface{}{}
		dataMap["apiKeyId"] = apihubApiKeyEntity.Id
		dataMap["apiKeyName"] = apihubApiKeyEntity.Name
		dataMap["apiKeyRoleIds"] = apihubApiKeyEntity.Roles
		t.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
			Type:      view.ATETGenerateApiKey,
			Data:      dataMap,
			PackageId: packageId, // Will not work for * case due to constraint in DB
			Date:      time.Now(),
			UserId:    secctx.GetUserId(ctx),
		})
	}
	createdEnt, err := t.apiKeyRepository.GetPackageApiKey(ctx, keyToCreate.Id, packageId)
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

func (t apihubApiKeyServiceImpl) RevokePackageApiKey(ctx context.Context, apiKeyId string, packageId string) error {
	apiKeyEntity, err := t.apiKeyRepository.GetPackageApiKey(ctx, apiKeyId, packageId)
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
		packageEnt, err := t.publishedRepo.GetPackage(ctx, packageId)
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
			if !secctx.IsSysadm(ctx) {
				return &exception.CustomError{
					Status:  http.StatusForbidden,
					Code:    exception.InsufficientPrivileges,
					Message: exception.InsufficientPrivilegesMsg,
					Debug:   exception.PrivateWorkspaceNotModifiableMsg,
				}
			}
		}
	}

	err = t.apiKeyRepository.RevokeApiKey(ctx, apiKeyId, secctx.GetUserId(ctx))
	if err != nil {
		return err
	}
	dataMap := map[string]interface{}{}
	dataMap["apiKeyId"] = apiKeyEntity.Id
	dataMap["apiKeyName"] = apiKeyEntity.Name
	dataMap["apiKeyRoleIds"] = apiKeyEntity.Roles
	t.atService.TrackEvent(ctx, view.ActivityTrackingEvent{
		Type:      view.ATETRevokeApiKey,
		Data:      dataMap,
		PackageId: apiKeyEntity.PackageId,
		Date:      time.Now(),
		UserId:    secctx.GetUserId(ctx),
	})
	return nil
}

func (t apihubApiKeyServiceImpl) GetProjectApiKeys(ctx context.Context, packageId string) (*view.ApihubApiKeys, error) {
	if packageId != "*" {
		packageEnt, err := t.publishedRepo.GetPackage(ctx, packageId)
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
	apiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys(ctx, packageId)
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

func (t apihubApiKeyServiceImpl) GetApiKeyStatus(ctx context.Context, apiKey string) (bool, *view.ApihubApiKey, error) {
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apiKeyEnt, err := t.apiKeyRepository.GetApiKeyByHash(ctx, apiKeyHash)
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

	//apiKey exists
	return false, entity.MakeApihubApiKeyView(apiKeyUserEnt), nil
}

func (t apihubApiKeyServiceImpl) GetApiKeyByKey(ctx context.Context, apiKey string) (*view.ApihubApiKeyExtAuthView, error) {
	apiKeyHash := crypto.CreateSHA256Hash([]byte(apiKey))
	apiKeyEnt, err := t.apiKeyRepository.GetApiKeyByHash(ctx, apiKeyHash)
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

func (t apihubApiKeyServiceImpl) GetApiKeyById(ctx context.Context, apiKeyId string) (*view.ApihubApiKeyExtAuthView, error) {
	apiKeyEnt, err := t.apiKeyRepository.GetApiKey(ctx, apiKeyId)
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

func (t apihubApiKeyServiceImpl) CreateSystemApiKey(ctx context.Context) error {
	apiKey := t.systemInfoService.GetSystemApiKey()

	packageId, apiKeyName := "*", "system_api_key"
	resultRoles := []string{view.SysadmRole}

	existingKey, err := t.GetApiKeyByKey(ctx, apiKey)
	if err != nil {
		return err
	}
	if existingKey != nil {
		log.Info("System api key already exists")
		return nil
	} else {
		log.Debug("System api key not found, creating new")

		email, _ := t.systemInfoService.GetZeroDayAdminCreds()
		adminUser, err := t.userService.GetUserByEmail(ctx, email)
		if err != nil {
			return err
		}
		if adminUser == nil {
			return fmt.Errorf("failed to create system api key: system admin user is not found")
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
		err = t.apiKeyRepository.SaveApiKey(ctx, apihubApiKeyEntity)
		if err != nil {
			return err
		}
		log.Info("New system api key has been created")

		existingApiKeyEntities, err := t.apiKeyRepository.GetPackageApiKeys(ctx, packageId)
		if err != nil {
			return err
		}
		for _, existingApiKeyEntity := range existingApiKeyEntities {
			if existingApiKeyEntity.DeletedAt == nil &&
				existingApiKeyEntity.ApihubApiKeyEntity.Name == apiKeyName &&
				existingApiKeyEntity.Id != apihubApiKeyEntity.Id {
				err = t.RevokePackageApiKey(secctx.CreateFromId(ctx, adminUser.Id), existingApiKeyEntity.Id, packageId)
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
