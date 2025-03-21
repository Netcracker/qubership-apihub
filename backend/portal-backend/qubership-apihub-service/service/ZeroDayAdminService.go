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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type ZeroDayAdminService interface {
	CreateZeroDayAdmin() error
}

func NewZeroDayAdminService(userService UserService, roleService RoleService, repo repository.UserRepository, systemInfoService SystemInfoService) ZeroDayAdminService {
	return &zeroDayAdminServiceImpl{
		userService:       userService,
		roleService:       roleService,
		repo:              repo,
		systemInfoService: systemInfoService,
	}
}

type zeroDayAdminServiceImpl struct {
	userService       UserService
	roleService       RoleService
	repo              repository.UserRepository
	systemInfoService SystemInfoService
}

func (a zeroDayAdminServiceImpl) CreateZeroDayAdmin() error {
	email, password, err := a.systemInfoService.GetZeroDayAdminCreds()
	if err != nil {
		return fmt.Errorf("CreateZeroDayAdmin: credentials error: %w, admin will not be created", err)
	}

	user, _ := a.userService.GetUserByEmail(email)
	if user != nil {
		_, err := a.userService.AuthenticateUser(email, password)
		if err != nil {
			passwordHash, err := createBcryptHashedPassword(password)
			if err != nil {
				return err
			}
			err = a.repo.UpdateUserPassword(user.Id, passwordHash)
			if err != nil {
				return err
			}
			log.Infof("CreateZeroDayAdmin: password is updated for system admin user")
		} else {
			log.Infof("CreateZeroDayAdmin: system admin user is already present")
		}
	} else {
		user, err := a.userService.CreateInternalUser(
			&view.InternalUser{
				Email:    email,
				Password: password,
			},
		)
		if err != nil {
			return err
		}

		_, err = a.roleService.AddSystemAdministrator(user.Id)
		if err != nil {
			return err
		}
		log.Infof("CreateZeroDayAdmin: system admin user '%s' has been created", email)
	}
	return nil
}
