package stages

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

func (d OpsMigration) StageTSRecalculate() error {
	log.Info("Start rebuilding text search tables for changed search scopes")

	log.Info("Calculating ts_operation_data")
	calculateAllTextSearchDataQuery := fmt.Sprintf(`
	insert into ts_operation_data
		select data_hash,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_all
		from operation_data
		where data_hash in (
			select distinct o.data_hash
			from operation o
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update
	set scope_all = EXCLUDED.scope_all`, d.ent.Id)
	_, err := d.cp.GetConnection().ExecContext(d.migrationCtx, calculateAllTextSearchDataQuery, view.ScopeAll)
	if err != nil {
		return fmt.Errorf("failed to calculate ts_operation_data: %w", err)
	}

	log.Info("Calculating fts_operation_data")
	calculateFullTextSearchOperationsQuery := fmt.Sprintf(`
	insert into fts_operation_data
		select data_hash,
		to_tsvector(convert_from(data,'UTF-8'))  data_vector
		from operation_data
		where data_hash in (
			select distinct o.data_hash
			from operation o
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update
	set data_vector = EXCLUDED.data_vector`, d.ent.Id)
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, calculateFullTextSearchOperationsQuery)
	if err != nil {
		return fmt.Errorf("failed to calculate fts_operation_data: %w", err)
	}

	log.Info("Calculating fts_latest_release_operation_data")
	recalculateLiteSearchQuery := fmt.Sprintf(`
	WITH latest_rev AS (
		SELECT pv.package_id, pv.version, MAX(pv.revision) AS revision
		FROM published_version pv
		INNER JOIN (SELECT DISTINCT package_id, version FROM migration."expired_ts_operation_data_%s") affected
			ON pv.package_id = affected.package_id AND pv.version = affected.version
		INNER JOIN package_group pg ON pg.id = pv.package_id AND pg.exclude_from_search = false
		WHERE pv.status = 'release' AND pv.deleted_at IS NULL
		GROUP BY pv.package_id, pv.version
	)
	INSERT INTO fts_latest_release_operation_data (package_id, version, revision, operation_id, api_type, data_vector)
	SELECT o.package_id, o.version, o.revision, o.operation_id, o.type,
		to_tsvector(convert_from(od.data, 'UTF-8') || ' ' || coalesce(o.title, ''))
	FROM operation o
	INNER JOIN operation_data od ON o.data_hash = od.data_hash
	INNER JOIN latest_rev lr ON o.package_id = lr.package_id AND o.version = lr.version AND o.revision = lr.revision
	ON CONFLICT (package_id, version, revision, operation_id)
	DO UPDATE SET data_vector = EXCLUDED.data_vector`, d.ent.Id)
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateLiteSearchQuery)
	if err != nil {
		return fmt.Errorf("failed to recalculate fts_latest_release_operation_data: %w", err)
	}

	log.Info("Calculating fts_operation_search_text")
	recalculateFtsOperationSearchTextQuery := fmt.Sprintf(`
	INSERT INTO fts_operation_search_text (package_id, version, revision, operation_id, api_type, status, search_data_hash, data_vector)
		SELECT tmp.package_id, tmp.version, tmp.revision, tmp.operation_id,
			tmp.api_type, tmp.status, tmp.search_data_hash,
			to_tsvector(convert_from(tmp.search_text_data, 'UTF-8') || ' ' || coalesce(tmp.title, ''))
		FROM migration."fts_operation_search_text_tmp_%s" tmp
	ON CONFLICT (package_id, version, revision, operation_id) DO UPDATE
		SET search_data_hash = EXCLUDED.search_data_hash,
			data_vector = EXCLUDED.data_vector`, d.ent.Id)
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, recalculateFtsOperationSearchTextQuery)
	if err != nil {
		return fmt.Errorf("failed to recalculate fts_operation_search_text: %w", err)
	}

	log.Info("Finished rebuilding text search tables for changed data")

	return nil
}
