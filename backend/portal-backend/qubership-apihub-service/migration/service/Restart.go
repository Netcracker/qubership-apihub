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

package service

import (
	"context"
	"fmt"

	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/stages"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/go-pg/pg/v10"
)

const MaxMigrationRetries = 3

func (d *dbMigrationServiceImpl) restartMigrations() error {
	var om *stages.OpsMigration

	err := d.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		var ents []mEntity.MigrationRunEntity

		err := tx.Model(&ents).
			Where("status in (?)", pg.In([]string{mView.MigrationStatusRunning, mView.MigrationStatusCancelling})).
			Where("updated_at < (now() - interval '? seconds')", 120).
			Where("instance_id!=?", d.instanceId).
			Order("started_at").
			For("UPDATE skip locked").
			Select()
		if err != nil {
			return err
		}
		if len(ents) == 0 {
			return nil
		}
		// ok, we have stale migrations, take the oldest one
		mrEnt := ents[0]

		if mrEnt.RetryCount >= MaxMigrationRetries {
			_, err = tx.Model(&mEntity.MigrationRunEntity{}).
				Set("status=?", mView.MigrationStatusFailed).
				Set("error_details=?", fmt.Sprintf("Migration exceeded retry limit (%d attempts)", MaxMigrationRetries)).
				Set("finished_at=now()").
				Where("id=?", mrEnt.Id).
				Update()
			if err != nil {
				return fmt.Errorf("failed to mark migration %s as failed after retry limit: %w", mrEnt.Id, err)
			}
			return nil
		}

		_, err = tx.Model(&mEntity.MigrationRunEntity{}).
			Set("instance_id=?", d.instanceId).
			Set("retry_count=?", mrEnt.RetryCount+1).
			Set("updated_at=now()").
			Where("id=?", mrEnt.Id).
			Update()
		if err != nil {
			return fmt.Errorf("failed to update migration %s for restart: %w", mrEnt.Id, err)
		}

		mrEnt.InstanceId = d.instanceId
		mrEnt.RetryCount = mrEnt.RetryCount + 1
		om = stages.NewOpsMigration(d.cp, d.systemInfoService, d.minioStorageService, d.repo, d.buildCleanupRepository, mrEnt)

		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to run restartMigrations(): %w", err)
	}

	if om != nil {
		// restart the migration
		utils.SafeAsync(func() {
			om.Start()
		})
	}

	return nil
}
