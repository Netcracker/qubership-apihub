package entity

import (
	"time"
)

type LibraryMemberRoleEntity struct {
	tableName struct{} `pg:"library_member_role,alias:library_member_role"`

	LibraryId string     `pg:"library_id,pk,type:varchar"`
	UserId    string     `pg:"user_id,pk,type:varchar"`
	Roles     []string   `pg:"roles,type:varchar[],array"`
	CreatedAt time.Time  `pg:"created_at,type:timestamp without time zone,notnull"`
	CreatedBy string     `pg:"created_by,type:varchar,notnull"`
	UpdatedAt *time.Time `pg:"updated_at,type:timestamp without time zone"`
	UpdatedBy string     `pg:"updated_by,type:varchar"`
}

type FavoriteLibraryEntity struct {
	tableName struct{} `pg:"favorite_libraries,alias:favorite_libraries"`

	UserId    string `pg:"user_id,pk,type:varchar"`
	LibraryId string `pg:"library_id,pk,type:varchar"`
}
