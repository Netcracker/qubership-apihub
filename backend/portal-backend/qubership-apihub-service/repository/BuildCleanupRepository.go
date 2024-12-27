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

package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
)

type BuildCleanupRepository interface {
	GetLastCleanup() (*entity.BuildCleanupEntity, error)
	RemoveOldBuildEntities(runId int, scheduledAt time.Time) error
	RemoveMigrationBuildData() (deletedRows int, err error)
	GetRemoveCandidateOldBuildEntitiesIds() ([]string, error)
	RemoveOldBuildSourcesByIds(ctx context.Context, ids []string, runId int, scheduledAt time.Time) error
	GetRemoveMigrationBuildIds() ([]string, error)
	RemoveMigrationBuildSourceData(ids []string) (deletedRows int, err error)
	RemoveUnreferencedOperationData(runId int) error
	StoreCleanup(ent *entity.BuildCleanupEntity) error
	GetCleanup(runId int) (*entity.BuildCleanupEntity, error)
}

func NewBuildCleanupRepository(cp db.ConnectionProvider) BuildCleanupRepository {
	return &buildCleanUpRepositoryImpl{
		cp: cp,
	}
}

type buildCleanUpRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b buildCleanUpRepositoryImpl) GetLastCleanup() (*entity.BuildCleanupEntity, error) {
	result := new(entity.BuildCleanupEntity)
	err := b.cp.GetConnection().Model(result).
		OrderExpr("run_id DESC").Limit(1).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b buildCleanUpRepositoryImpl) RemoveOldBuildEntities(runId int, scheduledAt time.Time) error {
	ctx := context.Background()
	var deletedBuildSources, deletedBuildResults int
	err := b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		cleanupEnt, err := b.getCleanupTx(tx, runId)
		if err != nil {
			return err
		}
		if cleanupEnt == nil {
			return errors.Errorf("Failed to get cleanup run entity by id %d", runId)
		}

		successBuildsRetention := time.Now().Add(-(time.Hour * 168)) // 1 week
		failedBuildsRetention := time.Now().Add(-(time.Hour * 336))  // 2 weeks

		deletedBuildSources, err = b.removeOldBuildSources(tx, successBuildsRetention, failedBuildsRetention)
		if err != nil {
			return errors.Wrap(err, "Failed to remove old build sources")
		}
		deletedBuildResults, err = b.removeOldBuildResults(tx, successBuildsRetention, failedBuildsRetention)
		if err != nil {
			return errors.Wrap(err, "Failed to remove old build results")
		}
		cleanupEnt.BuildResult = deletedBuildResults
		cleanupEnt.BuildSrc = deletedBuildSources
		cleanupEnt.DeletedRows = cleanupEnt.DeletedRows + deletedBuildSources + deletedBuildResults
		if err = b.updateCleanupTx(tx, *cleanupEnt); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}

	// Do not run vacuum in transaction
	_, err = b.cp.GetConnection().Exec("vacuum full build_src")
	if err != nil {
		return errors.Wrap(err, "failed to run vacuum for table build_src")
	}
	_, err = b.cp.GetConnection().Exec("vacuum full build_result")
	if err != nil {
		return errors.Wrap(err, "failed to run vacuum for table build_result")
	}
	return err
}

func (b buildCleanUpRepositoryImpl) RemoveOldBuildSourcesByIds(ctx context.Context, ids []string, runId int, scheduledAt time.Time) error {
	err := b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		cleanupEnt, err := b.getCleanupTx(tx, runId)
		if err != nil {
			return err
		}
		if cleanupEnt == nil {
			return errors.Errorf("Failed to get cleanup run entity by id %d", runId)
		}

		query := `delete from build_src 
		where build_id in (?)`
		result, err := tx.Exec(query, pg.In(ids))
		if err != nil {
			return fmt.Errorf("failed to delete builds from table build_src: %w", err)
		}
		deletedRows := result.RowsAffected()

		cleanupEnt.BuildSrc = deletedRows
		cleanupEnt.DeletedRows = cleanupEnt.DeletedRows + deletedRows
		if err = b.updateCleanupTx(tx, *cleanupEnt); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	_, err = b.cp.GetConnection().Exec("vacuum full build_src")
	if err != nil {
		return errors.Wrap(err, "failed to run vacuum for table build_src")
	}
	return err
}

func (b buildCleanUpRepositoryImpl) GetRemoveCandidateOldBuildEntitiesIds() ([]string, error) {
	successBuildsRetention := time.Now().Add(-(time.Hour * 168)) // 1 week
	failedBuildsRetention := time.Now().Add(-(time.Hour * 336))  // 2 weeks

	return b.getRemoveCandidateOldBuildEntities(successBuildsRetention, failedBuildsRetention)
}

func (b buildCleanUpRepositoryImpl) StoreCleanup(ent *entity.BuildCleanupEntity) error {
	_, err := b.cp.GetConnection().Model(ent).Insert()
	return err
}

func (b buildCleanUpRepositoryImpl) updateCleanupTx(tx *pg.Tx, ent entity.BuildCleanupEntity) error {
	_, err := tx.Model(&ent).Where("run_id = ?", ent.RunId).Update()
	return err
}

func (b buildCleanUpRepositoryImpl) updateCleanup(ent entity.BuildCleanupEntity) error {
	_, err := b.cp.GetConnection().Model(&ent).Where("run_id = ?", ent.RunId).Update()
	return err
}

func (b buildCleanUpRepositoryImpl) GetCleanup(runId int) (*entity.BuildCleanupEntity, error) {
	ent := new(entity.BuildCleanupEntity)
	err := b.cp.GetConnection().Model(ent).Where("run_id = ?", runId).Select()
	return ent, err
}

func (b buildCleanUpRepositoryImpl) getCleanupTx(tx *pg.Tx, runId int) (*entity.BuildCleanupEntity, error) {
	ent := new(entity.BuildCleanupEntity)
	err := tx.Model(ent).Where("run_id = ?", runId).Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
	}
	return ent, err
}

func (b buildCleanUpRepositoryImpl) removeOldBuildResults(tx *pg.Tx, successBuildsRetention, failedBuildsRetention time.Time) (deletedRows int, err error) {
	query := `with builds as 
		(select build_id from build where 
		(status = ? and last_active <= ?) or
		(status = ? and last_active <= ?))
		delete from build_result 
		where build_result.build_id in (select builds.build_id from builds)`
	result, err := tx.Exec(query, view.StatusError, failedBuildsRetention, view.StatusComplete, successBuildsRetention)
	if err != nil {
		return 0, fmt.Errorf("failed to delete builds from table build_result: %w", err)
	}
	deletedRows = result.RowsAffected()

	return deletedRows, err
}

func (b buildCleanUpRepositoryImpl) removeOldBuildSources(tx *pg.Tx, successBuildsRetention, failedBuildsRetention time.Time) (deletedRows int, err error) {
	query := `with builds as 
		(select build_id from build where 
		(status = ? and last_active <= ?) or
		(status = ? and last_active <= ?))
		delete from build_src 
		where build_src.build_id in (select builds.build_id from builds)`
	result, err := tx.Exec(query, view.StatusError, failedBuildsRetention, view.StatusComplete, successBuildsRetention)
	if err != nil {
		return 0, fmt.Errorf("failed to delete builds from table build_src: %w", err)
	}
	deletedRows = result.RowsAffected()

	return deletedRows, err
}

func (b buildCleanUpRepositoryImpl) getRemoveCandidateOldBuildEntities(successBuildsRetention, failedBuildsRetention time.Time) ([]string, error) {
	var result []string
	var ents []entity.BuildIdEntity

	query := `select build_id from build where 
		(status = ? and last_active <= ?) or
		(status = ? and last_active <= ?)`
	_, err := b.cp.GetConnection().Query(&ents, query, view.StatusError, failedBuildsRetention, view.StatusComplete, successBuildsRetention)
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		result = append(result, ent.Id)
	}
	return result, nil
}

func (b buildCleanUpRepositoryImpl) RemoveMigrationBuildData() (deletedRows int, err error) {
	ctx := context.Background()
	err = b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		query := `with builds as (select build_id from build where created_by = ?)
		delete from build_result 
		where build_result.build_id in (select builds.build_id from builds)`
		result, err := tx.Exec(query, "db migration")
		if err != nil {
			return err
		}
		deletedRows += result.RowsAffected()

		query = `with builds as (select build_id from build where created_by = ?)
		delete from build_src 
		where build_src.build_id in (select builds.build_id from builds)`
		result, err = tx.Exec(query, "db migration")
		if err != nil {
			return err
		}
		deletedRows += result.RowsAffected()

		return nil
	})
	if err != nil {
		return deletedRows, err
	}

	// Do not run vacuum in transaction
	_, err = b.cp.GetConnection().Exec("vacuum full build_src")
	if err != nil {
		return deletedRows, errors.Wrap(err, "failed to run vacuum for table build_src")
	}
	_, err = b.cp.GetConnection().Exec("vacuum full build_result")
	if err != nil {
		return deletedRows, errors.Wrap(err, "failed to run vacuum for table build_result")
	}

	return deletedRows, nil
}

func (b buildCleanUpRepositoryImpl) GetRemoveMigrationBuildIds() ([]string, error) {
	var result []string
	var ents []entity.BuildIdEntity

	query := `select build_id from build where created_by = ?`
	_, err := b.cp.GetConnection().Query(&ents, query, "db migration")
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		result = append(result, ent.Id)
	}
	return result, nil
}

func (b buildCleanUpRepositoryImpl) RemoveMigrationBuildSourceData(ids []string) (deletedRows int, err error) {
	ctx := context.Background()
	err = b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		query := `delete from build_src 
		where build_id in (?)`
		result, err := tx.Exec(query, pg.In(ids))
		if err != nil {
			return err
		}
		deletedRows += result.RowsAffected()

		return nil
	})
	if err != nil {
		return deletedRows, err
	}

	// Do not run vacuum in transaction
	_, err = b.cp.GetConnection().Exec("vacuum full build_src")
	if err != nil {
		return deletedRows, errors.Wrap(err, "failed to run vacuum for table build_src")
	}

	return deletedRows, nil
}

func (b buildCleanUpRepositoryImpl) RemoveUnreferencedOperationData(runId int) error {
	ctx := context.Background()
	cleanupEnt, err := b.GetCleanup(runId)
	if err != nil {
		return err
	}
	if cleanupEnt == nil {
		return errors.Errorf("Failed to get cleanup run entity by id %d", runId)
	}

	var insertedRows int
	err = b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err = tx.Exec("create table if not exists tmp_data_hash (data_hash varchar)")
		if err != nil {
			return err
		}
		_, err = tx.Exec("truncate table tmp_data_hash")
		if err != nil {
			return err
		}
		//insert data hashes for operations that no longer exist
		insertResult, err := tx.Exec(`
		insert into tmp_data_hash
		select od.data_hash from operation_data od 
			left join operation o
			on od.data_hash=o.data_hash 
			where o.package_id is null`)
		if err != nil {
			return err
		}
		insertedRows = insertResult.RowsAffected()
		//insert data hashes for operations in deleted versions
		insertResult, err = tx.Exec(`
		insert into tmp_data_hash
		select distinct od.data_hash from operation_data od 
			inner join operation o
			on od.data_hash=o.data_hash
			inner join published_version pv_del
			on pv_del.package_id=o.package_id
			and pv_del.version=o.version
			and pv_del.revision=o.revision
			and pv_del.deleted_at is not null
        except
        select distinct o.data_hash from operation o
			inner join published_version pv
			on pv.package_id=o.package_id
			and pv.version=o.version
			and pv.revision=o.revision
			and pv.deleted_at is null;`)
		if err != nil {
			return err
		}
		insertedRows += insertResult.RowsAffected()
		return nil
	})
	if err != nil {
		return errors.Wrap(err, "failed to create temporary table for cleanup job")
	}

	limit := 20
	conn := b.cp.GetConnection()
	for page := 0; page <= insertedRows/limit+1; page++ {
		res, err := conn.Exec("delete from operation_data od where od.data_hash = any (select data_hash from tmp_data_hash order by data_hash limit ? offset ?)", limit, page*limit)
		if err != nil {
			return err
		}
		cleanupEnt.OperationData += res.RowsAffected()
		cleanupEnt.DeletedRows += res.RowsAffected()

		res, err = conn.Exec("delete from ts_operation_data od where od.data_hash = any (select data_hash from tmp_data_hash order by data_hash limit ? offset ?)", limit, page*limit)
		if err != nil {
			return err
		}
		cleanupEnt.TsOperationData += res.RowsAffected()
		cleanupEnt.DeletedRows += res.RowsAffected()

		res, err = conn.Exec("delete from ts_rest_operation_data od where od.data_hash = any (select data_hash from tmp_data_hash order by data_hash limit ? offset ?)", limit, page*limit)
		if err != nil {
			return err
		}
		cleanupEnt.TsRestOperationData += res.RowsAffected()
		cleanupEnt.DeletedRows += res.RowsAffected()

		res, err = conn.Exec("delete from ts_graphql_operation_data od where od.data_hash = any (select data_hash from tmp_data_hash order by data_hash limit ? offset ?)", limit, page*limit)
		if err != nil {
			return err
		}
		cleanupEnt.TsGQLOperationData += res.RowsAffected()
		cleanupEnt.DeletedRows += res.RowsAffected()

		err = b.updateCleanup(*cleanupEnt)
		if err != nil {
			return err
		}
	}

	_, err = conn.Exec("drop table if exists tmp_data_hash")
	if err != nil {
		return errors.Wrap(err, "failed to drop temporary table 'tmp_data_hash' for cleanup job")
	}

	// Do not run vacuum in transaction
	_, err = b.cp.GetConnection().Exec("vacuum full operation_data")
	if err != nil {
		return errors.Wrap(err, "failed to run vacuum for table operation_data")
	}

	_, err = b.cp.GetConnection().Exec("vacuum full ts_operation_data")
	if err != nil {
		return errors.Wrap(err, "failed to run vacuum for table ts_operation_data")
	}

	_, err = b.cp.GetConnection().Exec("vacuum full ts_rest_operation_data")
	if err != nil {
		return errors.Wrap(err, "failed to run vacuum for table ts_rest_operation_data")
	}

	_, err = b.cp.GetConnection().Exec("vacuum full ts_graphql_operation_data")
	if err != nil {
		return errors.Wrap(err, "failed to run vacuum for table ts_graphql_operation_data")
	}

	return nil
}
