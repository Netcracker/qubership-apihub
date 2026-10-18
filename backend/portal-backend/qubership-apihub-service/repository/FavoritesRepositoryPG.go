package repository

import (
	"context"
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

func (f favoritesRepositoryImpl) AddPackageToFavorites(ctx context.Context, userId string, id string) error {
	ent := &entity.FavoritePackageEntity{UserId: userId, Id: id}
	_, err := f.cp.GetConnection().WithContext(ctx).Model(ent).
		OnConflict("(user_id, package_id) DO UPDATE").
		Set("user_id = EXCLUDED.user_id, package_id = EXCLUDED.package_id").
		Insert()
	return err
}

func (f favoritesRepositoryImpl) RemovePackageFromFavorites(ctx context.Context, userId string, id string) error {
	_, err := f.cp.GetConnection().WithContext(ctx).Model(&entity.FavoritePackageEntity{}).
		Where("user_id = ?", userId).
		Where("package_id = ?", id).
		Delete()
	return err
}

func (f favoritesRepositoryImpl) IsFavoritePackage(ctx context.Context, userId string, id string) (bool, error) {
	result := new(entity.FavoritePackageEntity)
	err := f.cp.GetConnection().WithContext(ctx).Model(result).
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
