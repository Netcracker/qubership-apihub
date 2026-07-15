package repository

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type MCPContractRepository interface {
	ListMcpEntities(packageId, version string, revision int, kind, mcpEndpoint, textFilter string, limit, offset int) ([]*entity.MCPContractEntity, error)
	GetMcpEntity(packageId, version string, revision int, mcpEntityId string, includeData bool) (*entity.MCPContractEntity, []byte, error)
	GetEntitiesCount(packageId, version string, revision int) ([]entity.MCPContractKindCountEntity, error)
	GetEntitiesCountByEndpoint(packageId, version string, revision int) ([]entity.MCPContractEndpointCountEntity, error)
	GlobalSearchForMCP(searchQuery *entity.GlobalContractSearchQuery) ([]entity.MCPContractSearchResult, error)
}

type mcpContractRepositoryImpl struct {
	cp db.ConnectionProvider
}

func NewMCPContractRepository(cp db.ConnectionProvider) MCPContractRepository {
	return &mcpContractRepositoryImpl{cp: cp}
}

func (r *mcpContractRepositoryImpl) ListMcpEntities(packageId, version string, revision int, kind, mcpEndpoint, textFilter string, limit, offset int) ([]*entity.MCPContractEntity, error) {
	var result []*entity.MCPContractEntity
	query := r.cp.GetConnection().Model(&result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision)
	if kind != "" {
		query = query.Where("kind = ?", kind)
	}
	if mcpEndpoint != "" {
		query = query.Where("mcp_endpoint = ?", mcpEndpoint)
	}
	if textFilter != "" {
		pattern := fmt.Sprintf("%%%s%%", textFilter)
		query = query.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			q.WhereOr("title ILIKE ?", pattern).
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

func (r *mcpContractRepositoryImpl) GetMcpEntity(packageId, version string, revision int, mcpEntityId string, includeData bool) (*entity.MCPContractEntity, []byte, error) {
	conn := r.cp.GetConnection()
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
	if includeData && ent.DataHash != nil {
		dataEnt := new(entity.MCPContractDataEntity)
		err = conn.Model(dataEnt).Where("data_hash = ?", *ent.DataHash).First()
		if err == nil {
			data = dataEnt.Data
		}
	}
	return ent, data, nil
}

func (r *mcpContractRepositoryImpl) GetEntitiesCount(packageId, version string, revision int) ([]entity.MCPContractKindCountEntity, error) {
	var result []entity.MCPContractKindCountEntity
	_, err := r.cp.GetConnection().Query(&result,
		`SELECT kind, count(*) as count FROM mcp_entities WHERE package_id=? AND version=? AND revision=? GROUP BY kind`,
		packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *mcpContractRepositoryImpl) GetEntitiesCountByEndpoint(packageId, version string, revision int) ([]entity.MCPContractEndpointCountEntity, error) {
	var result []entity.MCPContractEndpointCountEntity
	_, err := r.cp.GetConnection().Query(&result,
		`SELECT mcp_endpoint, kind, count(*) as count FROM mcp_entities WHERE package_id=? AND version=? AND revision=? GROUP BY mcp_endpoint, kind`,
		packageId, version, revision)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *mcpContractRepositoryImpl) GlobalSearchForMCP(searchQuery *entity.GlobalContractSearchQuery) ([]entity.MCPContractSearchResult, error) {
	_, err := r.cp.GetConnection().Exec("select websearch_to_tsquery(?)", searchQuery.OriginalTextInput)
	if err != nil {
		return nil, fmt.Errorf("invalid search string: %v", err.Error())
	}
	var result []entity.MCPContractSearchResult
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

    FROM fts_mcp_search_text ts,
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
	_, err = r.cp.GetConnection().Model(searchQuery).Query(&result, mcpSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
