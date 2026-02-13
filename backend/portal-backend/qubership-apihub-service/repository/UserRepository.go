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
	GetUserExternalIdentity(providerType string, providerId string, externalId string) (*entity.ExternalIdentityEntity, error)
	UpdateUserInfo(user *entity.UserEntity) error
	UpdateUserPassword(userId string, passwordHash []byte) error
	ClearUserPassword(userId string) error
	UpdateUserExternalIdentity(providerType string, providerId string, externalId string, internalId string) error
	PrivatePackageIdExists(privatePackageId string) (bool, error)
}
