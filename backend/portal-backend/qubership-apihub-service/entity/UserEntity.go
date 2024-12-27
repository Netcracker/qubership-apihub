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

package entity

import (
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type UserEntity struct {
	tableName struct{} `pg:"user_data, alias:user_data"`

	Id               string `pg:"user_id, pk, type:varchar"`
	Username         string `pg:"name, type:varchar"`
	Email            string `pg:"email, type:varchar"`
	AvatarUrl        string `pg:"avatar_url, type:varchar"`
	Password         []byte `pg:"password, type:bytea"`
	PrivatePackageId string `pg:"private_package_id, type:varchar"`
}

func MakeUserView(userEntity *UserEntity) *view.User {
	return &view.User{
		Id:        userEntity.Id,
		Name:      userEntity.Username,
		Email:     userEntity.Email,
		AvatarUrl: userEntity.AvatarUrl,
	}
}

func MakeUserV2View(userEntity *UserEntity) *view.User {
	return &view.User{
		Id:        userEntity.Id,
		Name:      userEntity.Username,
		Email:     userEntity.Email,
		AvatarUrl: userEntity.AvatarUrl,
	}
}

func MakeExternalUserEntity(userView *view.User, privatePackageId string) *UserEntity {
	return &UserEntity{
		Id:               userView.Id,
		Username:         userView.Name,
		Email:            strings.ToLower(userView.Email),
		AvatarUrl:        userView.AvatarUrl,
		PrivatePackageId: privatePackageId,
	}
}

func MakeInternalUserEntity(internalUser *view.InternalUser, password []byte, privatePackageId string) *UserEntity {
	return &UserEntity{
		Id:               internalUser.Id,
		Username:         internalUser.Name,
		Email:            strings.ToLower(internalUser.Email),
		AvatarUrl:        "", //todo maybe some hardcoded url for all internal users?
		Password:         password,
		PrivatePackageId: privatePackageId,
	}
}
