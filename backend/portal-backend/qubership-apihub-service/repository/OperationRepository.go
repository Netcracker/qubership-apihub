// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type OperationRepository interface {
	GetOperationsByIds(packageId string, version string, revision int, operationIds []string) ([]entity.OperationEntity, error)
	GetOperations(packageId string, version string, revision int, operationType string, skipRefs bool, searchReq view.OperationListReq) ([]entity.OperationRichEntity, error)
	GetOperationById(packageId string, version string, revision int, operationType string, operationId string) (*entity.OperationRichEntity, error)
	GetOperationsTags(searchQuery entity.OperationTagsSearchQueryEntity, skipRefs bool) ([]string, error)
	GetAllOperations(packageId string, version string, revision int) ([]entity.OperationEntity, error)
	GetOperationChanges(comparisonId string, operationId string, severities []string) (*entity.OperationComparisonEntity, error)
	GetChangelog_deprecated(searchQuery entity.ChangelogSearchQueryEntity) ([]entity.OperationComparisonChangelogEntity_deprecated, error)
	GetChangelog(searchQuery entity.ChangelogSearchQueryEntity) ([]entity.OperationComparisonChangelogEntity, error)
	SearchForOperations_deprecated(searchQuery *entity.OperationSearchQuery) ([]entity.OperationSearchResult_deprecated, error)
	SearchForOperations(searchQuery *entity.OperationSearchQuery) ([]entity.OperationSearchResult, error)
	GetOperationsTypeCount(packageId string, version string, revision int) ([]entity.OperationsTypeCountEntity, error)
	GetOperationsTypeDataHashes(packageId string, version string, revision int) ([]entity.OperationsTypeDataHashEntity, error)
	GetOperationDeprecatedItems(packageId string, version string, revision int, operationType string, operationId string) (*entity.OperationRichEntity, error)
	GetDeprecatedOperationsSummary(packageId string, version string, revision int) ([]entity.DeprecatedOperationsSummaryEntity, error)
	GetDeprecatedOperationsRefsSummary(packageId string, version string, revision int) ([]entity.DeprecatedOperationsSummaryEntity, error)
	GetDeprecatedOperations(packageId string, version string, revision int, operationType string, searchReq view.DeprecatedOperationListReq) ([]entity.OperationRichEntity, error)

	AddOperationGroupHistory(ent *entity.OperationGroupHistoryEntity) error
	CreateOperationGroup(ent *entity.OperationGroupEntity, templateEntity *entity.OperationGroupTemplateEntity) error
	DeleteOperationGroup(ent *entity.OperationGroupEntity) error
	ReplaceOperationGroup(oldGroupEntity *entity.OperationGroupEntity, newGroupEntity *entity.OperationGroupEntity, operationEntities []entity.GroupedOperationEntity, newTemplateEntity *entity.OperationGroupTemplateEntity) error
	UpdateOperationGroup(oldGroupEntity *entity.OperationGroupEntity, newGroupEntity *entity.OperationGroupEntity, newTemplateEntity *entity.OperationGroupTemplateEntity, newGroupedOperations *[]entity.GroupedOperationEntity) error
	GetOperationGroup(packageId string, version string, revision int, apiType string, groupName string) (*entity.OperationGroupEntity, error)
	GetOperationGroupTemplateFile(packageId string, version string, revision int, apiType string, groupName string) (*entity.OperationGroupTemplateFileEntity, error)
	CalculateOperationGroups(packageId string, version string, revision int, groupingPrefix string) ([]string, error)
	GetVersionOperationGroups(packageId string, version string, revision int) ([]entity.OperationGroupCountEntity, error)
	GetGroupedOperations(packageId string, version string, revision int, operationType string, groupName string, searchReq view.OperationListReq) ([]entity.OperationRichEntity, error)
	GetOperationsByModelHash(packageId string, version string, revision int, apiType string, modelHash string) ([]entity.OperationModelsEntity, error)
	GetOperationsByPathAndMethod(packageId string, version string, revision int, apiType string, path string, method string) ([]string, error)
}

func NewOperationRepository(cp db.ConnectionProvider) OperationRepository {
	return &operationRepositoryImpl{cp: cp}
}

type operationRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (o operationRepositoryImpl) GetOperationsByIds(packageId string, version string, revision int, operationIds []string) ([]entity.OperationEntity, error) {
	if len(operationIds) == 0 {
		return nil, nil
	}
	var result []entity.OperationEntity
	err := o.cp.GetConnection().Model(&result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("operation_id in (?)", pg.In(operationIds)).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetOperationById(packageId string, version string, revision int, operationType string, operationId string) (*entity.OperationRichEntity, error) {
	result := new(entity.OperationRichEntity)
	err := o.cp.GetConnection().Model(result).
		ColumnExpr("operation.*").
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("type = ?", operationType).
		Where("operation_id = ?", operationId).
		Join("LEFT JOIN operation_data as op_data").
		JoinOn("operation.data_hash = op_data.data_hash").
		ColumnExpr("op_data.data").
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetOperationDeprecatedItems(packageId string, version string, revision int, operationType string, operationId string) (*entity.OperationRichEntity, error) {
	result := new(entity.OperationRichEntity)
	err := o.cp.GetConnection().Model(result).
		ColumnExpr("operation.deprecated_items").
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("type = ?", operationType).
		Where("operation_id = ?", operationId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetOperations(packageId string, version string, revision int, operationType string, skipRefs bool, searchReq view.OperationListReq) ([]entity.OperationRichEntity, error) {
	var result []entity.OperationRichEntity
	query := o.cp.GetConnection().Model(&result).
		ColumnExpr("operation.*")

	if !skipRefs {
		query.Join(`inner join 
		(with refs as(
			select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
			from published_version_reference s
			inner join published_version pv
			on pv.package_id = s.reference_id
			and pv.version = s.reference_version
			and pv.revision = s.reference_revision
			and pv.deleted_at is null
			where s.package_id = ?
			and s.version = ?
			and s.revision = ?
			and s.excluded = false
		)
		select package_id, version, revision
		from refs
		union
		select ? as package_id, ? as version, ? as revision
		) refs`, packageId, version, revision, packageId, version, revision)
		query.JoinOn("operation.package_id = refs.package_id").
			JoinOn("operation.version = refs.version").
			JoinOn("operation.revision = refs.revision")

		if searchReq.RefPackageId != "" {
			query.JoinOn("refs.package_id = ?", searchReq.RefPackageId)
		}
	} else {
		query.Where("package_id = ?", packageId).
			Where("version = ?", version).
			Where("revision = ?", revision)
	}

	if searchReq.EmptyGroup {
		//todo try to replace this 'not in' condition with join
		query.Where(`operation.operation_id not in (
			select operation_id from grouped_operation go
			inner join operation_group og
			on go.group_id = og.group_id
			and og.package_id = ?
			and og.version = ?
			and og.revision = ?
			and og.api_type = operation.type
			where go.package_id = operation.package_id
			and go.version = operation.version
			and go.revision = operation.revision
		)`, packageId, version, revision)
	} else if searchReq.Group != "" {
		query.Join(`inner join operation_group og`).
			JoinOn("og.package_id = ?", packageId).
			JoinOn("og.version = ?", version).
			JoinOn("og.revision = ?", revision).
			JoinOn("og.api_type = operation.type").
			JoinOn("og.group_name = ?", searchReq.Group).
			Join("inner join grouped_operation go").
			JoinOn("go.group_id = og.group_id").
			JoinOn("go.package_id = operation.package_id").
			JoinOn("go.version = operation.version").
			JoinOn("go.revision = operation.revision").
			JoinOn("go.operation_id = operation.operation_id")
	}

	query.Where("operation.type = ?", operationType)

	if searchReq.IncludeData {
		query.Join("LEFT JOIN operation_data as op_data").
			JoinOn("operation.data_hash = op_data.data_hash").
			ColumnExpr("op_data.data")
	}
	query.Order("operation.package_id",
		"operation.version",
		"operation.revision",
		"operation_id ASC").
		Offset(searchReq.Limit * searchReq.Page).
		Limit(searchReq.Limit)

	if searchReq.CustomTagKey != "" && searchReq.CustomTagValue != "" {
		query.Where("exists(select 1 from jsonb_each_text(operation.custom_tags) where key = ? and value = ?)", searchReq.CustomTagKey, searchReq.CustomTagValue)
	} else if searchReq.TextFilter != "" {
		searchReq.TextFilter = "%" + utils.LikeEscaped(searchReq.TextFilter) + "%"
		query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			q = q.WhereOr("operation.title ilike ?", searchReq.TextFilter).
				WhereOr("operation.metadata->>? ilike ?", "path", searchReq.TextFilter).
				WhereOr("operation.metadata->>? ilike ?", "method", searchReq.TextFilter)
			return q, nil
		})
	}

	if searchReq.Kind != "" {
		query.Where("kind = ?", searchReq.Kind)
	}
	if searchReq.ApiAudience != "" {
		query.Where("api_audience = ?", searchReq.ApiAudience)
	}

	if searchReq.Tag != "" {
		searchReq.Tag = utils.LikeEscaped(searchReq.Tag)
		query.Where(`exists(
			select 1 from jsonb_array_elements(operation.metadata -> 'tags') a
			where replace(a.value::text,'"','') like ?)`, searchReq.Tag)
	}

	if searchReq.EmptyTag {
		query.Where(`not exists(select 1 from jsonb_array_elements(operation.metadata -> 'tags') a
            where a.value != '""') `)
	}

	if searchReq.Deprecated != nil {
		query.Where("operation.deprecated = ?", *searchReq.Deprecated)
	}

	if len(searchReq.Ids) > 0 {
		query.Where("operation.operation_id in (?)", pg.In(searchReq.Ids))
	}

	if len(searchReq.HashList) > 0 {
		query.Where("operation.data_hash in (?)", pg.In(searchReq.HashList))
	}
	if searchReq.DocumentSlug != "" {
		query.Join("inner join published_version_revision_content as pvrc").
			JoinOn("operation.operation_id = any(pvrc.operation_ids)").
			JoinOn("pvrc.slug = ?", searchReq.DocumentSlug).
			JoinOn("operation.package_id = pvrc.package_id").
			JoinOn("operation.version = pvrc.version").
			JoinOn("operation.revision = pvrc.revision")
	}
	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetDeprecatedOperations(packageId string, version string, revision int, operationType string, searchReq view.DeprecatedOperationListReq) ([]entity.OperationRichEntity, error) {
	var result []entity.OperationRichEntity
	query := o.cp.GetConnection().Model(&result).
		ColumnExpr("operation.*")

	query.Join(`inner join 
		(with refs as(
			select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
			from published_version_reference s
			inner join published_version pv
			on pv.package_id = s.reference_id
			and pv.version = s.reference_version
			and pv.revision = s.reference_revision
			and pv.deleted_at is null
			where s.package_id = ?
			and s.version = ?
			and s.revision = ?
			and s.excluded = false
		)
		select package_id, version, revision
		from refs
		union
		select ? as package_id, ? as version, ? as revision
		) refs`, packageId, version, revision, packageId, version, revision)
	query.JoinOn("operation.package_id = refs.package_id").
		JoinOn("operation.version = refs.version").
		JoinOn("operation.revision = refs.revision")

	if searchReq.RefPackageId != "" {
		query.JoinOn("refs.package_id = ?", searchReq.RefPackageId)
	}

	query.Where("operation.type = ?", operationType)

	query.Where(`((operation.deprecated_items is not null and jsonb_typeof(operation.deprecated_items) = 'array' and jsonb_array_length(operation.deprecated_items) != 0) 
		or operation.deprecated = true)`)

	query.Order("operation.package_id",
		"operation.version",
		"operation.revision",
		"operation_id ASC").
		Offset(searchReq.Limit * searchReq.Page).
		Limit(searchReq.Limit)

	if searchReq.TextFilter != "" {
		searchReq.TextFilter = "%" + utils.LikeEscaped(searchReq.TextFilter) + "%"
		query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			q = q.WhereOr("operation.title ilike ?", searchReq.TextFilter).
				WhereOr("operation.metadata->>? ilike ?", "path", searchReq.TextFilter).
				WhereOr("operation.metadata->>? ilike ?", "method", searchReq.TextFilter)
			return q, nil
		})
	}
	if searchReq.Kind != "" {
		query.Where("kind = ?", searchReq.Kind)
	}
	if searchReq.ApiAudience != "" {
		query.Where("api_audience = ?", searchReq.ApiAudience)
	}

	if len(searchReq.Tags) != 0 {
		query.Where(`exists(
			select 1 from jsonb_array_elements(operation.metadata -> 'tags') a
			where replace(a.value::text,'"','') = any(?))`, pg.Array(searchReq.Tags))
	}
	if searchReq.EmptyTag {
		query.Where(`not exists(select 1 from jsonb_array_elements(operation.metadata -> 'tags') a
            where a.value != '""') `)
	}
	if searchReq.EmptyGroup {
		//todo try to replace this 'not in' condition with join
		query.Where(`operation.operation_id not in (
			select operation_id from grouped_operation go
			inner join operation_group og
			on go.group_id = og.group_id
			and og.package_id = ?
			and og.version = ?
			and og.revision = ?
			and og.api_type = operation.type
			where go.package_id = operation.package_id
			and go.version = operation.version
			and go.revision = operation.revision
		)`, packageId, version, revision)
	} else if searchReq.Group != "" {
		query.Join(`inner join operation_group og`).
			JoinOn("og.package_id = ?", packageId).
			JoinOn("og.version = ?", version).
			JoinOn("og.revision = ?", revision).
			JoinOn("og.api_type = operation.type").
			JoinOn("og.group_name = ?", searchReq.Group).
			Join("inner join grouped_operation go").
			JoinOn("go.group_id = og.group_id").
			JoinOn("go.package_id = operation.package_id").
			JoinOn("go.version = operation.version").
			JoinOn("go.revision = operation.revision").
			JoinOn("go.operation_id = operation.operation_id")
	}

	if len(searchReq.Ids) > 0 {
		query.Where("operation.operation_id in (?)", pg.In(searchReq.Ids))
	}

	if searchReq.DocumentSlug != "" {
		query.Join("inner join published_version_revision_content as pvrc").
			JoinOn("operation.operation_id = any(pvrc.operation_ids)").
			JoinOn("pvrc.slug = ?", searchReq.DocumentSlug).
			JoinOn("operation.package_id = pvrc.package_id").
			JoinOn("operation.version = pvrc.version").
			JoinOn("operation.revision = pvrc.revision")
	}

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetOperationsTags(searchQuery entity.OperationTagsSearchQueryEntity, skipRefs bool) ([]string, error) {
	type Tag struct {
		Tag string `pg:"tag"`
	}
	var tags []Tag

	var query string
	if !skipRefs {
		query = `
		with ops as (
			select operation.* from operation
			inner join
			(with refs as(
				select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
				from published_version_reference s
				inner join published_version pv
				on pv.package_id = s.reference_id
				and pv.version = s.reference_version
				and pv.revision = s.reference_revision
				and pv.deleted_at is null
				where s.package_id = ?package_id
				and s.version = ?version
				and s.revision = ?revision
				and s.excluded = false
			)
			select package_id, version, revision
			from refs
			union
			select ?package_id as package_id, ?version as version, ?revision as revision
			) refs
			on operation.package_id = refs.package_id
			and operation.version = refs.version
			and operation.revision = refs.revision
			where operation.type = ?type
			and (?kind = '' or operation.kind = ?kind)
			and (?api_audience = '' or operation.api_audience = ?api_audience)
			)
		select tag from 
		(
			(select '' as tag 
			from ops o where
			?text_filter = ''
			and not exists(select 1 from jsonb_array_elements(o.metadata -> 'tags') a where a.value != '""') 
			limit 1)
		union
			select distinct replace(a.value::text,'"','') as tag
			from ops o, jsonb_array_elements(o.metadata -> 'tags') a
			where (?text_filter = '' or replace(a.value::text,'"','') ilike ?text_filter)
		) t
		order by tag asc
		limit ?limit
		offset ?offset;`
	} else {
		query = `select tag
		from 
		(
			(select '' as tag 
  				from operation o
				where o.package_id = ?package_id
				and o.version = ?version
				and o.revision = ?revision
				and o.type = ?type
				and (?kind = '' or o.kind = ?kind)
				and (?api_audience = '' or o.api_audience = ?api_audience)
				and ?text_filter = ''
				and not exists(select 1 from jsonb_array_elements(o.metadata -> 'tags') a where a.value != '""') 
				limit 1)
			union
			select distinct replace(a.value::text,'"','') as tag
				from operation o,
					jsonb_array_elements(o.metadata -> 'tags') a
				where o.package_id = ?package_id
				and o.version = ?version
				and o.revision = ?revision
				and o.type = ?type
				and (?kind = '' or o.kind = ?kind)
				and (?api_audience = '' or o.api_audience = ?api_audience)
				and (?text_filter = '' or replace(a.value::text,'"','') ilike ?text_filter)
		) t
		order by tag asc
		limit ?limit
		offset ?offset;`
	}

	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	}

	_, err := o.cp.GetConnection().Model(&searchQuery).Query(&tags, query)
	if err != nil {
		return nil, err
	}

	result := make([]string, 0)

	for _, t := range tags {
		result = append(result, t.Tag)
	}
	return result, nil
}

func (o operationRepositoryImpl) GetAllOperations(packageId string, version string, revision int) ([]entity.OperationEntity, error) {
	var result []entity.OperationEntity
	err := o.cp.GetConnection().Model(&result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetOperationChanges(comparisonId string, operationId string, severities []string) (*entity.OperationComparisonEntity, error) {
	result := new(entity.OperationComparisonEntity)
	err := o.cp.GetConnection().Model(result).
		Where("comparison_id = ?", comparisonId).
		Where("operation_id = ?", operationId).
		OrderExpr("data_hash, previous_data_hash").
		Limit(1).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetChangelog_deprecated(searchQuery entity.ChangelogSearchQueryEntity) ([]entity.OperationComparisonChangelogEntity_deprecated, error) {
	var result []entity.OperationComparisonChangelogEntity_deprecated

	comparisonsQuery := o.cp.GetConnection().Model(&entity.OperationComparisonChangelogEntity_deprecated{}).
		TableExpr("operation_comparison").
		ColumnExpr("case when data_hash is null then previous_package_id else package_id end operation_package_id").
		ColumnExpr("case when data_hash is null then previous_version else version end operation_version").
		ColumnExpr("case when data_hash is null then previous_revision else revision end operation_revision").
		ColumnExpr("operation_comparison.*").
		Where(`comparison_id in (
			select unnest(array_append(refs, ?)) id from version_comparison where (comparison_id = ?)
			)`, searchQuery.ComparisonId, searchQuery.ComparisonId).
		Where(`(? = '' or package_id = ? or previous_package_id = ?)`, searchQuery.RefPackageId, searchQuery.RefPackageId, searchQuery.RefPackageId)

	query := o.cp.GetConnection().Model(&result).With("comparisons", comparisonsQuery).
		TableExpr("comparisons").
		ColumnExpr("operation_comparison.*").
		ColumnExpr("o.metadata").
		ColumnExpr("o.title").
		ColumnExpr("o.type").
		ColumnExpr("o.kind")

	query.Join("inner join operation o").
		JoinOn("o.package_id = operation_comparison.operation_package_id").
		JoinOn("o.version = operation_comparison.operation_version").
		JoinOn("o.revision = operation_comparison.operation_revision").
		JoinOn("o.operation_id = operation_comparison.operation_id")
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
		query.JoinOn("o.title ilike ? or o.metadata->>? ilike ? or o.metadata->>? ilike ?", searchQuery.TextFilter, "path", searchQuery.TextFilter, "method", searchQuery.TextFilter)
	}
	if searchQuery.ApiType != "" {
		query.JoinOn("o.type = ?", searchQuery.ApiType)
	}
	if searchQuery.ApiKind != "" {
		query.JoinOn("o.kind = ?", searchQuery.ApiKind)
	}
	if searchQuery.ApiAudience != "" {
		query.JoinOn("o.api_audience = ?", searchQuery.ApiAudience)
	}
	if len(searchQuery.Tags) != 0 {
		query.JoinOn(`exists(
			select 1 from jsonb_array_elements(o.metadata -> 'tags') a
			where replace(a.value::text,'"','') = any(?))`, pg.Array(searchQuery.Tags))
	}
	if searchQuery.EmptyTag {
		query.JoinOn(`not exists(select 1 from jsonb_array_elements(o.metadata -> 'tags') a
            where a.value != '""') `)
	}

	if searchQuery.EmptyGroup {
		//this filter also excludes all deleted operations
		query.Where(`operation_comparison.data_hash is not null and o.operation_id not in (
			select operation_id from grouped_operation go
			inner join operation_group og
			on go.group_id = og.group_id
			and og.package_id = ?
			and og.version = ?
			and og.revision = ?
			and og.api_type = o.type
			where go.package_id = o.package_id
			and go.version = o.version
			and go.revision = o.revision)`,
			searchQuery.GroupPackageId, searchQuery.GroupVersion, searchQuery.GroupRevision)
	} else if searchQuery.Group != "" {
		//this filter also excludes all deleted operations
		query.Where(`operation_comparison.data_hash is not null and o.operation_id in (
			select operation_id from grouped_operation go
			inner join operation_group og
			on go.group_id = og.group_id
			and og.package_id = ?
			and og.version = ?
			and og.revision = ?
			and og.group_name = ?
			and og.api_type = o.type
			where go.package_id = o.package_id
			and go.version = o.version
			and go.revision = o.revision)`,
			searchQuery.GroupPackageId, searchQuery.GroupVersion, searchQuery.GroupRevision, searchQuery.Group)
	}

	if len(searchQuery.Severities) > 0 {
		query.WhereGroup(func(query *orm.Query) (*orm.Query, error) {
			for _, severity := range searchQuery.Severities {
				query.WhereOr("(changes_summary->?)::int>0", severity)
			}
			return query, nil
		})
	}

	if searchQuery.DocumentSlug != "" {
		query.Join("inner join published_version_revision_content as pvrc").
			JoinOn("o.operation_id = any(pvrc.operation_ids)").
			JoinOn("pvrc.slug = ?", searchQuery.DocumentSlug).
			JoinOn("o.package_id = pvrc.package_id").
			JoinOn("o.version = pvrc.version").
			JoinOn("o.revision = pvrc.revision")
	}

	query.OrderExpr(`(operation_comparison.changes_summary -> 'breaking')::int > 0 DESC,
((operation_comparison.changes_summary -> 'deprecated')::int > 0 and 
(operation_comparison.changes_summary -> 'breaking')::int = 0) DESC`,
	)
	query.Order("o.package_id",
		"o.version",
		"o.revision",
		"o.operation_id",
		"o.data_hash ASC")

	if searchQuery.Limit > 0 {
		query.Limit(searchQuery.Limit)
	}
	if searchQuery.Offset > 0 {
		query.Offset(searchQuery.Offset)
	}
	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetChangelog(searchQuery entity.ChangelogSearchQueryEntity) ([]entity.OperationComparisonChangelogEntity, error) {
	var result []entity.OperationComparisonChangelogEntity

	comparisonsQuery := o.cp.GetConnection().Model(&entity.OperationComparisonChangelogEntity{}).
		TableExpr("operation_comparison").
		ColumnExpr("case when data_hash is null then previous_package_id else package_id end operation_package_id").
		ColumnExpr("case when data_hash is null then previous_version else version end operation_version").
		ColumnExpr("case when data_hash is null then previous_revision else revision end operation_revision").
		ColumnExpr("operation_comparison.*").
		Where(`comparison_id in (
			select unnest(array_append(refs, ?)) id from version_comparison where (comparison_id = ?)
			)`, searchQuery.ComparisonId, searchQuery.ComparisonId).
		Where(`(? = '' or package_id = ? or previous_package_id = ?)`, searchQuery.RefPackageId, searchQuery.RefPackageId, searchQuery.RefPackageId)

	query := o.cp.GetConnection().Model(&result).With("comparisons", comparisonsQuery).
		TableExpr("comparisons").
		ColumnExpr("operation_comparison.*").
		ColumnExpr("o.metadata").
		ColumnExpr("curr_op.title title").
		ColumnExpr("prev_op.title previous_title").
		ColumnExpr("o.type").
		ColumnExpr("curr_op.kind kind").
		ColumnExpr("prev_op.kind previous_kind").
		ColumnExpr("curr_op.api_audience api_audience").
		ColumnExpr("prev_op.api_audience previous_api_audience")

	query.Join("left join operation curr_op").
		JoinOn("curr_op.package_id = operation_comparison.package_id").
		JoinOn("curr_op.version = operation_comparison.version").
		JoinOn("curr_op.revision = operation_comparison.revision").
		JoinOn("curr_op.operation_id = operation_comparison.operation_id")
	query.Join("left join operation prev_op").
		JoinOn("prev_op.package_id = operation_comparison.previous_package_id").
		JoinOn("prev_op.version = operation_comparison.previous_version").
		JoinOn("prev_op.revision = operation_comparison.previous_revision").
		JoinOn("prev_op.operation_id = operation_comparison.operation_id")
	query.Join("inner join operation o").
		JoinOn("o.package_id = operation_comparison.operation_package_id").
		JoinOn("o.version = operation_comparison.operation_version").
		JoinOn("o.revision = operation_comparison.operation_revision").
		JoinOn("o.operation_id = operation_comparison.operation_id")
	if searchQuery.TextFilter != "" {
		searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
		query.JoinOn("o.title ilike ? or o.metadata->>? ilike ? or o.metadata->>? ilike ?", searchQuery.TextFilter, "path", searchQuery.TextFilter, "method", searchQuery.TextFilter)
	}
	if searchQuery.ApiType != "" {
		query.JoinOn("o.type = ?", searchQuery.ApiType)
	}
	if searchQuery.ApiKind != "" {
		query.JoinOn("o.kind = ?", searchQuery.ApiKind)
	}
	if searchQuery.ApiAudience != "" {
		query.JoinOn("o.api_audience = ?", searchQuery.ApiAudience)
	}
	if len(searchQuery.Tags) != 0 {
		query.JoinOn(`exists(
			select 1 from jsonb_array_elements(o.metadata -> 'tags') a
			where replace(a.value::text,'"','') = any(?))`, pg.Array(searchQuery.Tags))
	}
	if searchQuery.EmptyTag {
		query.JoinOn(`not exists(select 1 from jsonb_array_elements(o.metadata -> 'tags') a
            where a.value != '""') `)
	}

	if searchQuery.EmptyGroup {
		//this filter also excludes all deleted operations
		query.Where(`operation_comparison.data_hash is not null and o.operation_id not in (
			select operation_id from grouped_operation go
			inner join operation_group og
			on go.group_id = og.group_id
			and og.package_id = ?
			and og.version = ?
			and og.revision = ?
			and og.api_type = o.type
			where go.package_id = o.package_id
			and go.version = o.version
			and go.revision = o.revision)`,
			searchQuery.GroupPackageId, searchQuery.GroupVersion, searchQuery.GroupRevision)
	} else if searchQuery.Group != "" {
		//this filter also excludes all deleted operations
		query.Where(`operation_comparison.data_hash is not null and o.operation_id in (
			select operation_id from grouped_operation go
			inner join operation_group og
			on go.group_id = og.group_id
			and og.package_id = ?
			and og.version = ?
			and og.revision = ?
			and og.group_name = ?
			and og.api_type = o.type
			where go.package_id = o.package_id
			and go.version = o.version
			and go.revision = o.revision)`,
			searchQuery.GroupPackageId, searchQuery.GroupVersion, searchQuery.GroupRevision, searchQuery.Group)
	}

	if len(searchQuery.Severities) > 0 {
		query.WhereGroup(func(query *orm.Query) (*orm.Query, error) {
			for _, severity := range searchQuery.Severities {
				query.WhereOr("(changes_summary->?)::int>0", severity)
			}
			return query, nil
		})
	}

	if searchQuery.DocumentSlug != "" {
		query.Join("inner join published_version_revision_content as pvrc").
			JoinOn("o.operation_id = any(pvrc.operation_ids)").
			JoinOn("pvrc.slug = ?", searchQuery.DocumentSlug).
			JoinOn("o.package_id = pvrc.package_id").
			JoinOn("o.version = pvrc.version").
			JoinOn("o.revision = pvrc.revision")
	}

	query.OrderExpr(`(operation_comparison.changes_summary -> 'breaking')::int > 0 DESC,
((operation_comparison.changes_summary -> 'deprecated')::int > 0 and 
(operation_comparison.changes_summary -> 'breaking')::int = 0) DESC`,
	)
	query.Order("o.package_id",
		"o.version",
		"o.revision",
		"o.operation_id",
		"o.data_hash ASC")

	if searchQuery.Limit > 0 {
		query.Limit(searchQuery.Limit)
	}
	if searchQuery.Offset > 0 {
		query.Offset(searchQuery.Offset)
	}
	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

// deprecated
func (o operationRepositoryImpl) SearchForOperations_deprecated(searchQuery *entity.OperationSearchQuery) ([]entity.OperationSearchResult_deprecated, error) {
	_, err := o.cp.GetConnection().Exec("select to_tsquery(?)", searchQuery.SearchString)
	if err != nil {
		return nil, fmt.Errorf("invalid search string: %v", err.Error())
	}
	searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	var result []entity.OperationSearchResult_deprecated
	operationsSearchQuery := `
	with	maxrev as
			(
					select package_id, version, pg.name as package_name, max(revision) as revision
					from published_version pv
						inner join package_group pg
							on pg.id = pv.package_id
							and pg.exclude_from_search = false
					--where (?packages = '{}' or package_id = ANY(?packages))
					/* 
					for now packages list serves as a list of parents and packages, 
					after adding new parents list need to uncomment line above and change condition below to use parents list
					*/
					where (?packages = '{}' or package_id like ANY(
						select id from unnest(?packages::text[]) id
						union 
						select id||'.%' from unnest(?packages::text[]) id))
					and (?versions = '{}' or version = ANY(?versions))
					group by package_id, version, pg.name
			),
			versions as 
			(
					select pv.package_id, pv.version, pv.revision, pv.published_at, pv.status, maxrev.package_name
					from published_version pv
					inner join maxrev
							on pv.package_id = maxrev.package_id
							and pv.version = maxrev.version
							and pv.revision = maxrev.revision
					where pv.deleted_at is null
							and (?statuses = '{}' or pv.status = ANY(?statuses))
							and pv.published_at >= ?start_date
							and pv.published_at <= ?end_date
			),
			operations as
			(
					select o.*, v.status version_status, v.package_name, v.published_at version_published_at
					from operation o
					inner join versions v
							on v.package_id = o.package_id
							and v.version = o.version
							and v.revision = o.revision
							and (?api_type = '' or o.type = ?api_type)
							and (?methods = '{}' or o.metadata->>'method' = ANY(?methods))
			)
			select
			o.package_id,
			o.package_name name,
			o.version,
			o.revision,
			o.version_status,
			o.operation_id,
			o.title,
			o.deprecated,
			o.type as api_type,
			o.metadata,
			parent_package_names(o.package_id) parent_names,
			case 
				when init_rank > 0 then init_rank + version_status_tf + operation_open_count
				else 0
			end rank,

			--debug
			coalesce(?scope_weight) scope_weight,
			coalesce(?open_count_weight) open_count_weight,
			scope_tf,
			title_tf,
			version_status_tf,
			operation_open_count
			from operations o
			left join (
					select ts.data_hash, max(rank) as rank from (
							with filtered as (select data_hash from operations)
							select 
							ts.data_hash, 
							case when scope_rank = 0 then detailed_scope_rank
								 when detailed_scope_rank = 0 then scope_rank
								 else scope_rank * detailed_scope_rank end rank
							from 
							ts_rest_operation_data ts,
							filtered f,
							to_tsquery(?search_filter) search_query,
							--using coalesce to skip ts_rank evaluation for scopes that are not requested
							coalesce(case when ?filter_response then null else 0 end, ts_rank(scope_response, search_query)) resp_rank,
							coalesce(case when ?filter_request then null else 0 end, ts_rank(scope_request, search_query)) req_rank,
							coalesce(case when ?filter_examples then null else 0 end, ts_rank(scope_examples, search_query)) example_rank,
							coalesce(case when ?filter_annotation then null else 0 end, ts_rank(scope_annotation, search_query)) annotation_rank,
							coalesce(case when ?filter_properties then null else 0 end, ts_rank(scope_properties, search_query)) properties_rank,
							coalesce(resp_rank + req_rank) scope_rank,
							coalesce(example_rank + annotation_rank + properties_rank) detailed_scope_rank
							where ts.data_hash = f.data_hash
							and
							(
								(
								(?filter_request = false and ?filter_response = false) or
								(?filter_request and search_query @@ scope_request) or
								(?filter_response and search_query @@ scope_response)
								)
								and 
								(
								(?filter_annotation = false and ?filter_examples = false and ?filter_properties = false) or
								(?filter_annotation and search_query @@ scope_annotation) or
								(?filter_examples and search_query @@ scope_examples) or
								(?filter_properties and search_query @@ scope_properties)
								)
							)
					) ts
					group by ts.data_hash
					order by max(rank) desc
					limit ?limit
					offset ?offset
			) rest_ts
				on rest_ts.data_hash = o.data_hash
				and o.type = ?rest_api_type
				and ?filter_all = false
			left join (
					select ts.data_hash, max(rank) as rank from (
							with filtered as (select data_hash from operations)
							select 
							ts.data_hash, 
							scope_rank rank
							from 
							ts_graphql_operation_data ts,
							filtered f,
							to_tsquery(?search_filter) search_query,
							--using coalesce to skip ts_rank evaluation for scopes that are not requested
							coalesce(case when ?filter_annotation then null else 0 end, ts_rank(scope_annotation, search_query)) annotation_rank,
							coalesce(case when ?filter_property then null else 0 end, ts_rank(scope_property, search_query)) property_rank,
							coalesce(case when ?filter_argument then null else 0 end, ts_rank(scope_argument, search_query)) argument_rank,
							coalesce(annotation_rank + property_rank + argument_rank) scope_rank
							where ts.data_hash = f.data_hash
							and
							(
								(?filter_annotation = false and ?filter_property = false and ?filter_argument = false) or
								(?filter_annotation and search_query @@ scope_annotation) or
								(?filter_property and search_query @@ scope_property) or
								(?filter_argument and search_query @@ scope_argument)
							)
					) ts
					group by ts.data_hash
					order by max(rank) desc
					limit ?limit
					offset ?offset
			) graphql_ts
				on graphql_ts.data_hash = o.data_hash
				and o.type = ?graphql_api_type
				and ?filter_all = false
			left join (
					select ts.data_hash, max(rank) as rank from (
							with filtered as (select data_hash from operations)
							select 
							ts.data_hash, 
							scope_rank rank
							from 
							ts_operation_data ts,
							filtered f,
							to_tsquery(?search_filter) search_query,
							--using coalesce to skip ts_rank evaluation for scopes that are not requested
							coalesce(case when ?filter_all then null else 0 end, ts_rank(scope_all, search_query)) scope_rank
							where ts.data_hash = f.data_hash
							and search_query @@ scope_all
					) ts
					group by ts.data_hash
					order by max(rank) desc
					limit ?limit
					offset ?offset
			) all_ts
				on all_ts.data_hash = o.data_hash
				and ?filter_all = true
			left join operation_open_count oc
                on oc.package_id = o.package_id
                and oc.version = o.version
                and oc.operation_id = o.operation_id,
			coalesce(?title_weight * (o.title ilike ?text_filter)::int, 0) title_tf,
			coalesce(?scope_weight * (coalesce(rest_ts.rank, 0) + coalesce(graphql_ts.rank, 0) + coalesce(all_ts.rank, 0)), 0) scope_tf,
			coalesce(title_tf + scope_tf, 0) init_rank,
			coalesce(
				?version_status_release_weight * (o.version_status = ?version_status_release)::int +
				?version_status_draft_weight * (o.version_status = ?version_status_draft)::int +
				?version_status_archived_weight * (o.version_status = ?version_status_archived)::int) version_status_tf,
			coalesce(?open_count_weight * coalesce(oc.open_count), 0) operation_open_count
			where init_rank > 0
			order by rank desc, o.version_published_at desc, o.operation_id
			limit ?limit;
	`
	_, err = o.cp.GetConnection().Model(searchQuery).Query(&result, operationsSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (o operationRepositoryImpl) SearchForOperations(searchQuery *entity.OperationSearchQuery) ([]entity.OperationSearchResult, error) {
	_, err := o.cp.GetConnection().Exec("select to_tsquery(?)", searchQuery.SearchString)
	if err != nil {
		return nil, fmt.Errorf("invalid search string: %v", err.Error())
	}
	searchQuery.TextFilter = "%" + utils.LikeEscaped(searchQuery.TextFilter) + "%"
	var result []entity.OperationSearchResult
	operationsSearchQuery := `
	with	maxrev as
			(
					select package_id, version, pg.name as package_name, max(revision) as revision
					from published_version pv
						inner join package_group pg
							on pg.id = pv.package_id
							and pg.exclude_from_search = false
					--where (?packages = '{}' or package_id = ANY(?packages))
					/* 
					for now packages list serves as a list of parents and packages, 
					after adding new parents list need to uncomment line above and change condition below to use parents list
					*/
					where (?packages = '{}' or package_id like ANY(
						select id from unnest(?packages::text[]) id
						union 
						select id||'.%' from unnest(?packages::text[]) id))
					and (?versions = '{}' or version = ANY(?versions))
					group by package_id, version, pg.name
			),
			versions as 
			(
					select pv.package_id, pv.version, pv.revision, pv.published_at, pv.status, maxrev.package_name
					from published_version pv
					inner join maxrev
							on pv.package_id = maxrev.package_id
							and pv.version = maxrev.version
							and pv.revision = maxrev.revision
					where pv.deleted_at is null
							and (?statuses = '{}' or pv.status = ANY(?statuses))
							and pv.published_at >= ?start_date
							and pv.published_at <= ?end_date
			),
			operations as
			(
					select o.*, v.status version_status, v.package_name, v.published_at version_published_at 
					from operation o
					inner join versions v
							on v.package_id = o.package_id
							and v.version = o.version
							and v.revision = o.revision
							and (?api_type = '' or o.type = ?api_type)
							and (?methods = '{}' or o.metadata->>'method' = ANY(?methods))
							and (?operation_types = '{}' or o.metadata->>'type' = ANY(?operation_types))
			)
			select
			o.package_id,
			o.package_name name,
			o.version,
			o.revision,
			o.version_status status,
			o.operation_id,
			o.title,
			o.data_hash,
			o.deprecated,
			o.kind,
			o.type,
			o.metadata,
			parent_package_names(o.package_id) parent_names,
			case 
				when init_rank > 0 then init_rank + version_status_tf + operation_open_count
				else 0
			end rank,

			--debug
			coalesce(?scope_weight) scope_weight,
			coalesce(?open_count_weight) open_count_weight,
			scope_tf,
			title_tf,
			version_status_tf,
			operation_open_count
			from operations o
			left join (
					select ts.data_hash, max(rank) as rank from (
							with filtered as (select data_hash from operations)
							select 
							ts.data_hash, 
							case when scope_rank = 0 then detailed_scope_rank
								 when detailed_scope_rank = 0 then scope_rank
								 else scope_rank * detailed_scope_rank end rank
							from 
							ts_rest_operation_data ts,
							filtered f,
							to_tsquery(?search_filter) search_query,
							--using coalesce to skip ts_rank evaluation for scopes that are not requested
							coalesce(case when ?filter_response then null else 0 end, ts_rank(scope_response, search_query)) resp_rank,
							coalesce(case when ?filter_request then null else 0 end, ts_rank(scope_request, search_query)) req_rank,
							coalesce(case when ?filter_examples then null else 0 end, ts_rank(scope_examples, search_query)) example_rank,
							coalesce(case when ?filter_annotation then null else 0 end, ts_rank(scope_annotation, search_query)) annotation_rank,
							coalesce(case when ?filter_properties then null else 0 end, ts_rank(scope_properties, search_query)) properties_rank,
							coalesce(resp_rank + req_rank) scope_rank,
							coalesce(example_rank + annotation_rank + properties_rank) detailed_scope_rank
							where ts.data_hash = f.data_hash
							and
							(
								(
								(?filter_request = false and ?filter_response = false) or
								(?filter_request and search_query @@ scope_request) or
								(?filter_response and search_query @@ scope_response)
								)
								and 
								(
								(?filter_annotation = false and ?filter_examples = false and ?filter_properties = false) or
								(?filter_annotation and search_query @@ scope_annotation) or
								(?filter_examples and search_query @@ scope_examples) or
								(?filter_properties and search_query @@ scope_properties)
								)
							)
					) ts
					group by ts.data_hash
					order by max(rank) desc
					limit ?limit
					offset ?offset
			) rest_ts
				on rest_ts.data_hash = o.data_hash
				and o.type = ?rest_api_type
				and ?filter_all = false
			left join (
					select ts.data_hash, max(rank) as rank from (
							with filtered as (select data_hash from operations)
							select 
							ts.data_hash, 
							scope_rank rank
							from 
							ts_graphql_operation_data ts,
							filtered f,
							to_tsquery(?search_filter) search_query,
							--using coalesce to skip ts_rank evaluation for scopes that are not requested
							coalesce(case when ?filter_annotation then null else 0 end, ts_rank(scope_annotation, search_query)) annotation_rank,
							coalesce(case when ?filter_property then null else 0 end, ts_rank(scope_property, search_query)) property_rank,
							coalesce(case when ?filter_argument then null else 0 end, ts_rank(scope_argument, search_query)) argument_rank,
							coalesce(annotation_rank + property_rank + argument_rank) scope_rank
							where ts.data_hash = f.data_hash
							and
							(
								(?filter_annotation = false and ?filter_property = false and ?filter_argument = false) or
								(?filter_annotation and search_query @@ scope_annotation) or
								(?filter_property and search_query @@ scope_property) or
								(?filter_argument and search_query @@ scope_argument)
							)
					) ts
					group by ts.data_hash
					order by max(rank) desc
					limit ?limit
					offset ?offset
			) graphql_ts
				on graphql_ts.data_hash = o.data_hash
				and o.type = ?graphql_api_type
				and ?filter_all = false
			left join (
					select ts.data_hash, max(rank) as rank from (
							with filtered as (select data_hash from operations)
							select 
							ts.data_hash, 
							scope_rank rank
							from 
							ts_operation_data ts,
							filtered f,
							to_tsquery(?search_filter) search_query,
							--using coalesce to skip ts_rank evaluation for scopes that are not requested
							coalesce(case when ?filter_all then null else 0 end, ts_rank(scope_all, search_query)) scope_rank
							where ts.data_hash = f.data_hash
							and search_query @@ scope_all
					) ts
					group by ts.data_hash
					order by max(rank) desc
					limit ?limit
					offset ?offset
			) all_ts
				on all_ts.data_hash = o.data_hash
				and ?filter_all = true
			left join operation_open_count oc
                on oc.package_id = o.package_id
                and oc.version = o.version
                and oc.operation_id = o.operation_id,
			coalesce(?title_weight * (o.title ilike ?text_filter)::int, 0) title_tf,
			coalesce(?scope_weight * (coalesce(rest_ts.rank, 0) + coalesce(graphql_ts.rank, 0) + coalesce(all_ts.rank, 0)), 0) scope_tf,
			coalesce(title_tf + scope_tf, 0) init_rank,
			coalesce(
				?version_status_release_weight * (o.version_status = ?version_status_release)::int +
				?version_status_draft_weight * (o.version_status = ?version_status_draft)::int +
				?version_status_archived_weight * (o.version_status = ?version_status_archived)::int) version_status_tf,
			coalesce(?open_count_weight * coalesce(oc.open_count), 0) operation_open_count
			where init_rank > 0
			order by rank desc, o.version_published_at desc, o.operation_id
			limit ?limit;
	`
	_, err = o.cp.GetConnection().Model(searchQuery).Query(&result, operationsSearchQuery)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (o operationRepositoryImpl) GetOperationsTypeCount(packageId string, version string, revision int) ([]entity.OperationsTypeCountEntity, error) {
	var result []entity.OperationsTypeCountEntity
	operationsTypeCountQuery := `
	with versions as(
        select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
        from published_version_reference s
		inner join published_version pv
		on pv.package_id = s.reference_id
		and pv.version = s.reference_version
		and pv.revision = s.reference_revision
		and pv.deleted_at is null
        where s.package_id = ?
        and s.version = ?
        and s.revision = ?
        and s.excluded = false
        union
        select ? as package_id, ? as version, ? as revision
    ),
    depr_count as (
		select type, count(operation_id) cnt from operation o, versions v
		where deprecated = true
		and o.package_id = v.package_id
		and o.version = v.version
		and o.revision = v.revision
		group by type
	),
	op_count as (
		select type, count(operation_id) cnt from operation o, versions v
		where o.package_id = v.package_id
		and o.version = v.version
		and o.revision = v.revision
		group by type
	),
	no_bwc_count as (
		select type, count(operation_id) cnt from operation o, versions v
		where o.package_id = v.package_id
		and o.version = v.version
		and o.revision = v.revision
		and o.kind = ?
		group by type
	),
	audience_count as (
		select type, api_audience, count(operation_id) cnt from operation o, versions v
		where o.package_id = v.package_id
		and o.version = v.version
		and o.revision = v.revision
		group by type, api_audience
	)
	select oc.type as type,
	coalesce(oc.cnt, 0) as operations_count,
	coalesce(dc.cnt, 0) as deprecated_count,
	coalesce(nbc.cnt, 0) as no_bwc_count,
	coalesce(ioc.cnt, 0) as internal_count,
	coalesce(uoc.cnt, 0) as unknown_count
	from op_count oc
	full outer join depr_count dc
	on oc.type = dc.type
	full outer join no_bwc_count nbc
	on oc.type = nbc.type
	full outer join audience_count ioc
	on oc.type = ioc.type
	and ioc.api_audience = ?
	full outer join audience_count uoc
	on oc.type = uoc.type
	and uoc.api_audience = ?;
	`
	_, err := o.cp.GetConnection().Query(&result,
		operationsTypeCountQuery,
		packageId, version, revision,
		packageId, version, revision,
		view.NoBwcApiKind,
		view.ApiAudienceInternal,
		view.ApiAudienceUnknown)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (o operationRepositoryImpl) GetOperationsTypeDataHashes(packageId string, version string, revision int) ([]entity.OperationsTypeDataHashEntity, error) {
	var result []entity.OperationsTypeDataHashEntity
	operationsTypeOperationHashesQuery := `
		select type, json_object_agg(operation_id, data_hash) operations_hash
		from operation
		where package_id = ?
		and version = ?
		and revision = ?
		group by type;
	`
	_, err := o.cp.GetConnection().Query(&result,
		operationsTypeOperationHashesQuery,
		packageId, version, revision,
	)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (o operationRepositoryImpl) GetDeprecatedOperationsSummary(packageId string, version string, revision int) ([]entity.DeprecatedOperationsSummaryEntity, error) {
	var result []entity.DeprecatedOperationsSummaryEntity
	deprecatedOperationsSummaryQuery := `
	with depr_count as (
		select type, count(operation_id) cnt from operation
		where ((operation.deprecated_items is not null and jsonb_typeof(operation.deprecated_items) = 'array' and jsonb_array_length(operation.deprecated_items) != 0) 
			or operation.deprecated = true)
		and package_id = ? and version = ? and revision = ?
		group by type
	),
 	tagss as (
		 select type, array_agg(distinct x.value) as tags from operation
			cross join lateral jsonb_array_elements_text(metadata->'tags') as x
		 where package_id = ? and version = ? and revision = ? 
		 and ((operation.deprecated_items is not null and jsonb_typeof(operation.deprecated_items) = 'array' and jsonb_array_length(operation.deprecated_items) != 0) 
				or operation.deprecated = true)
		 group by type
	)
	
	select dc.type as type, 
	coalesce(dc.cnt, 0) as deprecated_count,
	coalesce(tg.tags, '{}') as tags
	from depr_count dc
	full outer join tagss tg
	on dc.type = tg.type;
	`
	_, err := o.cp.GetConnection().Query(&result,
		deprecatedOperationsSummaryQuery,
		packageId, version, revision,
		packageId, version, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}
func (o operationRepositoryImpl) GetDeprecatedOperationsRefsSummary(packageId string, version string, revision int) ([]entity.DeprecatedOperationsSummaryEntity, error) {
	var result []entity.DeprecatedOperationsSummaryEntity
	deprecatedOperationsSummaryQuery := `
	with refss as (
		select operation.type, operation.package_id, operation.version, operation.revision,operation.deprecated,operation.metadata,operation.operation_id, operation.deprecated_items from operation inner join 
		(with refs as(
			select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
			from published_version_reference s
			inner join published_version pv
			on pv.package_id = s.reference_id
			and pv.version = s.reference_version
			and pv.revision = s.reference_revision
			and pv.deleted_at is null
			where s.package_id = ?
			and s.version = ?
			and s.revision = ?
			and s.excluded = false
		)
		select package_id, version, revision
		from refs
		) refs on operation.package_id = refs.package_id and operation.version = refs.version and operation.revision = refs.revision
	),
	depr_count as (
		select type, count(operation_id) as cnt, package_id, version, revision from refss as r
			where ((r.deprecated_items is not null and jsonb_typeof(r.deprecated_items) = 'array' and jsonb_array_length(r.deprecated_items) != 0) 
				or r.deprecated = true)
		group by package_id, version, revision,type
	),
    tagss as (
		 select type, array_agg(distinct x.value) as tags, package_id, version,revision from refss 
			cross join lateral jsonb_array_elements_text(metadata->'tags') as x
		where ((deprecated_items is not null and jsonb_typeof(deprecated_items) = 'array' and jsonb_array_length(deprecated_items) != 0) 
			or deprecated = true)
		 group by package_id, version, revision, type
	)
	
	select dc.type as type, dc.package_id as package_id, dc.version as version, dc.revision as revision, 
	coalesce(dc.cnt, 0) as deprecated_count,
	coalesce(tg.tags, '{}') as tags
	from depr_count dc
	full outer join tagss tg
	on dc.type = tg.type and dc.package_id = tg.package_id and dc.version = tg.version and dc.revision = tg.revision;
	`
	_, err := o.cp.GetConnection().Query(&result,
		deprecatedOperationsSummaryQuery,
		packageId, version, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return result, nil
}

func (o operationRepositoryImpl) GetOperationGroup(packageId string, version string, revision int, apiType string, groupName string) (*entity.OperationGroupEntity, error) {
	result := new(entity.OperationGroupEntity)
	err := o.cp.GetConnection().Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Where("api_type = ?", apiType).
		Where("group_name = ?", groupName).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetOperationGroupTemplateFile(packageId string, version string, revision int, apiType string, groupName string) (*entity.OperationGroupTemplateFileEntity, error) {
	result := new(entity.OperationGroupTemplateFileEntity)
	err := o.cp.GetConnection().Model(result).
		ColumnExpr("og.template_filename, operation_group_template.template").
		Join("inner join operation_group og").
		JoinOn("og.package_id = ?", packageId).
		JoinOn("og.version = ?", version).
		JoinOn("og.revision = ?", revision).
		JoinOn("og.api_type = ?", apiType).
		JoinOn("og.group_name = ?", groupName).
		JoinOn("og.template_checksum = operation_group_template.checksum").
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) AddOperationGroupHistory(ent *entity.OperationGroupHistoryEntity) error {
	_, err := o.cp.GetConnection().Model(ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (o operationRepositoryImpl) CreateOperationGroup(ent *entity.OperationGroupEntity, templateEntity *entity.OperationGroupTemplateEntity) error {
	ctx := context.Background()
	return o.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(ent).Insert()
		if err != nil {
			return err
		}
		return o.saveOperationGroupTemplate(tx, templateEntity)
	})
}

func (o operationRepositoryImpl) DeleteOperationGroup(ent *entity.OperationGroupEntity) error {
	ctx := context.Background()
	return o.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(ent).WherePK().Delete()
		if err != nil {
			return err
		}
		return o.cleanupOperationGroupTemplate(tx, ent.TemplateChecksum)
	})
}

func (o operationRepositoryImpl) ReplaceOperationGroup(oldGroupEntity *entity.OperationGroupEntity, newGroupEntity *entity.OperationGroupEntity, operationEntities []entity.GroupedOperationEntity, newTemplateEntity *entity.OperationGroupTemplateEntity) error {
	ctx := context.Background()
	return o.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(oldGroupEntity).WherePK().Delete()
		if err != nil {
			return fmt.Errorf("failed to delete old group %+v: %w", oldGroupEntity, err)
		}
		_, err = tx.Model(newGroupEntity).Insert()
		if err != nil {
			return fmt.Errorf("failed to insert new group %+v: %w", newGroupEntity, err)
		}
		if len(operationEntities) > 0 {
			_, err = tx.Model(&operationEntities).Insert()
			if err != nil {
				return fmt.Errorf("failed to insert grouped operations %+v: %w", operationEntities, err)
			}
		}
		err = o.saveOperationGroupTemplate(tx, newTemplateEntity)
		if err != nil {
			return err
		}
		err = o.cleanupOperationGroupTemplate(tx, oldGroupEntity.TemplateChecksum)
		if err != nil {
			return err
		}
		return nil
	})
}

func (o operationRepositoryImpl) UpdateOperationGroup(oldGroupEntity *entity.OperationGroupEntity, newGroupEntity *entity.OperationGroupEntity, newTemplateEntity *entity.OperationGroupTemplateEntity, newGroupedOperations *[]entity.GroupedOperationEntity) error {
	ctx := context.Background()
	return o.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		//update to operation_group.group_id also updates grouped_operation.group_id
		_, err := tx.Model(newGroupEntity).
			Where("group_id = ?", oldGroupEntity.GroupId).
			Set("group_name = ?group_name").
			Set("group_id = ?group_id").
			Set("description = ?description").
			Set("template_checksum = ?template_checksum").
			Set("template_filename = ?template_filename").
			Update()
		if err != nil {
			return err
		}
		err = o.saveOperationGroupTemplate(tx, newTemplateEntity)
		if err != nil {
			return err
		}
		err = o.cleanupOperationGroupTemplate(tx, oldGroupEntity.TemplateChecksum)
		if err != nil {
			return err
		}
		if newGroupedOperations == nil {
			return nil
		}
		_, err = tx.Exec(`delete from grouped_operation where group_id = ?`, newGroupEntity.GroupId)
		if err != nil {
			return err
		}
		if len(*newGroupedOperations) > 0 {
			_, err = tx.Model(newGroupedOperations).Insert()
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (o operationRepositoryImpl) saveOperationGroupTemplate(tx *pg.Tx, ent *entity.OperationGroupTemplateEntity) error {
	if ent == nil {
		return nil
	}
	_, err := tx.Model(ent).OnConflict("(checksum) DO NOTHING").Insert()
	if err != nil {
		return err
	}
	return nil
}

func (o operationRepositoryImpl) cleanupOperationGroupTemplate(tx *pg.Tx, templateChecksum string) error {
	if templateChecksum == "" {
		return nil
	}
	_, err := tx.Exec(`
		delete from operation_group_template t
		where t.checksum = ? and not exists (select 1 from operation_group where template_checksum = t.checksum);
		`, templateChecksum)
	if err != nil {
		return err
	}
	return nil
}

func (o operationRepositoryImpl) CalculateOperationGroups(packageId string, version string, revision int, groupingPrefix string) ([]string, error) {
	if groupingPrefix == "" {
		return []string{}, nil
	}
	type group struct {
		Group string `pg:"group_name"`
	}
	var groups []group
	operationGroupsQuery := `
	select distinct coalesce(group_name, '') as group_name from (
		select 
		case 
			when type = 'rest' 
				then case when ? = '' then null else substring(metadata ->> 'path', ?) end
			when type = 'graphql' 
				then case when ? = '' then null else substring(metadata ->> 'method', ?) end
		end group_name
		from operation
		where package_id = ?
		and version = ?
		and revision = ?
	) groups
	`
	_, err := o.cp.GetConnection().Query(&groups,
		operationGroupsQuery,
		groupingPrefix, groupingPrefix,
		groupingPrefix, groupingPrefix,
		packageId,
		version,
		revision)
	if err != nil {
		return nil, err
	}
	operationGroups := []string{}
	for _, grp := range groups {
		operationGroups = append(operationGroups, grp.Group)
	}
	return operationGroups, nil
}

func (o operationRepositoryImpl) GetVersionOperationGroups(packageId string, version string, revision int) ([]entity.OperationGroupCountEntity, error) {
	var result []entity.OperationGroupCountEntity
	operationGroupCountQuery := `
	select og.package_id, og.version, og.revision, og.api_type, og.group_name, og.autogenerated, og.description,
	(select count(*) from grouped_operation where group_id = og.group_id) operations_count,
	og.template_filename export_template_filename
	from operation_group og
	where package_id = ?
	and version = ?
	and revision = ?`
	_, err := o.cp.GetConnection().Query(&result, operationGroupCountQuery, packageId, version, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetGroupedOperations(packageId string, version string, revision int, operationType string, groupName string, searchReq view.OperationListReq) ([]entity.OperationRichEntity, error) {
	var result []entity.OperationRichEntity
	query := o.cp.GetConnection().Model(&result).
		ColumnExpr("operation.*")

	query.Join(`inner join 
		(with refs as(
			select s.reference_id as package_id, s.reference_version as version, s.reference_revision as revision
			from published_version_reference s
			inner join published_version pv
			on pv.package_id = s.reference_id
			and pv.version = s.reference_version
			and pv.revision = s.reference_revision
			and pv.deleted_at is null
			where s.package_id = ?
			and s.version = ?
			and s.revision = ?
			and s.excluded = false
		)
		select package_id, version, revision
		from refs
		union
		select ? as package_id, ? as version, ? as revision
		) refs`, packageId, version, revision, packageId, version, revision)
	query.JoinOn("operation.package_id = refs.package_id").
		JoinOn("operation.version = refs.version").
		JoinOn("operation.revision = refs.revision")

	if searchReq.RefPackageId != "" {
		query.JoinOn("refs.package_id = ?", searchReq.RefPackageId)
	}
	if searchReq.OnlyAddable {
		//todo try to replace this 'not in' condition with join
		query.Where(`operation.operation_id not in (
			select operation_id from grouped_operation go
			inner join operation_group og
			on go.group_id = og.group_id
			and og.package_id = ?
			and og.version = ?
			and og.revision = ?
			and og.api_type = ?
			and og.group_name = ?
			where go.package_id = operation.package_id
			and go.version = operation.version
			and go.revision = operation.revision
		)`, packageId, version, revision, operationType, groupName)
	} else {
		query.Join(`inner join operation_group og`).
			JoinOn("og.package_id = ?", packageId).
			JoinOn("og.version = ?", version).
			JoinOn("og.revision = ?", revision).
			JoinOn("og.api_type = ?", operationType).
			JoinOn("og.group_name = ?", groupName).
			Join("inner join grouped_operation go").
			JoinOn("go.group_id = og.group_id").
			JoinOn("go.package_id = operation.package_id").
			JoinOn("go.version = operation.version").
			JoinOn("go.revision = operation.revision").
			JoinOn("go.operation_id = operation.operation_id")
	}

	query.Where("operation.type = ?", operationType)

	query.Order("operation.package_id",
		"operation.version",
		"operation.revision",
		"operation_id ASC").
		Offset(searchReq.Limit * searchReq.Page).
		Limit(searchReq.Limit)

	if searchReq.TextFilter != "" {
		searchReq.TextFilter = "%" + utils.LikeEscaped(searchReq.TextFilter) + "%"
		query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			q = q.WhereOr("operation.title ilike ?", searchReq.TextFilter).
				WhereOr("operation.metadata->>? ilike ?", "path", searchReq.TextFilter).
				WhereOr("operation.metadata->>? ilike ?", "method", searchReq.TextFilter)
			return q, nil
		})
	}

	if searchReq.Kind != "" {
		query.Where("kind = ?", searchReq.Kind)
	}
	if searchReq.ApiAudience != "" {
		query.Where("api_audience = ?", searchReq.ApiAudience)
	}

	if searchReq.Tag != "" {
		searchReq.Tag = utils.LikeEscaped(searchReq.Tag)
		query.Where(`exists(
			select 1 from jsonb_array_elements(operation.metadata -> 'tags') a
			where replace(a.value::text,'"','') like ?)`, searchReq.Tag)
	}

	if searchReq.EmptyTag {
		query.Where(`not exists(select 1 from jsonb_array_elements(operation.metadata -> 'tags') a
            where a.value != '""') `)
	}

	if searchReq.Deprecated != nil {
		query.Where("operation.deprecated = ?", *searchReq.Deprecated)
	}

	if searchReq.DocumentSlug != "" {
		query.Join("inner join published_version_revision_content as pvrc").
			JoinOn("operation.operation_id = any(pvrc.operation_ids)").
			JoinOn("pvrc.slug = ?", searchReq.DocumentSlug).
			JoinOn("operation.package_id = pvrc.package_id").
			JoinOn("operation.version = pvrc.version").
			JoinOn("operation.revision = pvrc.revision")
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

func (o operationRepositoryImpl) GetOperationsByModelHash(packageId string, version string, revision int, apiType string, modelHash string) ([]entity.OperationModelsEntity, error) {
	var result []entity.OperationModelsEntity
	operationsByModelHashQuery := `
	with operation_model as(
		select o.package_id, o.version, o.revision, o.operation_id, m.key::varchar as key, m.value::varchar as hash
		from operation o, jsonb_each_text(o.models) m
		where o.package_id = ?
		and o.version = ?
		and o.revision = ? 
		and o.type = ?
	)
	select m.operation_id, array_agg(m.key)::varchar[] models
	from operation_model m
	where m.hash = ?
	group by m.operation_id
	order by m.operation_id;
	`
	_, err := o.cp.GetConnection().Query(&result, operationsByModelHashQuery, packageId, version, revision, apiType, modelHash)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (o operationRepositoryImpl) GetOperationsByPathAndMethod(packageId string, version string, revision int, apiType string, path string, method string) ([]string, error) {
	type OperationId struct {
		OperationId string `pg:"operation_id"`
	}
	var operationIds []OperationId

	operationsByPathAndMethod := `
		select operation_id
		from operation
		where package_id = ?
		and version = ?
		and revision = ?
		and type = ?
		and metadata ->> 'path' ilike ?
		and metadata ->> 'method' ilike ?
	`
	_, err := o.cp.GetConnection().Query(&operationIds, operationsByPathAndMethod, packageId, version, revision, apiType, path, method)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	result := make([]string, 0)

	for _, t := range operationIds {
		result = append(result, t.OperationId)
	}
	return result, nil
}
