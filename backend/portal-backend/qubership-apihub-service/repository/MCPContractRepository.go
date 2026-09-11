package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type MCPContractRepository interface {
	ListMcpEntities(ctx context.Context, packageId, version string, revision int, kind, mcpEndpoint, refPackageId, textFilter string, limit, offset int) ([]*entity.MCPContractEntity, error)
	GetMcpEntity(ctx context.Context, packageId, version string, revision int, mcpEntityId string) (*entity.MCPContractEntity, []byte, error)
	GetEntitiesCount(ctx context.Context, packageId, version string, revision int) ([]entity.MCPContractKindCountEntity, error)
	GetEntitiesCountByEndpoint(ctx context.Context, packageId, version string, revision int) ([]entity.MCPContractEndpointCountEntity, error)
	GlobalSearchForMCP(ctx context.Context, searchQuery *entity.GlobalContractSearchQuery) ([]entity.MCPContractSearchResult, error)
}

type mcpContractRepositoryImpl struct {
	cp db.ConnectionProvider
}

func NewMCPContractRepository(cp db.ConnectionProvider) MCPContractRepository {
	return &mcpContractRepositoryImpl{cp: cp}
}

func (r *mcpContractRepositoryImpl) ListMcpEntities(ctx context.Context, packageId, version string, revision int, kind, mcpEndpoint, refPackageId, textFilter string, limit, offset int) ([]*entity.MCPContractEntity, error) {
	var result []*entity.MCPContractEntity
	query := r.cp.GetConnection().WithContext(ctx).Model(&result).
		ColumnExpr("mcp_entities.*")
	query = joinVersionRefs(query, "mcp_entities", packageId, version, revision, refPackageId)
	if kind != "" {
		query = query.Where("mcp_entities.kind = ?", kind)
	}
	if mcpEndpoint != "" {
		query = query.Where("mcp_entities.mcp_endpoint = ?", mcpEndpoint)
	}
	if textFilter != "" {
		pattern := fmt.Sprintf("%%%s%%", textFilter)
		query = query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			q.WhereOr("mcp_entities.title ILIKE ?", pattern).
				WhereOr("mcp_entities.description ILIKE ?", pattern)
			return q, nil
		})
	}
	query = query.Order("mcp_entities.package_id", "mcp_entities.version", "mcp_entities.revision", "mcp_entities.mcp_entity_id")
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

func (r *mcpContractRepositoryImpl) GetMcpEntity(ctx context.Context, packageId, version string, revision int, mcpEntityId string) (*entity.MCPContractEntity, []byte, error) {
	conn := r.cp.GetConnection().WithContext(ctx)
	ent := new(entity.MCPContractEntity)
	err := conn.Model(ent).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("mcp_entity_id = ?", mcpEntityId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	var data []byte
	if ent.DataHash != nil {
		dataEnt := new(entity.MCPContractDataEntity)
		err = conn.Model(dataEnt).Where("data_hash = ?", *ent.DataHash).First()
		if err != nil {
			if err == pg.ErrNoRows {
				return nil, nil, fmt.Errorf("failed to find mcp entity data with id = %s", *ent.DataHash)
			} else {
				return nil, nil, err
			}
		} else {
			data = dataEnt.Data
		}
	}
	return ent, data, nil
}

func (r *mcpContractRepositoryImpl) GetEntitiesCount(ctx context.Context, packageId, version string, revision int) ([]entity.MCPContractKindCountEntity, error) {
	var result []entity.MCPContractKindCountEntity
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result,
		versionWithRefsCTE+`
		select me.kind, count(*) as count
		from mcp_entities me
		inner join versions v on me.package_id = v.package_id and me.version = v.version and me.revision = v.revision
		group by me.kind`,
		packageId, version, revision, packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *mcpContractRepositoryImpl) GetEntitiesCountByEndpoint(ctx context.Context, packageId, version string, revision int) ([]entity.MCPContractEndpointCountEntity, error) {
	var result []entity.MCPContractEndpointCountEntity
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result,
		versionWithRefsCTE+`
		select me.mcp_endpoint, me.kind, count(*) as count
		from mcp_entities me
		inner join versions v on me.package_id = v.package_id and me.version = v.version and me.revision = v.revision
		group by me.mcp_endpoint, me.kind`,
		packageId, version, revision, packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *mcpContractRepositoryImpl) GlobalSearchForMCP(ctx context.Context, searchQuery *entity.GlobalContractSearchQuery) ([]entity.MCPContractSearchResult, error) {
	if len(searchQuery.VisibleRoots) == 0 {
		return nil, nil
	}
	_, err := r.cp.GetConnection().WithContext(ctx).Exec("select websearch_to_tsquery(?)", searchQuery.OriginalTextInput)
	if err != nil {
		return nil, fmt.Errorf("invalid search string: %v", err.Error())
	}
	var result []entity.MCPContractSearchResult
	// Privacy-aware search against global_search.fts_mcp_search_text.
	// Deprecated: public.fts_mcp_search_text is dual-written but no longer used for global search reads.
	mcpSearchQuery := `
select
	me.package_id,
	pg.name,
	me.version,
	me.revision,
	pv.status,
	me.mcp_entity_id,
	me.kind,
	me.title,
	me.mcp_endpoint,
	parent_package_names(me.package_id) parent_names
from mcp_entities me
			inner join (
	SELECT DISTINCT ON (rank, package_id, mcp_entity_id)
		ts_rank(data_vector, search_query) as rank,
		ts.package_id    as package_id,
		ts.mcp_entity_id as mcp_entity_id,
		ts.version       as version,
		ts.revision      as revision

    FROM global_search.fts_mcp_search_text ts,
         websearch_to_tsquery(?original_text_input) search_query
    WHERE ts.workspace_id = ?workspace_id
        and ts.status = ?status
        and (?kinds = '{}' or ts.kind = ANY(?kinds::text[]))
        and (?versions = '{}' or version like ANY(
						select id from unnest(?versions::text[]) id))
		and (package_id like ANY(
						select id from unnest(?packages::text[]) id
						union
						select id||'.%' from unnest(?packages::text[]) id))
        and (package_id like ANY(
						select id from unnest(?visible_roots::text[]) id
						union
						select id||'.%' from unnest(?visible_roots::text[]) id))
        and search_query @@ data_vector
    ORDER BY ts_rank(data_vector, search_query) DESC,
             package_id,
             mcp_entity_id desc,
             version DESC,
             revision DESC
    LIMIT ?limit OFFSET ?offset
) all_ts
					on all_ts.package_id = me.package_id and
						all_ts.version = me.version and
						all_ts.revision = me.revision and
						all_ts.mcp_entity_id = me.mcp_entity_id

inner join published_version pv on me.package_id=pv.package_id and me.version=pv.version and me.revision=pv.revision
inner join package_group pg on me.package_id=pg.id

where all_ts.rank > 0
and pv.deleted_at is null
and pv.published_at >= ?start_date
and pv.published_at <= ?end_date
order by all_ts.rank desc, me.mcp_entity_id
limit ?limit;
`
	_, err = r.cp.GetConnection().WithContext(ctx).Model(searchQuery).Query(&result, mcpSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
