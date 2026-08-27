package repository

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

// convertPackageReadScopeToSQL converts scope as a WHERE condition over row. The result references the named parameters
// ?user_id and ?subtree_root, so the query's parameter struct has to declare both.
func convertPackageReadScopeToSQL(scope view.PackageReadScope, userId string, idColumn string, alias string) ([]string, string, error) {
	switch scope.Kind {
	case view.PackageReadScopeAll:
		return nil, "", nil
	case view.PackageReadScopeSubtree:
		if scope.SubtreeRoot == "" {
			return nil, "", fmt.Errorf("package read scope of kind %v has no subtree root", scope.Kind)
		}
		return nil, utils.SubtreeCondition(idColumn, "?subtree_root"), nil
	case view.PackageReadScopeUser:
		if userId == "" {
			return nil, "", fmt.Errorf("package read scope of kind %v has no user id", scope.Kind)
		}
		if alias == "" {
			return nil, "", fmt.Errorf("package read scope of kind %v has no package row to read default_role from", scope.Kind)
		}
		readGrantingRolesCTE := `read_granting_roles as materialized (
			select coalesce(array_agg(id), array[]::character varying[]) as ids
			from role
			where coalesce('read' = any(permissions), false)
		)`
		userCondition := fmt.Sprintf(`case
			when %[1]s.default_role = any((select ids from read_granting_roles)::character varying[]) then true
			else exists (
				select 1
				from package_group anc
				where anc.id = any(package_ancestor_ids(%[1]s.id))
				  and anc.id != %[1]s.id
				  and anc.default_role = any((select ids from read_granting_roles)::character varying[])
			)
			or exists (
				select 1
				from package_member_role m
				where m.package_id = any(package_ancestor_ids(%[1]s.id))
				  and m.user_id = ?user_id
				  and m.roles && (select ids from read_granting_roles)::character varying[]
			)
		end`, alias)
		return []string{readGrantingRolesCTE}, userCondition, nil
	default:
		return nil, "", fmt.Errorf("unsupported package read scope kind %v", scope.Kind)
	}
}
