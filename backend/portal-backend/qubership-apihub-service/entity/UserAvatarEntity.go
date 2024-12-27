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

import "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

type UserAvatarEntity struct {
	tableName struct{} `pg:"user_avatar_data"`

	Id       string   `pg:"user_id, pk, type:varchar"`
	Avatar   []byte   `pg:"avatar, type:bytea"`
	Checksum [32]byte `pg:"checksum, type:bytea"`
}

func MakeUserAvatarEntity(avatarView *view.UserAvatar) *UserAvatarEntity {
	return &UserAvatarEntity{
		Id:       avatarView.Id,
		Avatar:   avatarView.Avatar,
		Checksum: avatarView.Checksum,
	}
}

func MakeUserAvatarView(avatarEntity *UserAvatarEntity) *view.UserAvatar {
	return &view.UserAvatar{
		Id:       avatarEntity.Id,
		Avatar:   avatarEntity.Avatar,
		Checksum: avatarEntity.Checksum,
	}
}
