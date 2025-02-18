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
	"errors"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

type PersonalAccessTokenRepository interface {
	CreatePAT(ent entity.PersonaAccessTokenEntity) error
	DeletePAT(id string, userId string) error
	GetPAT(id string, userId string) (*entity.PersonaAccessTokenEntity, error)
	GetPATByHash(tokenHash string) (*entity.PersonaAccessTokenEntity, error)
	ListPATs(userId string) ([]entity.PersonaAccessTokenEntity, error)
	CountActiveTokens(userId string) (int, error)
	CheckNameIsFree(userId string, name string) (bool, error)
}

func NewPersonalAccessTokenRepository(cp db.ConnectionProvider) PersonalAccessTokenRepository {
	return personalAccessTokenRepositoryImpl{cp: cp}
}

type personalAccessTokenRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (p personalAccessTokenRepositoryImpl) CreatePAT(ent entity.PersonaAccessTokenEntity) error {
	//TODO: expired_at is calculated on BE side which is not good
	_, err := p.cp.GetConnection().Model(&ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (p personalAccessTokenRepositoryImpl) DeletePAT(id string, userId string) error {
	_, err := p.cp.GetConnection().Model(new(entity.PersonaAccessTokenEntity)).
		Set("deleted_at = now()").
		Where("id = ?", id).
		Where("user_id = ?", userId).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (p personalAccessTokenRepositoryImpl) GetPAT(id string, userId string) (*entity.PersonaAccessTokenEntity, error) {
	result := new(entity.PersonaAccessTokenEntity)
	err := p.cp.GetConnection().Model(result).
		Where("id = ?", id).
		Where("user_id = ?", userId).
		First()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p personalAccessTokenRepositoryImpl) GetPATByHash(tokenHash string) (*entity.PersonaAccessTokenEntity, error) {
	result := new(entity.PersonaAccessTokenEntity)
	err := p.cp.GetConnection().Model(result).
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

func (p personalAccessTokenRepositoryImpl) ListPATs(userId string) ([]entity.PersonaAccessTokenEntity, error) {
	var pats []entity.PersonaAccessTokenEntity

	//.Where("expired_at > now()")

	err := p.cp.GetConnection().Model(&pats).
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

func (p personalAccessTokenRepositoryImpl) CountActiveTokens(userId string) (int, error) {
	res, err := p.cp.GetConnection().Model(&entity.PersonaAccessTokenEntity{}).
		Where("user_id = ?", userId).
		Where("deleted_at is null").
		Count()
	return res, err
}

func (p personalAccessTokenRepositoryImpl) CheckNameIsFree(userId string, name string) (bool, error) {
	res, err := p.cp.GetConnection().Model(&entity.PersonaAccessTokenEntity{}).
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
