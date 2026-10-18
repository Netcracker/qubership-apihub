package repository

import "context"

type FavoritesRepository interface {
	AddPackageToFavorites(ctx context.Context, userId string, id string) error
	RemovePackageFromFavorites(ctx context.Context, userId string, id string) error
	IsFavoritePackage(ctx context.Context, userId string, id string) (bool, error)
}
