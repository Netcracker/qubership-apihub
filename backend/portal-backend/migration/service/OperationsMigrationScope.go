package service

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/utils"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

const migrationScopeSuffix = ".*"

func resolveMigrationPackageIds(ctx context.Context, tx *pg.Tx, packageIds []string) ([]string, error) {
	roots := make([]string, 0)
	for _, id := range packageIds {
		if !strings.Contains(id, "*") {
			continue
		}
		root := strings.TrimSuffix(id, migrationScopeSuffix)
		if root == id || root == "" || strings.Contains(root, "*") ||
			strings.HasPrefix(root, ".") || strings.HasSuffix(root, ".") || strings.Contains(root, "..") {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.MigrationPackageScopeInvalidMsg,
				Params:  map[string]interface{}{"value": id},
			}
		}
		roots = append(roots, root)
	}
	if len(roots) == 0 {
		return packageIds, nil
	}

	var descendants []string
	query := migrationDescendantsQuery(tx.ModelContext(ctx, (*entity.PackageEntity)(nil)), roots)
	if err := query.Select(&descendants); err != nil {
		return nil, fmt.Errorf("failed to resolve migration workspace or group scopes: %w", err)
	}
	return expandMigrationPackageIds(packageIds, descendants)
}

func migrationDescendantsQuery(query *orm.Query, roots []string) *orm.Query {
	return query.Column("id").
		Where("deleted_at is null").
		Where("kind in (?)", pg.In([]string{entity.KIND_PACKAGE, entity.KIND_DASHBOARD})).
		WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			for _, root := range roots {
				q = q.WhereOr(utils.DescendantsCondition("id", "?"), root, root)
			}
			return q, nil
		})
}

func expandMigrationPackageIds(packageIds, descendants []string) ([]string, error) {
	resolved := make(map[string]struct{})
	for _, id := range packageIds {
		if !strings.HasSuffix(id, migrationScopeSuffix) {
			resolved[id] = struct{}{}
			continue
		}
		prefix := strings.TrimSuffix(id, migrationScopeSuffix) + "."
		matched := false
		for _, descendant := range descendants {
			if strings.HasPrefix(descendant, prefix) {
				resolved[descendant] = struct{}{}
				matched = true
			}
		}
		if !matched {
			// An empty package list means full migration to every stage, including cleanup.
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.MigrationPackageScopeNotFoundMsg,
				Params:  map[string]interface{}{"value": id},
			}
		}
	}
	result := make([]string, 0, len(resolved))
	for id := range resolved {
		result = append(result, id)
	}
	sort.Strings(result)
	return result, nil
}
