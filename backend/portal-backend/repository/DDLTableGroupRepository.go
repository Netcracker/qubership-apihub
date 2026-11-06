package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type DDLTableGroupRepository interface {
	GetDdlTableGroup(ctx context.Context, packageId, version string, revision int, groupName string) (*entity.DDLTableGroupEntity, error)
	ListDdlTableGroups(ctx context.Context, packageId, version string, revision int) ([]entity.DDLTableGroupCountEntity, error)
	CreateDdlTableGroup(ctx context.Context, group *entity.DDLTableGroupEntity, members []entity.GroupedDdlTableEntity) error
	UpdateDdlTableGroup(ctx context.Context, oldGroup, newGroup *entity.DDLTableGroupEntity, newMembers *[]entity.GroupedDdlTableEntity) error
	DeleteDdlTableGroup(ctx context.Context, group *entity.DDLTableGroupEntity) error
	GetGroupedDdlEntities(ctx context.Context, groupId, refPackageId, textFilter string, limit, offset int) ([]*entity.DDLContractEntity, error)
	FilterExistingDdlEntities(ctx context.Context, members []entity.GroupedDdlTableEntity) (map[string]struct{}, error)
	GetVersionGroupedDdlTableNames(ctx context.Context, packageId, version string, revision int) ([]entity.GroupedDdlTableNameEntity, error)
}

type ddlTableGroupRepositoryImpl struct {
	cp db.ConnectionProvider
}

func NewDDLTableGroupRepository(cp db.ConnectionProvider) DDLTableGroupRepository {
	return &ddlTableGroupRepositoryImpl{cp: cp}
}

func (r *ddlTableGroupRepositoryImpl) GetDdlTableGroup(ctx context.Context, packageId, version string, revision int, groupName string) (*entity.DDLTableGroupEntity, error) {
	result := new(entity.DDLTableGroupEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
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

func (r *ddlTableGroupRepositoryImpl) ListDdlTableGroups(ctx context.Context, packageId, version string, revision int) ([]entity.DDLTableGroupCountEntity, error) {
	var result []entity.DDLTableGroupCountEntity
	//tables_count joins ddl_tables so that it matches the number of entities GetGroupedDdlEntities
	//returns: a member whose DDL entity no longer exists is counted by neither
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result, `
		select g.package_id, g.version, g.revision, g.group_name, g.group_id, g.description,
		       (select count(*)
		        from grouped_ddl_table m
		        inner join ddl_tables t on t.package_id = m.package_id and t.version = m.version
		            and t.revision = m.revision and t.ddl_entity_id = m.ddl_entity_id
		        where m.group_id = g.group_id) tables_count
		from ddl_table_group g
		where g.package_id = ? and g.version = ? and g.revision = ?
		order by g.group_name`,
		packageId, version, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (r *ddlTableGroupRepositoryImpl) CreateDdlTableGroup(ctx context.Context, group *entity.DDLTableGroupEntity, members []entity.GroupedDdlTableEntity) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(group).Insert()
		if err != nil {
			return err
		}
		if len(members) == 0 {
			return nil
		}
		_, err = tx.Model(&members).Insert()
		return err
	})
}

// UpdateDdlTableGroup renames the group and replaces its description in place; group_id is a stable
// surrogate and never changes, so member rows need no re-linking. newMembers == nil leaves membership
// untouched, a non-nil slice replaces it wholesale.
func (r *ddlTableGroupRepositoryImpl) UpdateDdlTableGroup(ctx context.Context, oldGroup, newGroup *entity.DDLTableGroupEntity, newMembers *[]entity.GroupedDdlTableEntity) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(newGroup).
			Where("group_id = ?", oldGroup.GroupId).
			Set("group_name = ?group_name").
			Set("description = ?description").
			Update()
		if err != nil {
			return err
		}
		if newMembers == nil {
			return nil
		}
		_, err = tx.Exec(`delete from grouped_ddl_table where group_id = ?`, newGroup.GroupId)
		if err != nil {
			return err
		}
		if len(*newMembers) > 0 {
			_, err = tx.Model(newMembers).Insert()
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *ddlTableGroupRepositoryImpl) DeleteDdlTableGroup(ctx context.Context, group *entity.DDLTableGroupEntity) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(group).WherePK().Delete()
	return err
}

// GetGroupedDdlEntities resolves group members against ddl_tables. The inner join is what keeps
// members whose DDL entity has since been removed out of the result, since grouped_ddl_table
// deliberately has no foreign key to ddl_tables.
func (r *ddlTableGroupRepositoryImpl) GetGroupedDdlEntities(ctx context.Context, groupId, refPackageId, textFilter string, limit, offset int) ([]*entity.DDLContractEntity, error) {
	var result []*entity.DDLContractEntity
	query := r.cp.GetConnection().WithContext(ctx).Model(&result).
		ColumnExpr("ddl_tables.*").
		Join("inner join grouped_ddl_table m").
		JoinOn("m.group_id = ?", groupId).
		JoinOn("m.package_id = ddl_tables.package_id").
		JoinOn("m.version = ddl_tables.version").
		JoinOn("m.revision = ddl_tables.revision").
		JoinOn("m.ddl_entity_id = ddl_tables.ddl_entity_id")
	if refPackageId != "" {
		query = query.Where("ddl_tables.package_id = ?", refPackageId)
	}
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

// FilterExistingDdlEntities returns the subset of the requested member keys that exist in ddl_tables,
// keyed by MakeGroupedDdlTableKey. Membership is validated here because grouped_ddl_table has no
// foreign key to ddl_tables.
func (r *ddlTableGroupRepositoryImpl) FilterExistingDdlEntities(ctx context.Context, members []entity.GroupedDdlTableEntity) (map[string]struct{}, error) {
	result := make(map[string]struct{}, len(members))
	if len(members) == 0 {
		return result, nil
	}
	placeholders := make([]string, 0, len(members))
	args := make([]interface{}, 0, len(members)*4)
	for _, member := range members {
		placeholders = append(placeholders, "(?, ?, ?::integer, ?)")
		args = append(args, member.PackageId, member.Version, member.Revision, member.DdlEntityId)
	}
	var rows []entity.GroupedDdlTableNameEntity
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&rows, `
		select t.package_id, t.version, t.revision, t.ddl_entity_id
		from ddl_tables t
		inner join (values `+strings.Join(placeholders, ", ")+`) as k(package_id, version, revision, ddl_entity_id)
			on t.package_id = k.package_id and t.version = k.version
			and t.revision = k.revision and t.ddl_entity_id = k.ddl_entity_id`,
		args...)
	if err != nil {
		if err == pg.ErrNoRows {
			return result, nil
		}
		return nil, err
	}
	for _, row := range rows {
		result[entity.MakeGroupedDdlTableKey(row.PackageId, row.Version, row.Revision, row.DdlEntityId)] = struct{}{}
	}
	return result, nil
}

func (r *ddlTableGroupRepositoryImpl) GetVersionGroupedDdlTableNames(ctx context.Context, packageId, version string, revision int) ([]entity.GroupedDdlTableNameEntity, error) {
	var result []entity.GroupedDdlTableNameEntity
	_, err := r.cp.GetConnection().WithContext(ctx).Query(&result, `
		select g.group_name, m.package_id, m.version, m.revision, m.ddl_entity_id
		from grouped_ddl_table m
		inner join ddl_table_group g on g.group_id = m.group_id
		where g.package_id = ? and g.version = ? and g.revision = ?
		order by g.group_name`,
		packageId, version, revision)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
