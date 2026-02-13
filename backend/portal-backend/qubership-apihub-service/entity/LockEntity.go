package entity

import (
	"time"
)

type LockEntity struct {
	tableName struct{} `pg:"locks"`

	Name       string    `pg:"name, pk, type:varchar"`
	InstanceId string    `pg:"instance_id, type:varchar, notnull"`
	AcquiredAt time.Time `pg:"acquired_at, type:timestamp without time zone, notnull"`
	ExpiresAt  time.Time `pg:"expires_at, type:timestamp without time zone, notnull"`
	Version    int64     `pg:"version, type:bigint, notnull, default:1"`
}
