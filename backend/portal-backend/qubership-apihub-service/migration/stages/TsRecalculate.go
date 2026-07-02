package stages

import (
	"fmt"

	"github.com/go-pg/pg/v10/orm"
	log "github.com/sirupsen/logrus"
)

func (d OpsMigration) StageTSRecalculate() error {
	log.Info("Start calculating text search index")

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

	log.Info("Finished rebuilding text search tables for changed data")

	return nil
}
