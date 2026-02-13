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

func MakeExtendedUserView_deprecated(userEntity *UserEntity, gitIntegrationStatus bool, systemRole string, ttlSeconds *int) *view.ExtendedUser_deprecated {
	return &view.ExtendedUser_deprecated{
		User: view.User{
			Id:        userEntity.Id,
			Name:      userEntity.Username,
			Email:     userEntity.Email,
			AvatarUrl: userEntity.AvatarUrl,
		},
		GitIntegrationStatus:  gitIntegrationStatus,
		SystemRole:            systemRole,
		AccessTokenTTLSeconds: ttlSeconds,
	}
}

func MakeExtendedUserView(userEntity *UserEntity, systemRole string, ttlSeconds *int) *view.ExtendedUser {
	return &view.ExtendedUser{
		User: view.User{
			Id:        userEntity.Id,
			Name:      userEntity.Username,
			Email:     userEntity.Email,
			AvatarUrl: userEntity.AvatarUrl,
		},
		SystemRole:            systemRole,
		AccessTokenTTLSeconds: ttlSeconds,
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
