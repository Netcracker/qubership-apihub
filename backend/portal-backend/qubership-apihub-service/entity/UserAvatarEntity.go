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
