package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
	"github.com/go-pg/pg/v10"
)

type UnreferencedDataCleanupRepository interface {
	StoreCleanupRun(ctx context.Context, entity entity.UnreferencedDataCleanupEntity) error
	UpdateCleanupRun(ctx context.Context, runId string, status string, details string, finishedAt *time.Time) error

	DeleteUnreferencedOperationData(ctx context.Context, runId string, batchSize int) (int, error)
	DeleteUnreferencedOperationGroupTemplates(ctx context.Context, runId string, batchSize int) (int, error)
	DeleteUnreferencedSrcArchives(ctx context.Context, runId string, batchSize int) (int, error)
	DeleteUnreferencedPublishedData(ctx context.Context, runId string, batchSize int) (int, error)
	DeleteUnreferencedVersionInternalDocumentData(ctx context.Context, runId string, batchSize int) (int, error)
	DeleteUnreferencedComparisonInternalDocumentData(ctx context.Context, runId string, batchSize int) (int, error)
	VacuumAffectedTables(ctx context.Context, runId string) error
}

func NewUnreferencedDataCleanupRepository(cp db.ConnectionProvider) UnreferencedDataCleanupRepository {
	return &unreferencedDataCleanupRepositoryImpl{cp: cp}
}

type unreferencedDataCleanupRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (u unreferencedDataCleanupRepositoryImpl) StoreCleanupRun(ctx context.Context, entity entity.UnreferencedDataCleanupEntity) error {
	_, err := u.cp.GetConnection().ModelContext(ctx, &entity).Insert()
	return err
}

func (u unreferencedDataCleanupRepositoryImpl) UpdateCleanupRun(ctx context.Context, runId string, status string, details string, finishedAt *time.Time) error {
	query := u.cp.GetConnection().ModelContext(ctx, &entity.UnreferencedDataCleanupEntity{})

	if status != "" {
		query = query.Set("status=?", status)
	}

	if details != "" {
		query = query.Set("details=?", details)
	}

	if finishedAt != nil {
		query = query.Set("finished_at=?", finishedAt)
	}

	_, err := query.Where("run_id = ?", runId).Update()
	return err
}

func (u unreferencedDataCleanupRepositoryImpl) DeleteUnreferencedOperationData(ctx context.Context, runId string, batchSize int) (int, error) {
	var deletedItems entity.DeletedItemsCounts

	err := u.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		getUnreferencedDataHashQuery := `
			SELECT od.data_hash
			FROM operation_data od
			WHERE NOT EXISTS (
    			SELECT 1 FROM operation o WHERE o.data_hash = od.data_hash
			)
			ORDER BY od.data_hash
			LIMIT ?`

		var dataHash []string
		_, err := tx.QueryContext(ctx, &dataHash, getUnreferencedDataHashQuery, batchSize)
		if err != nil {
			return fmt.Errorf("failed to get unreferenced data hash: %w", err)
		}

		if len(dataHash) == 0 {
			return nil
		}
		logger.Debugf(ctx, "Found %d operation data entities to delete in current batch", len(dataHash))

		logger.Tracef(ctx, "Deleting related data for operation data with hash: %v", dataHash)

		logger.Debug(ctx, "Deleting related data from ts_operation_data")
		deleteOpDataQuery := `DELETE FROM ts_operation_data WHERE data_hash IN (?)`
		opResult, err := tx.ExecContext(ctx, deleteOpDataQuery, pg.In(dataHash))
		if err != nil {
			return fmt.Errorf("failed to delete records from ts_operation_data: %w", err)
		}
		deletedItems.TSOperationData = opResult.RowsAffected()

		logger.Debug(ctx, "Deleting related data from fts_operation_data")
		deleteFTSDataQuery := `DELETE FROM fts_operation_data WHERE data_hash IN (?)`
		ftsResult, err := tx.ExecContext(ctx, deleteFTSDataQuery, pg.In(dataHash))
		if err != nil {
			return fmt.Errorf("failed to delete records from fts_operation_data: %w", err)
		}
		deletedItems.FTSOperationData = ftsResult.RowsAffected()

		logger.Tracef(ctx, "Deleting operation data with hash: %v", dataHash)

		logger.Debug(ctx, "Deleting unreferenced data from operation_data")
		deleteOperationDataQuery := `DELETE FROM operation_data WHERE data_hash IN (?)`
		_, err = tx.ExecContext(ctx, deleteOperationDataQuery, pg.In(dataHash))
		if err != nil {
			return fmt.Errorf("failed to delete operation data: %w", err)
		}
		deletedItems.OperationData = len(dataHash)

		var cleanupRun entity.UnreferencedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = &deletedItems
		} else {
			cleanupRun.DeletedItems.OperationData += deletedItems.OperationData
			cleanupRun.DeletedItems.TSOperationData += deletedItems.TSOperationData
			cleanupRun.DeletedItems.FTSOperationData += deletedItems.FTSOperationData
		}
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}

		return nil
	})

	return deletedItems.OperationData +
		deletedItems.TSOperationData +
		deletedItems.FTSOperationData, err
}

func (u unreferencedDataCleanupRepositoryImpl) DeleteUnreferencedOperationGroupTemplates(ctx context.Context, runId string, batchSize int) (int, error) {
	var deletedTemplates int

	err := u.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleteUnreferencedOperationGroupTemplatesQuery := `
			DELETE FROM operation_group_template ogt
			USING (
  				SELECT checksum
  				FROM operation_group_template ogt2
  				WHERE NOT EXISTS (
    				SELECT 1 FROM operation_group og WHERE og.template_checksum = ogt2.checksum
  				)
  				ORDER BY ogt2.checksum
  				LIMIT ?
			) del
			WHERE ogt.checksum = del.checksum;`

		res, err := tx.ExecContext(ctx, deleteUnreferencedOperationGroupTemplatesQuery, batchSize)
		if err != nil {
			return fmt.Errorf("failed to delete unreferenced operation group templates: %w", err)
		}

		logger.Debugf(ctx, "Deleted %d operation group templates in current batch", res.RowsAffected())
		if res.RowsAffected() == 0 {
			return nil
		}
		deletedTemplates = res.RowsAffected()

		var cleanupRun entity.UnreferencedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = &entity.DeletedItemsCounts{}
		}
		cleanupRun.DeletedItems.OperationGroupTemplate += deletedTemplates
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}

		return nil
	})

	return deletedTemplates, err
}

func (u unreferencedDataCleanupRepositoryImpl) DeleteUnreferencedSrcArchives(ctx context.Context, runId string, batchSize int) (int, error) {
	var deletedArchives int

	err := u.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleteUnreferencedSrcArchivesQuery := `
			DELETE FROM published_sources_archives psa
			USING (
  				SELECT checksum
  				FROM published_sources_archives psa2
  				WHERE NOT EXISTS (
    				SELECT 1 FROM published_sources ps WHERE ps.archive_checksum = psa2.checksum
  				)
  				ORDER BY psa2.checksum
  				LIMIT ?
			) del
			WHERE psa.checksum = del.checksum;`
		res, err := tx.ExecContext(ctx, deleteUnreferencedSrcArchivesQuery, batchSize)
		if err != nil {
			return fmt.Errorf("failed to delete unreferenced source archives: %w", err)
		}

		logger.Debugf(ctx, "Deleted %d unreferenced source archives in current batch", res.RowsAffected())
		if res.RowsAffected() == 0 {
			return nil
		}
		deletedArchives = res.RowsAffected()

		var cleanupRun entity.UnreferencedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = &entity.DeletedItemsCounts{}
		}
		cleanupRun.DeletedItems.PublishedSrcArchives += deletedArchives
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}

		return nil
	})

	return deletedArchives, err
}

func (u unreferencedDataCleanupRepositoryImpl) DeleteUnreferencedPublishedData(ctx context.Context, runId string, batchSize int) (int, error) {
	var deletedPublishData int

	err := u.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleteUnreferencedPublishDataQuery := `
			DELETE FROM published_data pd
			USING (
  				SELECT checksum
  				FROM published_data pd2
  				WHERE NOT EXISTS (
    				SELECT 1 FROM published_version_revision_content pvrc WHERE pvrc.checksum = pd2.checksum
  				)
  				ORDER BY pd2.checksum
  				LIMIT ?
			) del
			WHERE pd.checksum = del.checksum;`
		res, err := tx.ExecContext(ctx, deleteUnreferencedPublishDataQuery, batchSize)
		if err != nil {
			return fmt.Errorf("failed to delete unreferenced publish data: %w", err)
		}

		logger.Debugf(ctx, "Deleted %d unreferenced publish data in current batch", res.RowsAffected())
		if res.RowsAffected() == 0 {
			return nil
		}
		deletedPublishData = res.RowsAffected()

		var cleanupRun entity.UnreferencedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = &entity.DeletedItemsCounts{}
		}
		cleanupRun.DeletedItems.PublishedData += deletedPublishData
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}

		return nil
	})

	return deletedPublishData, err
}

func (u unreferencedDataCleanupRepositoryImpl) DeleteUnreferencedVersionInternalDocumentData(ctx context.Context, runId string, batchSize int) (int, error) {
	var deletedInternalDocData int

	err := u.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleteUnreferencedVersionInternalDocumentDataQuery := `
			DELETE FROM version_internal_document_data vidd
			USING (
  				SELECT hash
  				FROM version_internal_document_data vidd2
  				WHERE NOT EXISTS (
    				SELECT 1 FROM version_internal_document vid WHERE vid.hash = vidd2.hash
  				)
  				ORDER BY vidd2.hash
  				LIMIT ?
			) del
			WHERE vidd.hash = del.hash;`
		res, err := tx.ExecContext(ctx, deleteUnreferencedVersionInternalDocumentDataQuery, batchSize)
		if err != nil {
			return fmt.Errorf("failed to delete unreferenced version internal document data: %w", err)
		}

		logger.Debugf(ctx, "Deleted %d unreferenced version internal document data in current batch", res.RowsAffected())
		if res.RowsAffected() == 0 {
			return nil
		}
		deletedInternalDocData = res.RowsAffected()

		var cleanupRun entity.UnreferencedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = &entity.DeletedItemsCounts{}
		}
		cleanupRun.DeletedItems.VersionInternalDocumentData += deletedInternalDocData
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}

		return nil
	})

	return deletedInternalDocData, err
}

func (u unreferencedDataCleanupRepositoryImpl) DeleteUnreferencedComparisonInternalDocumentData(ctx context.Context, runId string, batchSize int) (int, error) {
	var deletedInternalDocData int

	err := u.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleteUnreferencedComparisonInternalDocumentDataQuery := `
			DELETE FROM comparison_internal_document_data cidd
			USING (
  				SELECT hash
  				FROM comparison_internal_document_data cidd2
  				WHERE NOT EXISTS (
    				SELECT 1 FROM comparison_internal_document cid WHERE cid.hash = cidd2.hash
  				)
  				ORDER BY cidd2.hash
  				LIMIT ?
			) del
			WHERE cidd.hash = del.hash;`
		res, err := tx.ExecContext(ctx, deleteUnreferencedComparisonInternalDocumentDataQuery, batchSize)
		if err != nil {
			return fmt.Errorf("failed to delete unreferenced comparison internal document data: %w", err)
		}

		logger.Debugf(ctx, "Deleted %d unreferenced comparison internal document data in current batch", res.RowsAffected())
		if res.RowsAffected() == 0 {
			return nil
		}
		deletedInternalDocData = res.RowsAffected()

		var cleanupRun entity.UnreferencedDataCleanupEntity
		err = tx.Model(&cleanupRun).
			Where("run_id = ?", runId).
			Select()
		if err != nil {
			return fmt.Errorf("failed to get current state of cleanup run: %w", err)
		}
		if cleanupRun.DeletedItems == nil {
			cleanupRun.DeletedItems = &entity.DeletedItemsCounts{}
		}
		cleanupRun.DeletedItems.ComparisonInternalDocumentData += deletedInternalDocData
		_, err = tx.Model(&cleanupRun).
			Column("deleted_items").
			WherePK().
			Update()
		if err != nil {
			return fmt.Errorf("failed to update cleanup run state: %w", err)
		}

		return nil
	})

	return deletedInternalDocData, err
}

func (u unreferencedDataCleanupRepositoryImpl) VacuumAffectedTables(ctx context.Context, runId string) error {
	var cleanupEntity entity.UnreferencedDataCleanupEntity
	err := u.cp.GetConnection().ModelContext(ctx, &cleanupEntity).
		Where("run_id = ?", runId).
		Select()
	if err != nil {
		return err
	}

	var vacuumErrors []string

	if cleanupEntity.DeletedItems != nil {
		deletedItems := cleanupEntity.DeletedItems
		if deletedItems.OperationData > 0 {
			logger.Debugf(ctx, "Vacuuming 'operation_data' table for %d deleted entries", deletedItems.OperationData)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
			logger.Trace(ctx, "Successfully vacuumed 'operation_data' table")
		}
	}
		if deletedItems.TSOperationData > 0 {
			logger.Debugf(ctx, "Vacuuming 'ts_operation_data' table for %d deleted entries", deletedItems.TSOperationData)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL ts_operation_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'ts_operation_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'ts_operation_data' table")
			}
		}
		if deletedItems.FTSOperationData > 0 {
			logger.Debugf(ctx, "Vacuuming 'fts_operation_data' table for %d deleted entries", deletedItems.FTSOperationData)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL fts_operation_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'fts_operation_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'fts_operation_data' table")
			}
		}
		if deletedItems.OperationGroupTemplate > 0 {
			logger.Debugf(ctx, "Vacuuming 'operation_group_template' table for %d deleted entries", deletedItems.OperationGroupTemplate)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation_group_template")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'operation_group_template' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'operation_group_template' table")
			}
		}
		if deletedItems.PublishedSrcArchives > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_sources_archives' table for %d deleted entries", deletedItems.PublishedSrcArchives)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_sources_archives")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_sources_archives' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'published_sources_archives' table")
			}
		}
		if deletedItems.PublishedData > 0 {
			logger.Debugf(ctx, "Vacuuming 'published_data' table for %d deleted build results", deletedItems.PublishedData)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL published_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'published_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Tracef(ctx, "Successfully vacuumed 'published_data' table")
			}
		}
		if deletedItems.VersionInternalDocumentData > 0 {
			logger.Debugf(ctx, "Vacuuming 'version_internal_document_data' table for %d deleted entries", deletedItems.VersionInternalDocumentData)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL version_internal_document_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'version_internal_document_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'version_internal_document_data' table")
			}
		}
		if deletedItems.ComparisonInternalDocumentData > 0 {
			logger.Debugf(ctx, "Vacuuming 'comparison_internal_document_data' table for %d deleted entries", deletedItems.ComparisonInternalDocumentData)
			_, err = u.cp.GetConnection().ExecContext(ctx, "VACUUM FULL comparison_internal_document_data")
			if err != nil {
				errorMsg := fmt.Sprintf("Failed to vacuum 'comparison_internal_document_data' table: %v", err)
				logger.Warn(ctx, errorMsg)
				vacuumErrors = append(vacuumErrors, errorMsg)
			} else {
				logger.Trace(ctx, "Successfully vacuumed 'comparison_internal_document_data' table")
			}
		}
	} else {
		logger.Info(ctx, "No deleted items found - skipping vacuum operations")
	}

	if len(vacuumErrors) > 0 {
		logger.Errorf(ctx, "Vacuum operations completed with %d errors: %s",
			len(vacuumErrors), strings.Join(vacuumErrors, "; "))
		return fmt.Errorf("vacuum operations failed: %s", strings.Join(vacuumErrors, "; "))
	}

	return nil
}
