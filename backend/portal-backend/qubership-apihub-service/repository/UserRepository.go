package repository

import (
	"context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type UserRepository interface {
	SaveExternalUser(ctx context.Context, userEntity *entity.UserEntity, externalIdentity *entity.ExternalIdentityEntity) error
	SaveInternalUser(ctx context.Context, entity *entity.UserEntity) (bool, error)
	GetUserById(ctx context.Context, userId string) (*entity.UserEntity, error)
	GetUserByEmail(ctx context.Context, email string) (*entity.UserEntity, error)
	GetUsers(ctx context.Context, usersListReq view.UsersListReq) ([]entity.UserEntity, error)
	GetUsersByIds(ctx context.Context, userIds []string) ([]entity.UserEntity, error)
	GetUsersByEmails(ctx context.Context, emails []string) ([]entity.UserEntity, error)
	GetUserAvatar(ctx context.Context, userId string) (*entity.UserAvatarEntity, error)
	SaveUserAvatar(ctx context.Context, entity *entity.UserAvatarEntity) error
	GetUserExternalIdentity(ctx context.Context, providerType string, providerId string, externalId string) (*entity.ExternalIdentityEntity, error)
	UpdateUserInfo(ctx context.Context, user *entity.UserEntity) error
	UpdateUserPassword(ctx context.Context, userId string, passwordHash []byte) error
	ClearUserPassword(ctx context.Context, userId string) error
	UpdateUserExternalIdentity(ctx context.Context, providerType string, providerId string, externalId string, internalId string) error
	PrivatePackageIdExists(ctx context.Context, privatePackageId string) (bool, error)
}
