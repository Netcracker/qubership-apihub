package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type RegistryEntity struct {
	tableName struct{} `pg:"registry,alias:registry"`

	Id        string     `pg:"id,pk,type:varchar"`
	Type      string     `pg:"type,type:varchar,notnull"`
	BaseUrl   string     `pg:"base_url,type:varchar,notnull"`
	Name      string     `pg:"name,type:varchar"`
	CreatedAt time.Time  `pg:"created_at,type:timestamp without time zone,notnull"`
	CreatedBy string     `pg:"created_by,type:varchar,notnull"`
	DeletedAt *time.Time `pg:"deleted_at,type:timestamp without time zone"`
	DeletedBy string     `pg:"deleted_by,type:varchar"`
}

type RepositoryEntity struct {
	tableName struct{} `pg:"repository,alias:repository"`

	Repository string `pg:"repository,pk,type:varchar"`
	RegistryId string `pg:"registry_id,type:varchar,notnull"`
}

func MakeRegistryView(ent RegistryEntity) view.Registry {
	return view.Registry{
		RegistryId: ent.Id,
		Type:       view.RegistryType(ent.Type),
		BaseUrl:    ent.BaseUrl,
		Name:       ent.Name,
	}
}

func MakeRepositoryView(ent RepositoryEntity) view.Repository {
	return view.Repository{
		Repository: ent.Repository,
		RegistryId: ent.RegistryId,
	}
}
