package service

import (
	"context"
	"net/http"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/exception"
	"github.com/go-pg/pg/v10/orm"
	"github.com/stretchr/testify/require"
)

func TestExpandMigrationPackageIds(t *testing.T) {
	const folderScope = "workspace.rest.*"
	const directPackage = "workspace.rest.petstore"
	const nestedPackage = "workspace.rest.nested.orders"
	const exactPackage = "workspace.async.events"
	descendants := []string{
		directPackage, nestedPackage, "workspace.rest.dashboard",
		"workspace.restOther.petstore", "workspace.rest", "other.rest.petstore",
	}
	tests := []struct {
		name  string
		scope []string
		want  []string
	}{
		{
			name:  "folder includes nested descendants but excludes siblings and root",
			scope: []string{folderScope},
			want:  []string{"workspace.rest.dashboard", nestedPackage, directPackage},
		},
		{
			name:  "exact IDs do not include descendants",
			scope: []string{"workspace.rest"},
			want:  []string{"workspace.rest"},
		},
		{
			name:  "mixed and overlapping scopes are deduplicated",
			scope: []string{folderScope, exactPackage, directPackage, "workspace.rest.nested.*", folderScope},
			want:  []string{exactPackage, "workspace.rest.dashboard", nestedPackage, directPackage},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := expandMigrationPackageIds(tt.scope, descendants)
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestExpandMigrationPackageIdsRejectsUnmatchedScope(t *testing.T) {
	const missingScope = "workspace.empty.*"
	for _, scope := range [][]string{
		{missingScope},
		{"workspace.rest.*", missingScope},
		{"workspace.exact", missingScope},
	} {
		got, err := expandMigrationPackageIds(scope, []string{"workspace.rest.petstore", "workspace.emptySibling.petstore"})
		require.Nil(t, got)
		var customErr *exception.CustomError
		require.ErrorAs(t, err, &customErr)
		require.Equal(t, http.StatusBadRequest, customErr.Status)
		require.Equal(t, exception.InvalidParameterValue, customErr.Code)
		require.Equal(t, exception.MigrationPackageScopeNotFoundMsg, customErr.Message)
		require.Equal(t, missingScope, customErr.Params["value"])
	}
}

func TestMigrationFolderScopeUsesLiteralPrefix(t *testing.T) {
	const literalPackage = "workspace.api_%.nested.package"
	got, err := expandMigrationPackageIds([]string{"workspace.api_%.*"}, []string{
		literalPackage, "workspace.api_other.package", "workspace.apiX.package",
	})
	require.NoError(t, err)
	require.Equal(t, []string{literalPackage}, got)
}

func TestResolveMigrationPackageIdsWithoutWildcards(t *testing.T) {
	for _, scope := range [][]string{nil, {}, {"workspace.exact", "workspace.missing", "workspace.exact"}} {
		got, err := resolveMigrationPackageIds(context.Background(), nil, scope)
		require.NoError(t, err)
		require.Equal(t, scope, got)
	}
}

func TestMigrationDescendantsQuery(t *testing.T) {
	query := migrationDescendantsQuery(orm.NewQuery(nil, (*entity.PackageEntity)(nil)), []string{"workspace.rest", "workspace.async"})
	sql, err := orm.NewSelectQuery(query).AppendQuery(orm.NewFormatter(), nil)
	require.NoError(t, err)
	require.Equal(t, `SELECT "id" FROM "package_group" AS "package_group" WHERE (deleted_at is null) AND (kind in ('package','dashboard')) AND (((id ~>=~ ('workspace.rest' || '.') and id ~<~ ('workspace.rest' || '/'))) OR ((id ~>=~ ('workspace.async' || '.') and id ~<~ ('workspace.async' || '/'))))`, string(sql))
}
