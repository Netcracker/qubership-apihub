package entity

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"time"
)

type PersonaAccessTokenEntity struct {
	tableName struct{} `pg:"personal_access_tokens, alias:personal_access_tokens"`

	Id        string    `pg:"id, pk, type:varchar"`
	UserId    string    `pg:"user_id, type:varchar"`
	TokenHash string    `pg:"token_hash, type:varchar"`
	Name      string    `pg:"name, type:varchar"`
	CreatedAt time.Time `pg:"created_at, type:timestamp without time zone"`
	ExpiresAt time.Time `pg:"expires_at, type:timestamp without time zone"`
	DeletedAt time.Time `pg:"deleted_at, type:timestamp without time zone"`
}

func MakePersonaAccessTokenView(ent PersonaAccessTokenEntity) view.PersonalAccessTokenItem {
	var expiresAt *time.Time
	if !ent.ExpiresAt.IsZero() {
		expiresAt = &ent.ExpiresAt
	}

	return view.PersonalAccessTokenItem{
		Id:        ent.Id,
		Name:      ent.Name,
		ExpiresAt: expiresAt,
		CreatedAt: ent.CreatedAt,
		Status:    makeStatus(ent),
	}
}

func makeStatus(ent PersonaAccessTokenEntity) view.PersonaAccessTokenStatus {
	if !ent.ExpiresAt.IsZero() && time.Now().After(ent.ExpiresAt) {
		return view.PersonaAccessTokenExpired
	}

	return view.PersonaAccessTokenActive
}
