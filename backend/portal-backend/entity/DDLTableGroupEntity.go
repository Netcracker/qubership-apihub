package entity

import "github.com/Netcracker/qubership-apihub/backend/portal-backend/view"

type DDLTableGroupEntity struct {
	tableName struct{} `pg:"ddl_table_group, alias:ddl_table_group"`

	PackageId   string `pg:"package_id, pk, type:varchar"`
	Version     string `pg:"version, pk, type:varchar"`
	Revision    int    `pg:"revision, pk, type:integer"`
	GroupName   string `pg:"group_name, pk, type:varchar"`
	GroupId     string `pg:"group_id, type:varchar"`
	Description string `pg:"description, type:varchar, use_zero"`
}

type GroupedDdlTableEntity struct {
	tableName struct{} `pg:"grouped_ddl_table, alias:grouped_ddl_table"`

	GroupId     string `pg:"group_id, pk, type:varchar"`
	PackageId   string `pg:"package_id, pk, type:varchar"`
	Version     string `pg:"version, pk, type:varchar"`
	Revision    int    `pg:"revision, pk, type:integer"`
	DdlEntityId string `pg:"ddl_entity_id, pk, type:varchar"`
}

type DDLTableGroupCountEntity struct {
	DDLTableGroupEntity
	TablesCount int `pg:"tables_count, type:integer"`
}

// GroupedDdlTableNameEntity is a (member key, group name) pair used to build the Group column
// of the DDL Excel reports.
type GroupedDdlTableNameEntity struct {
	GroupName   string `pg:"group_name"`
	PackageId   string `pg:"package_id"`
	Version     string `pg:"version"`
	Revision    int    `pg:"revision"`
	DdlEntityId string `pg:"ddl_entity_id"`
}

// MakeGroupedDdlTableKey builds the lookup key identifying one DDL group member across packages:
// "<packageId>@<version>@<revision>@<ddlEntityId>".
func MakeGroupedDdlTableKey(packageId string, version string, revision int, ddlEntityId string) string {
	return MakeDdlEntityGroupKey(view.MakePackageRefKey(packageId, version, revision), ddlEntityId)
}

// MakeDdlEntityGroupKey builds the same key from an already formatted package ref, as carried by
// view.DdlContractEntityView.PackageRef and view.DdlEntityData.PackageRef.
func MakeDdlEntityGroupKey(packageRef string, ddlEntityId string) string {
	return packageRef + "@" + ddlEntityId
}

func MakeDdlTableGroupView(ent DDLTableGroupCountEntity) view.DdlTableGroupView {
	return view.DdlTableGroupView{
		GroupName:   ent.GroupName,
		Description: ent.Description,
		TablesCount: ent.TablesCount,
	}
}
