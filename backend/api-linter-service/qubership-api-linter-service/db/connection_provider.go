package db

import (
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/go-pg/pg/v10"
)

type ConnectionProvider interface {
	GetConnection() *pg.DB
}

type connectionProviderImpl struct {
	creds view.DbCredentials
	db    *pg.DB
}

func NewConnectionProvider(creds *view.DbCredentials) ConnectionProvider {
	return &connectionProviderImpl{creds: *creds}
}

func (c *connectionProviderImpl) GetConnection() *pg.DB {
	if c.db == nil {
		c.db = pg.Connect(&pg.Options{
			Addr:       fmt.Sprintf("%s:%d", c.creds.Host, c.creds.Port),
			User:       c.creds.Username,
			Password:   c.creds.Password,
			Database:   c.creds.Database,
			PoolSize:   20,
			MaxRetries: 5,
		})
	}
	return c.db
}
