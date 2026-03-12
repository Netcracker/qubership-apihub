package repository

type FavoritesRepository interface {
	AddPackageToFavorites(userId string, id string) error
	RemovePackageFromFavorites(userId string, id string) error
	IsFavoritePackage(userId string, id string) (bool, error)
}
