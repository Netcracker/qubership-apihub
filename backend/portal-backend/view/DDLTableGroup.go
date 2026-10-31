package view

const DdlTableGroupTablesLimit = 5000

type CreateDdlTableGroupReq struct {
	GroupName   string          `json:"groupName" validate:"required"`
	Description string          `json:"description"`
	Tables      []DdlGroupTable `json:"tables" validate:"dive"`
}

type UpdateDdlTableGroupReq struct {
	GroupName   *string          `json:"groupName"`
	Description *string          `json:"description"`
	Tables      *[]DdlGroupTable `json:"tables" validate:"omitempty,dive"`
}

// DdlGroupTable references a DDL entity to include in a group. PackageId and Version are empty
// for entities of the group's own version; for a dashboard they name one of the version's
// non-excluded references.
type DdlGroupTable struct {
	PackageId   string `json:"packageId"`
	Version     string `json:"version"`
	DdlEntityId string `json:"ddlEntityId" validate:"required"`
}

type DdlTableGroupView struct {
	GroupName   string `json:"groupName"`
	Description string `json:"description,omitempty"`
	TablesCount int    `json:"tablesCount"`
}

type DdlTableGroupListView struct {
	Groups []DdlTableGroupView `json:"groups"`
}

type GroupedDdlEntitiesView struct {
	GroupName   string                       `json:"groupName"`
	Description string                       `json:"description,omitempty"`
	Entities    []interface{}                `json:"entities"`
	Packages    map[string]PackageVersionRef `json:"packages,omitempty"`
}
