package service

import (
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
	"github.com/stretchr/testify/require"
)

func ddlChange(action, description, severity string) interface{} {
	raw := map[string]interface{}{"description": description, "severity": severity}
	if action != "" {
		raw["action"] = action
	}
	return view.ParseSingleOperationChange(raw)
}

// cell reads a cell by zero-based column index. GetRows drops trailing empty cells, so a blank cell
// at the end of a row is absent rather than empty.
func cell(row []string, index int) string {
	if index >= len(row) {
		return ""
	}
	return row[index]
}

func TestBuildDdlChangesWorkbookRendersOneRowPerChange(t *testing.T) {
	//ExcelTemplatePath is resolved relative to the working directory, which is the module root at runtime
	t.Chdir("..")

	customersRef := view.MakePackageRefKey("pkg", "2026.2", 1)
	changedEntities := &view.DdlChangedEntitiesView{
		PreviousVersion: "2026.1",
		Entities: []interface{}{
			view.DdlChangedEntityView{
				ChangeSummary: view.ChangeSummary{Breaking: 1, SemiBreaking: 1, NonBreaking: 1},
				DdlEntityData: &view.DdlEntityData{
					DdlEntityId: "t-customers", Kind: "table", Name: "customers",
					SchemaName: "shop", PackageRef: customersRef,
				},
				Changes: []interface{}{
					ddlChange("add", "Column added", "breaking"),
					ddlChange("replace", "Column type widened", "semi-breaking"),
					ddlChange("", "Comment updated", "non-breaking"),
				},
			},
			//non-zero summary but no individual changes: must still produce exactly one row
			view.DdlChangedEntityView{
				ChangeSummary: view.ChangeSummary{Annotation: 1},
				DdlEntityData: &view.DdlEntityData{
					DdlEntityId: "t-audit", Kind: "table", Name: "audit_events", SchemaName: "shop",
				},
			},
			//removed table: no current side, so the group cell stays blank
			view.DdlChangedEntityView{
				ChangeSummary: view.ChangeSummary{Unclassified: 1},
				PreviousDdlEntityData: &view.DdlEntityData{
					DdlEntityId: "t-legacy", Kind: "table", Name: "legacy_basket", SchemaName: "shop",
				},
				Changes: []interface{}{ddlChange("remove", "Table removed", "unclassified")},
			},
		},
	}
	groupNames := map[string][]string{
		entity.MakeDdlEntityGroupKey(customersRef, "t-customers"): {"analytics", "billing"},
	}

	workbook, err := buildDdlChangesWorkbook(changedEntities, groupNames, "pkg-id", "pkg", "2026.2", "release")
	require.NoError(t, err)
	defer workbook.Close()

	rows, err := workbook.GetRows(view.DdlSheetName)
	require.NoError(t, err)
	//header + 3 change rows + 1 fallback row + 1 removed-table row
	require.Len(t, rows, 6)

	header := rows[0]
	//the existing columns must not move; the per-severity count columns are gone entirely -- that
	//aggregate view now lives on the Summary sheet, not repeated on every detail row
	require.Equal(t, view.KindColumnNameContract, header[4])
	require.Equal(t, view.GroupColumnName, header[5])
	require.Equal(t, view.ChangeDescriptionColumnName, header[6])
	require.Equal(t, view.ChangeSeverityColumnName, header[7])
	require.Equal(t, view.ChangeActionColumnName, header[8])

	//each of the entity's three changes gets its own row, with the entity columns repeated
	for _, row := range rows[1:4] {
		require.Equal(t, "2026.2", row[0])
		require.Equal(t, "2026.1", row[1])
		require.Equal(t, "shop", row[2])
		require.Equal(t, "customers", row[3])
		require.Equal(t, "analytics, billing", row[5])
	}

	require.Equal(t, []string{"Column added", "breaking", "add"}, rows[1][6:9])
	//semi-breaking is rendered with the report wording, as the REST changes export does
	require.Equal(t, []string{"Column type widened", "requires attention", "replace"}, rows[2][6:9])
	//a change with no action still carries its description and severity
	require.Equal(t, "Comment updated", cell(rows[3], 6))
	require.Equal(t, "non-breaking", cell(rows[3], 7))
	require.Empty(t, cell(rows[3], 8))

	//the entity with no individual changes survives as a single row with blank change cells
	require.Equal(t, "audit_events", cell(rows[4], 3))
	require.Empty(t, cell(rows[4], 6))
	require.Empty(t, cell(rows[4], 7))
	require.Empty(t, cell(rows[4], 8))

	//a previous-version-only entity is reported, and its group cell stays blank
	require.Equal(t, "legacy_basket", cell(rows[5], 3))
	require.Empty(t, cell(rows[5], 5))
	require.Equal(t, []string{"Table removed", "unclassified", "remove"}, rows[5][6:9])
}

func TestBuildDdlChangesWorkbookSummarySheet(t *testing.T) {
	t.Chdir("..")

	// Three entities that would each have landed in a different bucket under the old
	// per-package-ref design (two different current-side refs, one previous-side-only ref).
	// The Summary sheet now has a single data column regardless, so all three must be aggregated
	// into it rather than split across columns.
	pkgARefCurrent := view.MakePackageRefKey("pkg-a", "2026.2", 1)
	pkgBRefCurrent := view.MakePackageRefKey("pkg-b", "2026.2", 1)
	pkgCRefPrevious := view.MakePackageRefKey("pkg-c", "2026.1", 1)

	changedEntities := &view.DdlChangedEntitiesView{
		PreviousVersion: "2026.1@1",
		Entities: []interface{}{
			view.DdlChangedEntityView{
				ChangeSummary: view.ChangeSummary{Breaking: 1},
				DdlEntityData: &view.DdlEntityData{
					DdlEntityId: "t-a", Kind: "table", Name: "table_a", SchemaName: "shop",
					PackageRef: pkgARefCurrent,
				},
			},
			view.DdlChangedEntityView{
				ChangeSummary: view.ChangeSummary{SemiBreaking: 1, NonBreaking: 1},
				DdlEntityData: &view.DdlEntityData{
					DdlEntityId: "t-b", Kind: "table", Name: "table_b", SchemaName: "shop",
					PackageRef: pkgBRefCurrent,
				},
			},
			view.DdlChangedEntityView{
				ChangeSummary: view.ChangeSummary{Unclassified: 1},
				PreviousDdlEntityData: &view.DdlEntityData{
					DdlEntityId: "t-c", Kind: "table", Name: "table_c", SchemaName: "shop",
					PackageRef: pkgCRefPrevious,
				},
			},
		},
		Packages: map[string]view.PackageVersionRef{
			pkgARefCurrent: {RefPackageId: "pkg-a", RefPackageName: "Package A", ServiceName: "svc-a", RefPackageVersion: "2026.2"},
			pkgBRefCurrent: {RefPackageId: "pkg-b", RefPackageName: "Package B", ServiceName: "svc-b", RefPackageVersion: "2026.2"},
		},
	}

	workbook, err := buildDdlChangesWorkbook(changedEntities, nil, "the-package-id", "The Package Name", "2026.2", "release")
	require.NoError(t, err)
	defer workbook.Close()

	rows, err := workbook.GetRows(view.SummarySheetName)
	require.NoError(t, err)

	//exactly one data column: every row has at most a label (A) and one value (B)
	for i, row := range rows {
		require.LessOrEqualf(t, len(row), 2, "row %d has more than one data column: %v", i, row)
	}

	require.Equal(t, view.SummarySheetName, cell(rows[0], 0))
	require.Equal(t, "Number of entities with breaking changes", cell(rows[7], 0))
	require.Equal(t, "Number of entities with unclassified changes", cell(rows[12], 0))

	//Package ID/Name/Version come from the function's own parameters -- with a single column there
	//is no longer a "which bucket" to derive them from
	require.Equal(t, "the-package-id", cell(rows[1], 1))
	require.Equal(t, "The Package Name", cell(rows[2], 1))
	require.Equal(t, "svc-a", cell(rows[3], 1)) //looked up via the first entity that exists in the current version
	require.Equal(t, "2026.2", cell(rows[4], 1))
	//raw, matching the DDL sheet's own Previous Version column, not re-derived per bucket
	require.Equal(t, "2026.1@1", cell(rows[5], 1))
	require.Equal(t, view.ContractTypeDdl, cell(rows[6], 1))

	//counts are summed across every entity regardless of which package it belongs to
	require.Equal(t, "1", cell(rows[7], 1))  //breaking: table_a
	require.Equal(t, "1", cell(rows[8], 1))  //requires attention: table_b
	require.Equal(t, "1", cell(rows[9], 1))  //non-breaking: table_b
	require.Equal(t, "0", cell(rows[10], 1)) //deprecated: none, written as 0 not blank
	require.Equal(t, "0", cell(rows[11], 1)) //annotation: none
	require.Equal(t, "1", cell(rows[12], 1)) //unclassified: table_c

	//the DDL detail sheet is unaffected: still one row per entity (no individual Changes set)
	ddlRows, err := workbook.GetRows(view.DdlSheetName)
	require.NoError(t, err)
	require.Len(t, ddlRows, 4)
}

func TestBuildDdlChangesWorkbookSummarySheetServiceNameFallsBackToPreviousSide(t *testing.T) {
	t.Chdir("..")

	// Every entity removed: none has a DdlEntityData, so the Service Name lookup has no
	// current-side package ref to use anywhere and must fall back to a previous-side one.
	pkgRefPrevious := view.MakePackageRefKey("pkg", "2026.1", 1)
	changedEntities := &view.DdlChangedEntitiesView{
		PreviousVersion: "2026.1@1",
		Entities: []interface{}{
			view.DdlChangedEntityView{
				ChangeSummary: view.ChangeSummary{Unclassified: 1},
				PreviousDdlEntityData: &view.DdlEntityData{
					DdlEntityId: "t-gone", Kind: "table", Name: "gone_table", SchemaName: "shop",
					PackageRef: pkgRefPrevious,
				},
			},
		},
		Packages: map[string]view.PackageVersionRef{
			pkgRefPrevious: {RefPackageId: "pkg", RefPackageName: "Pkg", ServiceName: "svc-previous", RefPackageVersion: "2026.1"},
		},
	}

	workbook, err := buildDdlChangesWorkbook(changedEntities, nil, "pkg", "Pkg", "2026.2", "release")
	require.NoError(t, err)
	defer workbook.Close()

	rows, err := workbook.GetRows(view.SummarySheetName)
	require.NoError(t, err)
	require.Equal(t, "svc-previous", cell(rows[3], 1))
}
