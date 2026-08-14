package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type DDLContractRepository interface {
	ListDdlEntities(ctx context.Context, packageId, version string, revision int, refPackageId, textFilter string, limit, offset int) ([]*entity.DDLContractEntity, error)
	GetDdlEntity(ctx context.Context, packageId, version string, revision int, ddlEntityId string) (*entity.DDLContractEntity, []byte, error)
	GetDdlEntityChanges(ctx context.Context, comparisonId, ddlEntityId, previousVersionDdlEntityId, refPackageId string, severities []string) (*entity.DDLContractComparisonEntity, error)
	GetDdlEntityChangesSummary(ctx context.Context, comparisonId, ddlEntityId, refPackageId string) (*view.ChangeSummary, error)
	ListChangedDdlEntities(ctx context.Context, comparisonId, refPackageId string, severities []string, textFilter string, limit, offset int) ([]*entity.DDLContractComparisonEntity, error)
	GetEntitiesCount(ctx context.Context, packageId, version string, revision int) ([]entity.DDLContractKindCountEntity, error)
	GetDdlEntitiesInfo(ctx context.Context, packageId, version string, revision int) (map[string]string, error)
	GetComparisonSummary(ctx context.Context, comparisonId string) (*view.ChangeSummary, *view.ChangeSummary, error)
	GlobalSearchForDDL(ctx context.Context, searchQuery *entity.GlobalContractSearchQuery) ([]entity.DDLContractSearchResult, error)
}

type ddlContractRepositoryImpl struct {
	cp db.ConnectionProvider
}

func NewDDLContractRepository(cp db.ConnectionProvider) DDLContractRepository {
	return &ddlContractRepositoryImpl{cp: cp}
}

func (r *ddlContractRepositoryImpl) ListDdlEntities(ctx context.Context, packageId, version string, revision int, refPackageId, textFilter string, limit, offset int) ([]*entity.DDLContractEntity, error) {
	var result []*entity.DDLContractEntity
	query := r.cp.GetConnection().WithContext(ctx).Model(&result).
		ColumnExpr("ddl_tables.*")
	query = joinVersionRefs(query, "ddl_tables", packageId, version, revision, refPackageId)
	if textFilter != "" {
		pattern := fmt.Sprintf("%%%s%%", textFilter)
		query = query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			q.WhereOr("ddl_tables.name ILIKE ?", pattern).
				WhereOr("ddl_tables.description ILIKE ?", pattern)
			return q, nil
		})
	}
	query = query.Order("ddl_tables.package_id", "ddl_tables.version", "ddl_tables.revision", "ddl_tables.ddl_entity_id")
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

func (r *ddlContractRepositoryImpl) GetDdlEntity(ctx context.Context, packageId, version string, revision int, ddlEntityId string) (*entity.DDLContractEntity, []byte, error) {
	conn := r.cp.GetConnection().WithContext(ctx)
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
	if ent.DataHash != nil {
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

func (r *ddlContractRepositoryImpl) GetDdlEntityChanges(ctx context.Context, comparisonId, ddlEntityId, previousVersionDdlEntityId, refPackageId string, severities []string) (*entity.DDLContractComparisonEntity, error) {
	ent := new(entity.DDLContractComparisonEntity)
	query := r.cp.GetConnection().WithContext(ctx).Model(ent).
		Where(comparisonIdWithRefsCondition, comparisonId, comparisonId)
	if refPackageId != "" {
		query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			return q.Where("package_id = ?", refPackageId).
				WhereOr("previous_package_id = ?", refPackageId), nil
		})
	}
	if previousVersionDdlEntityId != "" {
		query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			return q.Where("ddl_entity_id = ?", ddlEntityId).
				WhereOr("previous_ddl_entity_id = ?", previousVersionDdlEntityId), nil
		})
	} else {
		query.Where("ddl_entity_id = ?", ddlEntityId)
	}
	if len(severities) > 0 {
		query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			for _, severity := range severities {
				q.WhereOr("(changes_summary->?)::int>0", severity)
			}
			return q, nil
		})
	}
	// DDLContractComparisonEntity declares no primary keys (mirroring OperationComparisonEntity),
	// so use an explicit order + limit instead of First(), which requires declared PKs.
	err := query.
		OrderExpr("data_hash, previous_data_hash").
		Limit(1).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

// GetDdlEntityChangesSummary sums the change summaries of every matched row: with refs expanded,
// the same ddl_entity_id may legitimately exist in several referenced packages of a dashboard;
// refPackageId narrows the result to one of them.
func (r *ddlContractRepositoryImpl) GetDdlEntityChangesSummary(ctx context.Context, comparisonId, ddlEntityId, refPackageId string) (*view.ChangeSummary, error) {
	type row struct {
		ChangesSummary view.ChangeSummary `pg:"changes_summary"`
	}
	var rows []row
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&rows,
		`SELECT changes_summary FROM ddl_comparison
		WHERE `+comparisonIdWithRefsCondition+`
		AND ddl_entity_id=? AND (?='' OR package_id=? OR previous_package_id=?)`,
		comparisonId, comparisonId, ddlEntityId, refPackageId, refPackageId, refPackageId)
	if err != nil {
		return nil, err
	}
	total := &view.ChangeSummary{}
	for _, r := range rows {
		total.Add(r.ChangesSummary)
	}
	return total, nil
}

func (r *ddlContractRepositoryImpl) ListChangedDdlEntities(ctx context.Context, comparisonId, refPackageId string, severities []string, textFilter string, limit, offset int) ([]*entity.DDLContractComparisonEntity, error) {
	var result []*entity.DDLContractComparisonEntity
	query := r.cp.GetConnection().WithContext(ctx).Model(&result).
		Where(comparisonIdWithRefsCondition, comparisonId, comparisonId)
	if refPackageId != "" {
		query = query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			return q.Where("package_id = ?", refPackageId).
				WhereOr("previous_package_id = ?", refPackageId), nil
		})
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
		Order("package_id", "previous_package_id", "ddl_entity_id")
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

func (r *ddlContractRepositoryImpl) GetEntitiesCount(ctx context.Context, packageId, version string, revision int) ([]entity.DDLContractKindCountEntity, error) {
	var result []entity.DDLContractKindCountEntity
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result,
		versionWithRefsCTE+`
		select dt.kind, count(*) as count
		from ddl_tables dt
		inner join versions v on dt.package_id = v.package_id and dt.version = v.version and dt.revision = v.revision
		group by dt.kind`,
		packageId, version, revision, packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetDdlEntitiesInfo returns a map of ddl_entity_id -> data_hash for the given version,
// used to resolve current/previous data hashes when building ddl_comparison rows
// (mirrors OperationRepository.GetOperationsInfo for the operation changelog).
func (r *ddlContractRepositoryImpl) GetDdlEntitiesInfo(ctx context.Context, packageId, version string, revision int) (map[string]string, error) {
	type row struct {
		DdlEntityId string  `pg:"ddl_entity_id"`
		DataHash    *string `pg:"data_hash"`
	}
	var rows []row
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&rows,
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
func (r *ddlContractRepositoryImpl) GetComparisonSummary(ctx context.Context, comparisonId string) (*view.ChangeSummary, *view.ChangeSummary, error) {
	comparison := new(entity.VersionComparisonEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(comparison).
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

func (r *ddlContractRepositoryImpl) GlobalSearchForDDL(ctx context.Context, searchQuery *entity.GlobalContractSearchQuery) ([]entity.DDLContractSearchResult, error) {
	_, err := r.cp.GetConnection().WithContext(ctx).Exec("select websearch_to_tsquery(?)", searchQuery.OriginalTextInput)
	if err != nil {
		return nil, fmt.Errorf("invalid search string: %v", err.Error())
	}
	var result []entity.DDLContractSearchResult
	ddlSearchQuery := `
select
    dt.package_id,
    pg.name as package_name,
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
	_, err = r.cp.GetConnection().WithContext(ctx).Model(searchQuery).Query(&result, ddlSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
