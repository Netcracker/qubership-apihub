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

package repository

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type UserRepository interface {
	SaveExternalUser(userEntity *entity.UserEntity, externalIdentity *entity.ExternalIdentityEntity) error
	SaveInternalUser(entity *entity.UserEntity) (bool, error)
	GetUserById(userId string) (*entity.UserEntity, error)
	GetUserByEmail(email string) (*entity.UserEntity, error)
	GetUsers(usersListReq view.UsersListReq) ([]entity.UserEntity, error)
	GetUsersByIds(userIds []string) ([]entity.UserEntity, error)
	GetUsersByEmails(emails []string) ([]entity.UserEntity, error)
	GetUserAvatar(userId string) (*entity.UserAvatarEntity, error)
	SaveUserAvatar(entity *entity.UserAvatarEntity) error
	GetUserExternalIdentity(provider string, externalId string) (*entity.ExternalIdentityEntity, error)
	UpdateUserInfo(user *entity.UserEntity) error
	UpdateUserPassword(userId string, passwordHash []byte) error
	ClearUserPassword(userId string) error
	UpdateUserExternalIdentity(provider string, externalId string, internalId string) error
	PrivatePackageIdExists(privatePackageId string) (bool, error)
}
