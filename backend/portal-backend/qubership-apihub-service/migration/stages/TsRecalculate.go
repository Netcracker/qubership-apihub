package stages

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	log "github.com/sirupsen/logrus"
)

func (d OpsMigration) StageTSRecalculate() error {
	log.Info("Start calculating text search index")

	// Deprecated: public.fts_* dual-write; prefer global_search.fts_*.
	recalculateFtsOperationSearchTextQuery := fmt.Sprintf(`
	INSERT INTO fts_operation_search_text (package_id, version, revision, operation_id, api_type, status, search_data_hash, data_vector)
		SELECT tmp.package_id, tmp.version, tmp.revision, tmp.operation_id,
			tmp.api_type, tmp.status, tmp.search_data_hash,
			to_tsvector(convert_from(tmp.search_text_data, 'UTF-8') || ' ' || coalesce(tmp.title, ''))
		FROM migration."fts_operation_search_text_tmp_%s" tmp
	ON CONFLICT (package_id, version, revision, operation_id) DO UPDATE
		SET search_data_hash = EXCLUDED.search_data_hash,
			data_vector = EXCLUDED.data_vector`, d.ent.Id)
	_, err := withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateFtsOperationSearchTextQuery)
	})
	if err != nil {
		return fmt.Errorf("failed to recalculate fts_operation_search_text: %w", err)
	}

	if err := d.ensureGlobalSearchPartitionsFromTmp(
		fmt.Sprintf(`SELECT DISTINCT split_part(package_id, '.', 1) FROM migration."fts_operation_search_text_tmp_%s"`, d.ent.Id),
		fmt.Sprintf(`SELECT DISTINCT split_part(package_id, '.', 1) FROM migration."fts_mcp_search_text_tmp_%s"`, d.ent.Id),
		fmt.Sprintf(`SELECT DISTINCT split_part(package_id, '.', 1) FROM migration."fts_ddl_search_text_tmp_%s"`, d.ent.Id),
	); err != nil {
		return err
	}

	recalculateGsOpsQuery := fmt.Sprintf(`
	INSERT INTO global_search.fts_operation_search_text (workspace_id, package_id, version, revision, operation_id, api_type, status, search_data_hash, data_vector)
		SELECT split_part(tmp.package_id, '.', 1), tmp.package_id, tmp.version, tmp.revision, tmp.operation_id,
			tmp.api_type, tmp.status, tmp.search_data_hash,
			to_tsvector(convert_from(tmp.search_text_data, 'UTF-8') || ' ' || coalesce(tmp.title, ''))
		FROM migration."fts_operation_search_text_tmp_%s" tmp
	ON CONFLICT (workspace_id, package_id, version, revision, operation_id) DO UPDATE
		SET search_data_hash = EXCLUDED.search_data_hash,
			data_vector = EXCLUDED.data_vector,
			status = EXCLUDED.status,
			api_type = EXCLUDED.api_type`, d.ent.Id)
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateGsOpsQuery)
	})
	if err != nil {
		return fmt.Errorf("failed to recalculate global_search.fts_operation_search_text: %w", err)
	}

	log.Info("Calculating fts_mcp_search_text")
	recalculateFtsMcpSearchTextQuery := fmt.Sprintf(`
	INSERT INTO fts_mcp_search_text (package_id, version, revision, mcp_entity_id, status, kind, search_data_hash, data_vector)
		SELECT tmp.package_id, tmp.version, tmp.revision, tmp.mcp_entity_id,
			tmp.status, tmp.kind, tmp.search_data_hash,
			to_tsvector(convert_from(tmp.search_text_data, 'UTF-8') || ' ')
		FROM migration."fts_mcp_search_text_tmp_%s" tmp
	ON CONFLICT (package_id, version, revision, mcp_entity_id) DO UPDATE
		SET search_data_hash = EXCLUDED.search_data_hash,
			data_vector = EXCLUDED.data_vector`, d.ent.Id)
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateFtsMcpSearchTextQuery)
	})
	if err != nil {
		return fmt.Errorf("failed to recalculate fts_mcp_search_text: %w", err)
	}

	recalculateGsMcpQuery := fmt.Sprintf(`
	INSERT INTO global_search.fts_mcp_search_text (workspace_id, package_id, version, revision, mcp_entity_id, status, kind, search_data_hash, data_vector)
		SELECT split_part(tmp.package_id, '.', 1), tmp.package_id, tmp.version, tmp.revision, tmp.mcp_entity_id,
			tmp.status, tmp.kind, tmp.search_data_hash,
			to_tsvector(convert_from(tmp.search_text_data, 'UTF-8') || ' ')
		FROM migration."fts_mcp_search_text_tmp_%s" tmp
	ON CONFLICT (workspace_id, package_id, version, revision, mcp_entity_id) DO UPDATE
		SET search_data_hash = EXCLUDED.search_data_hash,
			data_vector = EXCLUDED.data_vector,
			status = EXCLUDED.status,
			kind = EXCLUDED.kind`, d.ent.Id)
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateGsMcpQuery)
	})
	if err != nil {
		return fmt.Errorf("failed to recalculate global_search.fts_mcp_search_text: %w", err)
	}

	log.Info("Calculating fts_ddl_search_text")
	recalculateFtsDdlSearchTextQuery := fmt.Sprintf(`
	INSERT INTO fts_ddl_search_text (package_id, version, revision, ddl_entity_id, status, kind, search_data_hash, data_vector)
		SELECT tmp.package_id, tmp.version, tmp.revision, tmp.ddl_entity_id,
			tmp.status, tmp.kind, tmp.search_data_hash,
			to_tsvector(convert_from(tmp.search_text_data, 'UTF-8'))
		FROM migration."fts_ddl_search_text_tmp_%s" tmp
	ON CONFLICT (package_id, version, revision, ddl_entity_id) DO UPDATE
		SET search_data_hash = EXCLUDED.search_data_hash,
			data_vector = EXCLUDED.data_vector`, d.ent.Id)
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateFtsDdlSearchTextQuery)
	})
	if err != nil {
		return fmt.Errorf("failed to recalculate fts_ddl_search_text: %w", err)
	}

	recalculateGsDdlQuery := fmt.Sprintf(`
	INSERT INTO global_search.fts_ddl_search_text (workspace_id, package_id, version, revision, ddl_entity_id, status, kind, search_data_hash, data_vector)
		SELECT split_part(tmp.package_id, '.', 1), tmp.package_id, tmp.version, tmp.revision, tmp.ddl_entity_id,
			tmp.status, tmp.kind, tmp.search_data_hash,
			to_tsvector(convert_from(tmp.search_text_data, 'UTF-8'))
		FROM migration."fts_ddl_search_text_tmp_%s" tmp
	ON CONFLICT (workspace_id, package_id, version, revision, ddl_entity_id) DO UPDATE
		SET search_data_hash = EXCLUDED.search_data_hash,
			data_vector = EXCLUDED.data_vector,
			status = EXCLUDED.status,
			kind = EXCLUDED.kind`, d.ent.Id)
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateGsDdlQuery)
	})
	if err != nil {
		return fmt.Errorf("failed to recalculate global_search.fts_ddl_search_text: %w", err)
	}

	log.Info("Finished rebuilding text search tables for changed data")

	return nil
}

func (d OpsMigration) ensureGlobalSearchPartitionsFromTmp(queries ...string) error {
	seen := make(map[string]bool)
	for _, q := range queries {
		var workspaceIds []string
		_, err := withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().QueryContext(d.migrationCtx, &workspaceIds, q)
		})
		if err != nil {
			return fmt.Errorf("failed to list workspaces for global_search partitions: %w", err)
		}
		for _, workspaceId := range workspaceIds {
			if workspaceId == "" || seen[workspaceId] {
				continue
			}
			seen[workspaceId] = true
			err = d.cp.GetConnection().RunInTransaction(d.migrationCtx, func(tx *pg.Tx) error {
				return repository.EnsureGlobalSearchPartitionsTx(tx, workspaceId)
			})
			if err != nil {
				return fmt.Errorf("failed to ensure global_search partitions for workspace %s: %w", workspaceId, err)
			}
		}
	}
	return nil
}
