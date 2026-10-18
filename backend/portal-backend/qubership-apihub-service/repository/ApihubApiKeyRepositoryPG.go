package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

func NewApihubApiKeyRepositoryPG(cp db.ConnectionProvider) (ApihubApiKeyRepository, error) {
	return &apihubApiKeyRepositoryImpl{cp: cp}, nil
}

type apihubApiKeyRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r apihubApiKeyRepositoryImpl) SaveApiKey(ctx context.Context, apihubApiKeyEntity *entity.ApihubApiKeyEntity) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(apihubApiKeyEntity).Insert()
	return err
}

func (r apihubApiKeyRepositoryImpl) RevokeApiKey(ctx context.Context, id string, userId string) error {
	timeNow := time.Now()
	_, err := r.cp.GetConnection().WithContext(ctx).Model(&entity.ApihubApiKeyEntity{DeletedBy: userId, DeletedAt: &timeNow}).
		Where("id = ?", id).
		Set("deleted_by = ?deleted_by").
		Set("deleted_at = ?deleted_at").
		Update()
	return err
}

func (r apihubApiKeyRepositoryImpl) GetPackageApiKeys(ctx context.Context, packageId string) ([]entity.ApihubApiKeyUserEntity, error) {
	var result []entity.ApihubApiKeyUserEntity
	err := r.cp.GetConnection().WithContext(ctx).Model(&result).
		ColumnExpr("apihub_api_keys.*").
		ColumnExpr("coalesce(u.name, '') as user_name").
		ColumnExpr("coalesce(u.email, '') as user_email").
		ColumnExpr("coalesce(u.avatar_url, '') as user_avatar_url").
		Join("left join user_data u").
		JoinOn("u.user_id = apihub_api_keys.created_by").
		ColumnExpr("coalesce(cfu.name, '') as created_for_user_name").
		ColumnExpr("coalesce(cfu.email, '') as created_for_user_email").
		ColumnExpr("coalesce(cfu.avatar_url, '') as created_for_user_avatar_url").
		Join("left join user_data cfu").
		JoinOn("cfu.user_id = apihub_api_keys.created_for").
		Where("apihub_api_keys.package_id = ?", packageId).
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return result, nil
}

func (r apihubApiKeyRepositoryImpl) GetApiKeyByHash(ctx context.Context, apiKeyHash string) (*entity.ApihubApiKeyEntity, error) {
	ent := new(entity.ApihubApiKeyEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(ent).
		Where("api_key = ?", apiKeyHash).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

func (r apihubApiKeyRepositoryImpl) GetPackageApiKey(ctx context.Context, apiKeyId string, packageId string) (*entity.ApihubApiKeyUserEntity, error) {
	ent := new(entity.ApihubApiKeyUserEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(ent).
		ColumnExpr("apihub_api_keys.*").
		ColumnExpr("coalesce(u.name, '') as user_name").
		ColumnExpr("coalesce(u.email, '') as user_email").
		ColumnExpr("coalesce(u.avatar_url, '') as user_avatar_url").
		Join("left join user_data u").
		JoinOn("u.user_id = apihub_api_keys.created_by").
		ColumnExpr("coalesce(cfu.name, '') as created_for_user_name").
		ColumnExpr("coalesce(cfu.email, '') as created_for_user_email").
		ColumnExpr("coalesce(cfu.avatar_url, '') as created_for_user_avatar_url").
		Join("left join user_data cfu").
		JoinOn("cfu.user_id = apihub_api_keys.created_for").
		Where("apihub_api_keys.id = ?", apiKeyId).
		Where("apihub_api_keys.package_id = ?", packageId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

func (r apihubApiKeyRepositoryImpl) GetApiKey(ctx context.Context, apiKeyId string) (*entity.ApihubApiKeyEntity, error) {
	ent := new(entity.ApihubApiKeyEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(ent).
		Where("id = ?", apiKeyId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}
