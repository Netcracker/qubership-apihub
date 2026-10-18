package entity

type VisibilityPrincipal struct {
	UserId        string
	ApiKeyScopeId string
	ApiKeyRoleIds []string
}

type PackageReadAccessEntity struct {
	tableName struct{} `pg:",discard_unknown_columns"`

	PackageId         string `pg:"id"`
	ParentId          string `pg:"parent_id"`
	CanRead           bool   `pg:"can_read"`
	ExcludeFromSearch bool   `pg:"exclude_from_search"`
}
