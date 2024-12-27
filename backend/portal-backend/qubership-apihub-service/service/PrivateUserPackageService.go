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
	"strconv"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/gosimple/slug"
)

type PrivateUserPackageService interface {
	GenerateUserPrivatePackageId(userId string) (string, error)
	CreatePrivateUserPackage(ctx context.SecurityContext, userId string) (*view.SimplePackage, error)
	GetPrivateUserPackage(userId string) (*view.SimplePackage, error)
	PrivatePackageIdIsTaken(packageId string) (bool, error)
}

func NewPrivateUserPackageService(
	publishedRepo repository.PublishedRepository,
	userRepo repository.UserRepository,
	roleRepository repository.RoleRepository,
	favoritesRepo repository.FavoritesRepository,
) PrivateUserPackageService {
	return &privateUserPackageServiceImpl{
		publishedRepo:  publishedRepo,
		userRepo:       userRepo,
		roleRepository: roleRepository,
		favoritesRepo:  favoritesRepo,
	}
}

type privateUserPackageServiceImpl struct {
	publishedRepo  repository.PublishedRepository
	userRepo       repository.UserRepository
	roleRepository repository.RoleRepository
	favoritesRepo  repository.FavoritesRepository
}

func (p privateUserPackageServiceImpl) GenerateUserPrivatePackageId(userId string) (string, error) {
	userIdSlug := slug.Make(userId)
	privatePackageId := userIdSlug
	privatePackageIdTaken, err := p.userRepo.PrivatePackageIdExists(privatePackageId)
	if err != nil {
		return "", err
	}
	i := 1
	for privatePackageIdTaken {
		privatePackageId = userIdSlug + "-" + strconv.Itoa(i)
		privatePackageIdTaken, err = p.userRepo.PrivatePackageIdExists(privatePackageId)
		if err != nil {
			return "", err
		}
		i++
	}
	packageEnt, err := p.publishedRepo.GetPackageIncludingDeleted(privatePackageId)
	if err != nil {
		return "", err
	}
	for packageEnt != nil {
		i++
		privatePackageId = userIdSlug + "-" + strconv.Itoa(i)
		packageEnt, err = p.publishedRepo.GetPackageIncludingDeleted(privatePackageId)
		if err != nil {
			return "", err
		}
	}
	return privatePackageId, nil
}

func (p privateUserPackageServiceImpl) CreatePrivateUserPackage(ctx context.SecurityContext, userId string) (*view.SimplePackage, error) {
	userEnt, err := p.userRepo.GetUserById(userId)
	if err != nil {
		return nil, err
	}
	if userEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		}
	}
	packageEnt, err := p.publishedRepo.GetPackageIncludingDeleted(userEnt.PrivatePackageId)
	if err != nil {
		return nil, err
	}
	if packageEnt != nil {
		if packageEnt.DeletedAt != nil {
			// restore workspace package
			packageEnt.DeletedAt = nil
			packageEnt.DeletedBy = ""
			resEnt, err := p.publishedRepo.UpdatePackage(packageEnt)
			if err != nil {
				return nil, err
			}
			userPermissions, err := p.roleRepository.GetUserPermissions(packageEnt.Id, userId)
			if err != nil {
				return nil, err
			}
			return entity.MakeSimplePackageView(resEnt, nil, false, userPermissions), nil
		} else {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.SinglePrivatePackageAllowed,
				Message: exception.SinglePrivatePackageAllowedMsg,
			}
		}
	}
	newPrivatePackageEnt := &entity.PackageEntity{
		Id:                userEnt.PrivatePackageId,
		Kind:              entity.KIND_WORKSPACE,
		Name:              fmt.Sprintf(`%v's private workspace`, userEnt.Username),
		ParentId:          "",
		Alias:             userEnt.PrivatePackageId,
		DefaultRole:       view.NoneRoleId,
		ExcludeFromSearch: true,
		CreatedAt:         time.Now(),
		CreatedBy:         ctx.GetUserId(),
	}
	userRoleIds := []string{view.AdminRoleId}
	userPackageMemberEnt := &entity.PackageMemberRoleEntity{
		PackageId: userEnt.PrivatePackageId,
		UserId:    userEnt.Id,
		Roles:     userRoleIds,
		CreatedAt: time.Now(),
		CreatedBy: ctx.GetUserId(),
	}
	err = p.publishedRepo.CreatePrivatePackageForUser(newPrivatePackageEnt, userPackageMemberEnt)
	if err != nil {
		return nil, err
	}

	userPermissions, err := p.roleRepository.GetUserPermissions(newPrivatePackageEnt.Id, userId)
	if err != nil {
		return nil, err
	}

	return entity.MakeSimplePackageView(newPrivatePackageEnt, nil, false, userPermissions), nil
}

func (p privateUserPackageServiceImpl) GetPrivateUserPackage(userId string) (*view.SimplePackage, error) {
	userEnt, err := p.userRepo.GetUserById(userId)
	if err != nil {
		return nil, err
	}
	if userEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.UserNotFound,
			Message: exception.UserNotFoundMsg,
			Params:  map[string]interface{}{"userId": userId},
		}
	}
	packageEnt, err := p.publishedRepo.GetPackage(userEnt.PrivatePackageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PrivateWorkspaceIdDoesntExist,
			Message: exception.PrivateWorkspaceIdDoesntExistMsg,
			Params:  map[string]interface{}{"userId": userId},
		}
	}
	userPermissions, err := p.roleRepository.GetUserPermissions(packageEnt.Id, userId)
	if err != nil {
		return nil, err
	}
	isFavorite, err := p.favoritesRepo.IsFavoritePackage(userId, packageEnt.Id)
	if err != nil {
		return nil, err
	}
	return entity.MakeSimplePackageView(packageEnt, nil, isFavorite, userPermissions), nil
}

func (p privateUserPackageServiceImpl) PrivatePackageIdIsTaken(packageId string) (bool, error) {
	privatePackageIdReserved, err := p.userRepo.PrivatePackageIdExists(packageId)
	if err != nil {
		return false, err
	}
	if privatePackageIdReserved {
		return true, nil
	}
	packageEnt, err := p.publishedRepo.GetPackageIncludingDeleted(packageId)
	if err != nil {
		return false, err
	}
	if packageEnt != nil {
		return true, nil
	}
	return false, nil
}
