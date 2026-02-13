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
	RemoveMigrationBuildData(ctx context.Context) (deletedRows int, err error)
	GetRemoveCandidateOldBuildEntitiesIds() ([]string, error)
	RemoveOldBuildSourcesByIds(ctx context.Context, ids []string, runId int, scheduledAt time.Time) error
	GetRemoveMigrationBuildIds(ctx context.Context) ([]string, error)
	RemoveMigrationBuildSourceData(ctx context.Context, ids []string) (deletedRows int, err error)
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

func (b buildCleanUpRepositoryImpl) RemoveMigrationBuildData(ctx context.Context) (deletedRows int, err error) {
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
	_, err = b.cp.GetConnection().ExecContext(ctx, "vacuum full build_src")
	if err != nil {
		return deletedRows, errors.Wrap(err, "failed to run vacuum for table build_src")
	}
	_, err = b.cp.GetConnection().ExecContext(ctx, "vacuum full build_result")
	if err != nil {
		return deletedRows, errors.Wrap(err, "failed to run vacuum for table build_result")
	}

	return deletedRows, nil
}

func (b buildCleanUpRepositoryImpl) GetRemoveMigrationBuildIds(ctx context.Context) ([]string, error) {
	var result []string
	var ents []entity.BuildIdEntity

	query := `select build_id from build where created_by = ?`
	_, err := b.cp.GetConnection().QueryContext(ctx, &ents, query, "db migration")
	if err != nil {
		return nil, err
	}
	for _, ent := range ents {
		result = append(result, ent.Id)
	}
	return result, nil
}

func (b buildCleanUpRepositoryImpl) RemoveMigrationBuildSourceData(ctx context.Context, ids []string) (deletedRows int, err error) {
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
	_, err = b.cp.GetConnection().ExecContext(ctx, "vacuum full build_src")
	if err != nil {
		return deletedRows, errors.Wrap(err, "failed to run vacuum for table build_src")
	}

	return deletedRows, nil
}
