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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

func NewFavoritesRepositoryPG(cp db.ConnectionProvider) (FavoritesRepository, error) {
	return &favoritesRepositoryImpl{cp: cp}, nil
}

type favoritesRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (f favoritesRepositoryImpl) AddProjectToFavorites(userId string, id string) error {
	ent := &entity.FavoriteProjectEntity{UserId: userId, Id: id}
	_, err := f.cp.GetConnection().Model(ent).
		OnConflict("(user_id, project_id) DO UPDATE").
		Set("user_id = EXCLUDED.user_id, project_id = EXCLUDED.project_id").
		Insert()
	return err
}

func (f favoritesRepositoryImpl) AddPackageToFavorites(userId string, id string) error {
	ent := &entity.FavoritePackageEntity{UserId: userId, Id: id}
	_, err := f.cp.GetConnection().Model(ent).
		OnConflict("(user_id, package_id) DO UPDATE").
		Set("user_id = EXCLUDED.user_id, package_id = EXCLUDED.package_id").
		Insert()
	return err
}

func (f favoritesRepositoryImpl) RemoveProjectFromFavorites(userId string, id string) error {
	_, err := f.cp.GetConnection().Model(&entity.FavoriteProjectEntity{}).
		Where("user_id = ?", userId).
		Where("project_id = ?", id).
		Delete()
	return err
}

func (f favoritesRepositoryImpl) RemovePackageFromFavorites(userId string, id string) error {
	_, err := f.cp.GetConnection().Model(&entity.FavoritePackageEntity{}).
		Where("user_id = ?", userId).
		Where("package_id = ?", id).
		Delete()
	return err
}

func (f favoritesRepositoryImpl) IsFavoriteProject(userId string, id string) (bool, error) {
	result := new(entity.FavoriteProjectEntity)
	err := f.cp.GetConnection().Model(result).
		Where("user_id = ?", userId).
		Where("project_id = ?", id).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (f favoritesRepositoryImpl) IsFavoritePackage(userId string, id string) (bool, error) {
	result := new(entity.FavoritePackageEntity)
	err := f.cp.GetConnection().Model(result).
		Where("user_id = ?", userId).
		Where("package_id = ?", id).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
