package repository

import (
	"context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
)

func NewUserRepositoryPG(cp db.ConnectionProvider) (UserRepository, error) {
	return &userRepositoryImpl{cp: cp}, nil
}

type userRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (u userRepositoryImpl) SaveUserAvatar(ctx context.Context, entity *entity.UserAvatarEntity) error {
	_, err := u.cp.GetConnection().WithContext(ctx).Model(entity).
		OnConflict("(\"user_id\") DO UPDATE").
		Insert()
	return err
}

func (u userRepositoryImpl) GetUserAvatar(ctx context.Context, userId string) (*entity.UserAvatarEntity, error) {
	result := new(entity.UserAvatarEntity)
	err := u.cp.GetConnection().WithContext(ctx).Model(result).
		Where("user_id = ?", userId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (u userRepositoryImpl) SaveExternalUser(ctx context.Context, userEntity *entity.UserEntity, externalIdentity *entity.ExternalIdentityEntity) error {
	err := u.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(userEntity).
			OnConflict("(email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password").
			Insert()
		if err != nil {
			return err
		}
		_, err = tx.Model(externalIdentity).
			OnConflict("(provider, provider_id, external_id) DO UPDATE").
			Insert()
		return err
	})
	if err != nil {
		return err
	}
	return nil
}

func (u userRepositoryImpl) SaveInternalUser(ctx context.Context, entity *entity.UserEntity) (bool, error) {
	result, err := u.cp.GetConnection().WithContext(ctx).Model(entity).
		OnConflict("(email) DO NOTHING").
		Insert()
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (u userRepositoryImpl) GetUserById(ctx context.Context, userId string) (*entity.UserEntity, error) {
	result := new(entity.UserEntity)
	err := u.cp.GetConnection().WithContext(ctx).Model(result).
		Where("user_id = ?", userId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (u userRepositoryImpl) GetUsersByIds(ctx context.Context, userIds []string) ([]entity.UserEntity, error) {
	var result []entity.UserEntity
	if len(userIds) == 0 {
		return nil, nil
	}
	err := u.cp.GetConnection().WithContext(ctx).Model(&result).
		Where("user_id in (?)", pg.In(userIds)).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (u userRepositoryImpl) GetUsers(ctx context.Context, usersListReq view.UsersListReq) ([]entity.UserEntity, error) {
	var result []entity.UserEntity

	query := u.cp.GetConnection().WithContext(ctx).Model(&result).
		Order("name ASC").
		Offset(usersListReq.Page * usersListReq.Limit).
		Limit(usersListReq.Limit)

	if usersListReq.Filter != "" {
		filter := "%" + utils.LikeEscaped(usersListReq.Filter) + "%"
		query.Where("user_id ilike ?", filter).
			WhereOr("name ilike ?", filter).
			WhereOr("email ilike ?", filter)
	}

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (u userRepositoryImpl) GetUserByEmail(ctx context.Context, email string) (*entity.UserEntity, error) {
	result := new(entity.UserEntity)
	err := u.cp.GetConnection().WithContext(ctx).Model(result).
		Where("email ilike ?", email).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (u userRepositoryImpl) GetUsersByEmails(ctx context.Context, emails []string) ([]entity.UserEntity, error) {
	var result []entity.UserEntity
	if len(emails) == 0 {
		return nil, nil
	}
	err := u.cp.GetConnection().WithContext(ctx).Model(&result).
		Where("LOWER(email) in (?)", pg.In(emails)).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (u userRepositoryImpl) GetUserExternalIdentity(ctx context.Context, providerType string, providerId string, externalId string) (*entity.ExternalIdentityEntity, error) {
	result := new(entity.ExternalIdentityEntity)
	err := u.cp.GetConnection().WithContext(ctx).Model(result).
		Where("provider = ?", providerType).
		Where("provider_id = ?", providerId).
		Where("external_id = ?", externalId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (u userRepositoryImpl) UpdateUserInfo(ctx context.Context, user *entity.UserEntity) error {
	_, err := u.cp.GetConnection().WithContext(ctx).Model(user).
		Where("user_id = ?", user.Id).
		Set("name = ?", user.Username).
		Set("avatar_url = ?", user.AvatarUrl).
		Update()
	return err
}

func (u userRepositoryImpl) UpdateUserPassword(ctx context.Context, userId string, passwordHash []byte) error {
	entity := new(entity.UserEntity)
	_, err := u.cp.GetConnection().WithContext(ctx).Model(entity).
		Where("user_id = ?", userId).
		Set("password = ?", passwordHash).
		Update()
	return err
}

func (u userRepositoryImpl) ClearUserPassword(ctx context.Context, userId string) error {
	entity := new(entity.UserEntity)
	_, err := u.cp.GetConnection().WithContext(ctx).Model(entity).
		Where("user_id = ?", userId).
		Set("password = ?", nil).
		Update()
	return err
}

func (u userRepositoryImpl) UpdateUserExternalIdentity(ctx context.Context, providerType string, providerId string, externalId string, internalId string) error {
	entity := entity.ExternalIdentityEntity{Provider: providerType, ProviderId: providerId, ExternalId: externalId, InternalId: internalId}
	_, err := u.cp.GetConnection().WithContext(ctx).Model(&entity).
		OnConflict("(provider, provider_id, external_id) DO UPDATE").
		Insert()
	return err
}

func (u userRepositoryImpl) PrivatePackageIdExists(ctx context.Context, privatePackageId string) (bool, error) {
	userEnt := new(entity.UserEntity)
	err := u.cp.GetConnection().WithContext(ctx).Model(userEnt).
		Where("private_package_id = ?", privatePackageId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return userEnt.PrivatePackageId == privatePackageId, nil
}
