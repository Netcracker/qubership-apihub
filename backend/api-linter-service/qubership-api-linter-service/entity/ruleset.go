package entity

import (
	"github.com/Netcracker/qubership-api-linter-service/view"
	"time"
)

type Ruleset struct {
	tableName struct{} `pg:"ruleset"`

	Id            string             `pg:"id,pk,type:varchar"`
	Name          string             `pg:"name,type:varchar,notnull"`
	Status        view.RulesetStatus `pg:"status,type:varchar,notnull"`
	CreatedAt     time.Time          `pg:"created_at,type:timestamp without time zone,notnull"`
	CreatedBy     string             `pg:"created_by,type:varchar"`
	ApiType       view.ApiType       `pg:"api_type,type:varchar,notnull"`
	Linter        view.Linter        `pg:"linter,type:varchar,notnull"`
	FileName      string             `pg:"file_name,type:varchar"`
	CanBeDeleted  bool               `pg:"can_be_deleted,type:bool"`
	LastActivated *time.Time         `pg:"last_activated,type:timestamp without time zone"`
}

type RulesetWithData struct {
	tableName struct{} `pg:"ruleset"`

	Ruleset
	Data []byte `pg:"data,type:bytea,notnull"`
}

type RulesetActivationHistory struct {
	tableName struct{} `pg:"ruleset_activation_history"`

	RulesetId     string    `pg:"ruleset_id,type:varchar,notnull"`
	ActivatedAt   time.Time `pg:"activated_at,type:timestamp without time zone"`
	ActivatedBy   string    `pg:"activated_by,type:varchar"`
	DeactivatedAt time.Time `pg:"deactivated_at,type:timestamp without time zone"`
	DeactivatedBy string    `pg:"deactivated_by,type:varchar"`
}

func MakeRulesetView(ent Ruleset) view.Ruleset {
	return view.Ruleset{
		Id:           ent.Id,
		Name:         ent.Name,
		Status:       ent.Status,
		FileName:     ent.FileName,
		Linter:       ent.Linter,
		ApiType:      ent.ApiType,
		CreatedAt:    ent.CreatedAt,
		CanBeDeleted: ent.CanBeDeleted,
	}
}

func MakeActivationRecordView(ent RulesetActivationHistory) view.ActivationRecord {
	var to *time.Time
	if !ent.DeactivatedAt.IsZero() {
		to = &ent.DeactivatedAt
	}
	return view.ActivationRecord{
		ActiveFrom: ent.ActivatedAt,
		ActiveTo:   to,
	}
}
