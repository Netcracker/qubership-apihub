package entity

type FavoritePackageEntity struct {
	tableName struct{} `pg:"favorite_packages"`

	UserId string `pg:"user_id, pk, type:varchar"`
	Id     string `pg:"package_id, pk, type:varchar"`
}
