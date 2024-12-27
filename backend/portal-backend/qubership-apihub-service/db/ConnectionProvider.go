// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package db

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
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
			PoolSize:   50,
			MaxRetries: 5,
		})
	}
	//c.db.AddQueryHook(&dbLogger{cpi: c})
	return c.db
}

/*
type dbLogger struct {
	cpi *connectionProviderImpl
}

func (d dbLogger) BeforeQuery(ctx context.Context, q *pg.QueryEvent) (context.Context, error) {
	return ctx, nil
}

func (d dbLogger) AfterQuery(ctx context.Context, q *pg.QueryEvent) error {
	if query, _ := q.FormattedQuery(); bytes.Compare(query, []byte("SELECT 1")) != 0 {
		log.Trace(string(query))
	}

	if q.Err != nil && strings.Contains(q.Err.Error(), "Conn is in a bad state") {
		if d.cpi != nil {
			if d.cpi.conn != nil {
				err := d.cpi.conn.Close()
				if err != nil {
					log.Errorf("Failed to close conn for bad state: %s", err)
				}
			}
			if d.cpi.db != nil {
				err := d.cpi.db.Close()
				if err != nil {
					log.Errorf("Failed to close DB for bad state: %s", err)
				}
			}
		}
		d.cpi.db = nil
		d.cpi.conn = nil
	}

	// for dev purposes
	//queryStr, _ := q.FormattedQuery()
	//log.Infof("DB query: %s", queryStr)

	return nil
}*/
