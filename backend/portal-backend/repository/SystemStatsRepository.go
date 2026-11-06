package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
	"github.com/go-pg/pg/v10"
)

type SystemStatsRepository interface {
	GetPackageGroupCounts(ctx context.Context) (*entity.PackageGroupCountsEntity, error)
	GetRevisionsCount(ctx context.Context) (*entity.RevisionsCountEntity, error)
	GetDocumentsCount(ctx context.Context) (int, error)
	GetOperationsCount(ctx context.Context) (int, error)
	GetVersionComparisonsCount(ctx context.Context) (int, error)
	GetBuildsCountByType(ctx context.Context) ([]entity.BuildsCountEntity, error)
	GetDatabaseSizePerTable(ctx context.Context) ([]entity.TableSizeEntity, error)
	GetPublicStats(ctx context.Context, scope view.PackageReadScope, userId string) (*entity.PublicStatsEntity, error)
}

func NewSystemStatsRepository(cp db.ConnectionProvider) SystemStatsRepository {
	return &systemStatsRepositoryImpl{cp: cp}
}

type systemStatsRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (s *systemStatsRepositoryImpl) GetPackageGroupCounts(ctx context.Context) (*entity.PackageGroupCountsEntity, error) {
	var result entity.PackageGroupCountsEntity

	query := `
		SELECT
			COUNT(*) FILTER (WHERE kind = 'workspace' AND deleted_at IS NULL) AS workspaces,
			COUNT(*) FILTER (WHERE kind = 'workspace' AND deleted_at IS NOT NULL) AS deleted_workspaces,
			COUNT(*) FILTER (WHERE kind = 'group' AND deleted_at IS NULL) AS groups,
			COUNT(*) FILTER (WHERE kind = 'group' AND deleted_at IS NOT NULL) AS deleted_groups,
			COUNT(*) FILTER (WHERE kind = 'package' AND deleted_at IS NULL) AS packages,
			COUNT(*) FILTER (WHERE kind = 'package' AND deleted_at IS NOT NULL) AS deleted_packages,
			COUNT(*) FILTER (WHERE kind = 'dashboard' AND deleted_at IS NULL) AS dashboards,
			COUNT(*) FILTER (WHERE kind = 'dashboard' AND deleted_at IS NOT NULL) AS deleted_dashboards
		FROM package_group
	`

	_, err := s.cp.GetConnection().QueryOneContext(ctx, &result, query)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

func (s *systemStatsRepositoryImpl) GetRevisionsCount(ctx context.Context) (*entity.RevisionsCountEntity, error) {
	var result entity.RevisionsCountEntity

	query := `
		SELECT
			COUNT(*) FILTER (WHERE deleted_at IS NULL) AS revisions,
			COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_revisions
		FROM published_version
	`

	_, err := s.cp.GetConnection().QueryOneContext(ctx, &result, query)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

func (s *systemStatsRepositoryImpl) GetDocumentsCount(ctx context.Context) (int, error) {
	var count int
	_, err := s.cp.GetConnection().QueryOneContext(ctx, pg.Scan(&count), "SELECT COUNT(*) FROM published_version_revision_content")
	return count, err
}

func (s *systemStatsRepositoryImpl) GetOperationsCount(ctx context.Context) (int, error) {
	var count int
	_, err := s.cp.GetConnection().QueryOneContext(ctx, pg.Scan(&count), "SELECT COUNT(*) FROM operation")
	return count, err
}

func (s *systemStatsRepositoryImpl) GetVersionComparisonsCount(ctx context.Context) (int, error) {
	var count int
	_, err := s.cp.GetConnection().QueryOneContext(ctx, pg.Scan(&count), "SELECT COUNT(*) FROM version_comparison")
	return count, err
}

func (s *systemStatsRepositoryImpl) GetBuildsCountByType(ctx context.Context) ([]entity.BuildsCountEntity, error) {
	var result []entity.BuildsCountEntity

	query := `
		WITH build_types(build_type) AS (
  			VALUES
    		('changelog'),
    		('build'),
    		('documentGroup'),
    		('reducedSourceSpecifications'),
    		('mergedSpecification'),
    		('exportVersion'),
    		('exportRestDocument'),
    		('exportRestOperationsGroup'),
    		('exportGraphqlOperationsGroup'),
			('exportAsyncapiOperationsGroup')
		),
		build_stats AS (
  		SELECT
      		bs.config->>'buildType' as build_type,
      		COUNT(*) FILTER (WHERE b.status = 'none') as not_started,
      		COUNT(*) FILTER (WHERE b.status = 'running') as running,
      		COUNT(*) FILTER (WHERE b.status = 'error' AND b.created_at > NOW() - INTERVAL '1 week') as failed_last_week,
      		COUNT(*) FILTER (WHERE b.status = 'complete' AND b.created_at > NOW() - INTERVAL '1 week') as succeed_last_week,
      		COALESCE(SUM(CASE WHEN b.created_at > NOW() - INTERVAL '1 week' THEN b.restart_count ELSE 0 END), 0) as restarts_last_week
  		FROM build b
  		JOIN build_src bs ON b.build_id = bs.build_id
  		WHERE (bs.config->>'migrationBuild')::boolean IS NOT TRUE OR (bs.config->>'migrationBuild') IS NULL
  		GROUP BY bs.config->>'buildType'
		)
		SELECT
    		bt.build_type,
    		COALESCE(bs.not_started, 0) as not_started,
    		COALESCE(bs.running, 0) as running,
    		COALESCE(bs.failed_last_week, 0) as failed_last_week,
    		COALESCE(bs.succeed_last_week, 0) as succeed_last_week,
    		COALESCE(bs.restarts_last_week, 0) as restarts_last_week
		FROM build_types bt
		LEFT JOIN build_stats bs ON bt.build_type = bs.build_type
		ORDER BY bt.build_type;
	`

	_, err := s.cp.GetConnection().QueryContext(ctx, &result, query)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *systemStatsRepositoryImpl) GetDatabaseSizePerTable(ctx context.Context) ([]entity.TableSizeEntity, error) {
	var result []entity.TableSizeEntity

	query := `
		WITH RECURSIVE pg_inherit(inhrelid, inhparent) AS
                   		(select inhrelid, inhparent
                    	FROM pg_inherits
                    	UNION
                    	SELECT child.inhrelid, parent.inhparent
                    	FROM pg_inherit child, pg_inherits parent
                    	WHERE child.inhparent = parent.inhrelid),
               		pg_inherit_short AS (SELECT * FROM pg_inherit WHERE inhparent NOT IN (SELECT inhrelid FROM pg_inherit))
		SELECT TABLE_NAME
     		, row_estimate
     		, pg_size_pretty(total_bytes) AS total
     		, pg_size_pretty(index_bytes) AS INDEX
     		, pg_size_pretty(toast_bytes) AS toast
     		, pg_size_pretty(table_bytes) AS TABLE
     		, total_bytes::float8 / sum(total_bytes) OVER () AS total_size_share
		FROM (
         		SELECT *, total_bytes-index_bytes-COALESCE(toast_bytes,0) AS table_bytes
         		FROM (
                  		SELECT c.oid
                       		, nspname AS table_schema
                       		, relname AS TABLE_NAME
                       		, SUM(c.reltuples) OVER (partition BY parent) AS row_estimate
                       		, SUM(pg_total_relation_size(c.oid)) OVER (partition BY parent) AS total_bytes
                       		, SUM(pg_indexes_size(c.oid)) OVER (partition BY parent) AS index_bytes
                       		, SUM(pg_total_relation_size(reltoastrelid)) OVER (partition BY parent) AS toast_bytes
                       		, parent
                  		FROM (
                           		SELECT pg_class.oid
                                		, reltuples
                                		, relname
                                		, relnamespace
                                		, pg_class.reltoastrelid
                                		, COALESCE(inhparent, pg_class.oid) parent
                           		FROM pg_class
                                    		LEFT JOIN pg_inherit_short ON inhrelid = oid
                           		WHERE relkind IN ('r', 'p')
                       		) c
                           		LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
              		) a
         		WHERE oid = parent
     		) a
		WHERE table_schema='public'
		ORDER BY total_bytes DESC;`

	_, err := s.cp.GetConnection().QueryContext(ctx, &result, query)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *systemStatsRepositoryImpl) GetPublicStats(ctx context.Context, scope view.PackageReadScope, userId string) (*entity.PublicStatsEntity, error) {
	var result entity.PublicStatsEntity
	if scope.Kind == view.PackageReadScopeNone {
		return &result, nil
	}

	ctes, condition, err := convertPackageReadScopeToSQL(scope, userId, "pkg.id", "pkg")
	if err != nil {
		return nil, err
	}
	conditions := []string{"l.deleted_at is null", "pkg.deleted_at is null"}
	if condition != "" {
		conditions = append(conditions, condition)
	}

	latest := `latest as (
		select distinct on (pv.package_id, pv.version)
			pv.package_id, pv.version, pv.revision, pv.deleted_at
		from published_version pv
		order by pv.package_id, pv.version, pv.revision desc
	)`
	active := fmt.Sprintf(`active as (
		select l.package_id, l.version, l.revision
		from latest l
		join package_group pkg on pkg.id = l.package_id
		%s
	)`, utils.WhereClause(conditions))

	query := fmt.Sprintf(`
	%s
	select
		(select count(*) from active) as versions,
		(select count(*) from operation o
			join active a on a.package_id = o.package_id and a.version = o.version and a.revision = o.revision) as operations`,
		utils.WithClause(append(ctes, latest, active)))

	params := entity.PackagesQueryParams{UserId: userId, SubtreeRoot: scope.SubtreeRoot}
	if _, err := s.cp.GetConnection().ModelContext(ctx, &params).QueryOne(pg.Scan(&result.Versions, &result.Operations), query); err != nil {
		return nil, err
	}

	return &result, nil
}
