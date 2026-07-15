package repository

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type DDLContractRepository interface {
	ListDdlEntities(packageId, version string, revision int, textFilter string, limit, offset int) ([]*entity.DDLContractEntity, error)
	GetDdlEntity(packageId, version string, revision int, ddlEntityId string, includeData bool) (*entity.DDLContractEntity, []byte, error)
	GetDdlEntityChanges(comparisonId, ddlEntityId string, severities []string) (*entity.DDLContractComparisonEntity, error)
	GetDdlEntityChangesSummary(comparisonId, ddlEntityId string) (*view.ChangeSummary, error)
	ListChangedDdlEntities(comparisonId, refPackageId string, severities []string, textFilter string, limit, offset int) ([]*entity.DDLContractComparisonEntity, error)
	GetEntitiesCount(packageId, version string, revision int) ([]entity.DDLContractKindCountEntity, error)
	GetDdlEntitiesInfo(packageId, version string, revision int) (map[string]string, error)
	GetComparisonSummary(comparisonId string) (*view.ChangeSummary, *view.ChangeSummary, error)
	GlobalSearchForDDL(searchQuery *entity.GlobalContractSearchQuery) ([]entity.DDLContractSearchResult, error)
}

type ddlContractRepositoryImpl struct {
	cp db.ConnectionProvider
}

func NewDDLContractRepository(cp db.ConnectionProvider) DDLContractRepository {
	return &ddlContractRepositoryImpl{cp: cp}
}

func (r *ddlContractRepositoryImpl) ListDdlEntities(packageId, version string, revision int, textFilter string, limit, offset int) ([]*entity.DDLContractEntity, error) {
	var result []*entity.DDLContractEntity
	query := r.cp.GetConnection().Model(&result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision)
	if textFilter != "" {
		pattern := fmt.Sprintf("%%%s%%", textFilter)
		query = query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			q.WhereOr("name ILIKE ?", pattern).
				WhereOr("description ILIKE ?", pattern)
			return q, nil
		})
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	err := query.Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (r *ddlContractRepositoryImpl) GetDdlEntity(packageId, version string, revision int, ddlEntityId string, includeData bool) (*entity.DDLContractEntity, []byte, error) {
	conn := r.cp.GetConnection()
	ent := new(entity.DDLContractEntity)
	err := conn.Model(ent).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("ddl_entity_id = ?", ddlEntityId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	var data []byte
	if includeData && ent.DataHash != nil {
		dataEnt := new(entity.DDLContractDataEntity)
		err = conn.Model(dataEnt).Where("data_hash = ?", *ent.DataHash).First()
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil, fmt.Errorf("no data found for ddl entity %s data hash = %s", ddlEntityId, *ent.DataHash)
			}
			return nil, nil, err
		}
		data = dataEnt.Data
	}
	return ent, data, nil
}

func (r *ddlContractRepositoryImpl) GetDdlEntityChanges(comparisonId, ddlEntityId string, severities []string) (*entity.DDLContractComparisonEntity, error) {
	ent := new(entity.DDLContractComparisonEntity)
	query := r.cp.GetConnection().Model(ent).
		Where("comparison_id = ?", comparisonId).
		Where("ddl_entity_id = ?", ddlEntityId)
	if len(severities) > 0 {
		query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			for _, severity := range severities {
				q.WhereOr("(changes_summary->?)::int>0", severity)
			}
			return q, nil
		})
	}
	err := query.First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

func (r *ddlContractRepositoryImpl) GetDdlEntityChangesSummary(comparisonId, ddlEntityId string) (*view.ChangeSummary, error) {
	type row struct {
		ChangesSummary view.ChangeSummary `pg:"changes_summary"`
	}
	var rows []row
	_, err := r.cp.GetConnection().Query(&rows,
		`SELECT changes_summary FROM ddl_comparison WHERE comparison_id=? AND ddl_entity_id=?`, comparisonId, ddlEntityId)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return &view.ChangeSummary{}, nil
	}
	return &rows[0].ChangesSummary, nil
}

func (r *ddlContractRepositoryImpl) ListChangedDdlEntities(comparisonId, refPackageId string, severities []string, textFilter string, limit, offset int) ([]*entity.DDLContractComparisonEntity, error) {
	var result []*entity.DDLContractComparisonEntity
	query := r.cp.GetConnection().Model(&result).
		Where("comparison_id = ?", comparisonId)
	if refPackageId != "" {
		query = query.Where("package_id = ?", refPackageId)
	}
	if textFilter != "" {
		pattern := fmt.Sprintf("%%%s%%", textFilter)
		query = query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			q.WhereOr("name ILIKE ?", pattern).
				WhereOr("description ILIKE ?", pattern).
				WhereOr("previous_name ILIKE ?", pattern).
				WhereOr("previous_description ILIKE ?", pattern)
			return q, nil
		})
	}
	if len(severities) > 0 {
		query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			for _, severity := range severities {
				q.WhereOr("(changes_summary->?)::int>0", severity)
			}
			return q, nil
		})
	}
	query = query.
		OrderExpr("(changes_summary->'breaking')::int > 0 DESC").
		OrderExpr("(changes_summary->'semi-breaking')::int > 0 DESC").
		OrderExpr("(changes_summary->'deprecated')::int > 0 DESC").
		OrderExpr("(changes_summary->'non-breaking')::int > 0 DESC").
		OrderExpr("(changes_summary->'annotation')::int > 0 DESC").
		OrderExpr("(changes_summary->'unclassified')::int > 0 DESC").
		Order("ddl_entity_id")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	err := query.Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (r *ddlContractRepositoryImpl) GetEntitiesCount(packageId, version string, revision int) ([]entity.DDLContractKindCountEntity, error) {
	var result []entity.DDLContractKindCountEntity
	_, err := r.cp.GetConnection().Query(&result,
		`SELECT kind, count(*) as count FROM ddl_tables WHERE package_id=? AND version=? AND revision=? GROUP BY kind`,
		packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetDdlEntitiesInfo returns a map of ddl_entity_id -> data_hash for the given version,
// used to resolve current/previous data hashes when building ddl_comparison rows
// (mirrors OperationRepository.GetOperationsInfo for the operation changelog).
func (r *ddlContractRepositoryImpl) GetDdlEntitiesInfo(packageId, version string, revision int) (map[string]string, error) {
	type row struct {
		DdlEntityId string  `pg:"ddl_entity_id"`
		DataHash    *string `pg:"data_hash"`
	}
	var rows []row
	_, err := r.cp.GetConnection().Query(&rows,
		`SELECT ddl_entity_id, data_hash FROM ddl_tables WHERE package_id=? AND version=? AND revision=?`,
		packageId, version, revision)
	if err != nil {
		return nil, err
	}
	result := make(map[string]string, len(rows))
	for _, rw := range rows {
		if rw.DataHash != nil {
			result[rw.DdlEntityId] = *rw.DataHash
		}
	}
	return result, nil
}

// GetComparisonSummary returns the aggregated DDL changes summary and the number of impacted
// entities for the given comparison, read from version_comparison.contract_types (ddl entry).
func (r *ddlContractRepositoryImpl) GetComparisonSummary(comparisonId string) (*view.ChangeSummary, *view.ChangeSummary, error) {
	comparison := new(entity.VersionComparisonEntity)
	err := r.cp.GetConnection().Model(comparison).
		Where("comparison_id = ?", comparisonId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	for _, ct := range comparison.ContractTypes {
		if ct.ContractType == view.ContractTypeDdl {
			changesSummary := ct.ChangesSummary
			numberOfImpactedEntities := ct.NumberOfImpactedEntities
			return &changesSummary, &numberOfImpactedEntities, nil
		}
	}
	return nil, nil, nil
}

func (r *ddlContractRepositoryImpl) GlobalSearchForDDL(searchQuery *entity.GlobalContractSearchQuery) ([]entity.DDLContractSearchResult, error) {
	_, err := r.cp.GetConnection().Exec("select websearch_to_tsquery(?)", searchQuery.OriginalTextInput)
	if err != nil {
		return nil, fmt.Errorf("invalid search string: %v", err.Error())
	}
	var result []entity.DDLContractSearchResult
	ddlSearchQuery := `
select
    dt.package_id,
    pg.name,
    dt.version,
    dt.revision,
    pv.status,
    dt.ddl_entity_id,
    dt.kind,
    dt.schema_name,
    dt.name,
    parent_package_names(dt.package_id) parent_names
from ddl_tables dt
         inner join (
    SELECT DISTINCT ON (rank, package_id, ddl_entity_id)
        ts_rank(data_vector, search_query) as rank,
        ts.package_id    as package_id,
        ts.ddl_entity_id as ddl_entity_id,
        ts.version       as version,
        ts.revision      as revision

    FROM fts_ddl_search_text ts,
         websearch_to_tsquery(?original_text_input) search_query
    WHERE ts.status = ?status
        and (?kinds = '{}' or ts.kind = ANY(?kinds::text[]))
        and (?versions = '{}' or version like ANY(
						select id from unnest(?versions::text[]) id))
        and (package_id like ANY(
						select id from unnest(?packages::text[]) id
						union
						select id||'.%' from unnest(?packages::text[]) id))
        and search_query @@ data_vector
    ORDER BY ts_rank(data_vector, search_query) DESC,
             package_id,
             ddl_entity_id desc,
             version DESC,
             revision DESC
    LIMIT ?limit OFFSET ?offset
) all_ts
                   on all_ts.package_id = dt.package_id and
                      all_ts.version = dt.version and
                      all_ts.revision = dt.revision and
                      all_ts.ddl_entity_id = dt.ddl_entity_id

inner join published_version pv on dt.package_id=pv.package_id and dt.version=pv.version and dt.revision=pv.revision
inner join package_group pg on dt.package_id=pg.id

where all_ts.rank > 0
and pv.deleted_at is null
and pv.published_at >= ?start_date
and pv.published_at <= ?end_date
order by all_ts.rank desc, dt.ddl_entity_id
limit ?limit;
`
	_, err = r.cp.GetConnection().Model(searchQuery).Query(&result, ddlSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
