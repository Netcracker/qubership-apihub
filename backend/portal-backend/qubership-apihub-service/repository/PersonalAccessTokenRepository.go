package repository

import (
	"context"
	"errors"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

type PersonalAccessTokenRepository interface {
	CreatePAT(ctx context.Context, ent entity.PersonaAccessTokenEntity) error
	DeletePAT(ctx context.Context, id string, userId string) error
	GetPAT(ctx context.Context, id string, userId string) (*entity.PersonaAccessTokenEntity, error)
	GetPATByHash(ctx context.Context, tokenHash string) (*entity.PersonaAccessTokenEntity, error)
	ListPATs(ctx context.Context, userId string) ([]entity.PersonaAccessTokenEntity, error)
	CountActiveTokens(ctx context.Context, userId string) (int, error)
	CheckNameIsFree(ctx context.Context, userId string, name string) (bool, error)
}

func NewPersonalAccessTokenRepository(cp db.ConnectionProvider) PersonalAccessTokenRepository {
	return personalAccessTokenRepositoryImpl{cp: cp}
}

type personalAccessTokenRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (p personalAccessTokenRepositoryImpl) CreatePAT(ctx context.Context, ent entity.PersonaAccessTokenEntity) error {
	//TODO: expired_at is calculated on BE side which is not good
	_, err := p.cp.GetConnection().WithContext(ctx).Model(&ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (p personalAccessTokenRepositoryImpl) DeletePAT(ctx context.Context, id string, userId string) error {
	_, err := p.cp.GetConnection().WithContext(ctx).Model(new(entity.PersonaAccessTokenEntity)).
		Set("deleted_at = now()").
		Where("id = ?", id).
		Where("user_id = ?", userId).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (p personalAccessTokenRepositoryImpl) GetPAT(ctx context.Context, id string, userId string) (*entity.PersonaAccessTokenEntity, error) {
	result := new(entity.PersonaAccessTokenEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
		Where("id = ?", id).
		Where("user_id = ?", userId).
		Where("deleted_at is null").
		First()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p personalAccessTokenRepositoryImpl) GetPATByHash(ctx context.Context, tokenHash string) (*entity.PersonaAccessTokenEntity, error) {
	result := new(entity.PersonaAccessTokenEntity)
	err := p.cp.GetConnection().WithContext(ctx).Model(result).
		Where("token_hash = ?", tokenHash).
		Where("deleted_at is null").
		First()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (p personalAccessTokenRepositoryImpl) ListPATs(ctx context.Context, userId string) ([]entity.PersonaAccessTokenEntity, error) {
	var pats []entity.PersonaAccessTokenEntity

	//.Where("expired_at > now()")

	err := p.cp.GetConnection().WithContext(ctx).Model(&pats).
		Where("user_id = ?", userId).
		Where("deleted_at is null").
		Order("created_at ASC").
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return []entity.PersonaAccessTokenEntity{}, nil
		}
		return nil, err
	}
	return pats, nil
}

func (p personalAccessTokenRepositoryImpl) CountActiveTokens(ctx context.Context, userId string) (int, error) {
	res, err := p.cp.GetConnection().WithContext(ctx).Model(&entity.PersonaAccessTokenEntity{}).
		Where("user_id = ?", userId).
		Where("deleted_at is null").
		Count()
	return res, err
}

func (p personalAccessTokenRepositoryImpl) CheckNameIsFree(ctx context.Context, userId string, name string) (bool, error) {
	res, err := p.cp.GetConnection().WithContext(ctx).Model(&entity.PersonaAccessTokenEntity{}).
		Where("user_id = ?", userId).
		Where("deleted_at is null").
		Where("name = ?", name).
		Count()
	if err != nil {
		return false, err
	}
	if res == 0 {
		return true, nil
	}
	return false, nil
}
