package service

import (
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

func pv(version string, revision int, previousVersion string) entity.PackageVersionRevisionEntity {
	return entity.PackageVersionRevisionEntity{
		PublishedVersionEntity: entity.PublishedVersionEntity{
			Version:         version,
			Revision:        revision,
			PreviousVersion: previousVersion,
		},
	}
}

// Core logic of CheckPreviousVersionDependencyCycle is tested via detectPreviousVersionDependencyCycleWithCurrVersion
// (same package) to avoid a full PublishedRepository stub.
func TestCheckPreviousVersionDependencyCycle_graph(t *testing.T) {
	tests := []struct {
		name        string
		nodes       []entity.PackageVersionRevisionEntity
		version     string
		prevVersion string
		revision    int
		wantCycle   bool
	}{
		{
			name:        "linear chain, no cycle",
			nodes:       []entity.PackageVersionRevisionEntity{pv("0.9", 1, ""), pv("1.0", 1, "0.9")},
			version:     "2.0",
			prevVersion: "1.0",
			revision:    1,
			wantCycle:   false,
		},
		{
			name:        "empty history, first publish only simulated",
			nodes:       nil,
			version:     "1.0",
			prevVersion: "0.9",
			revision:    1,
			wantCycle:   false,
		},
		{
			name: "two revisions linked to the same previous version",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1.0", 1, ""),
				pv("2.0", 1, "1.0"),
				pv("2.0", 2, "1.0"),
			},
			version:     "3.0",
			prevVersion: "2.0",
			revision:    1,
			wantCycle:   false,
		},
		{
			name: "additional revision of a new version published",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("0.9", 1, ""),
				pv("1.0", 1, "0.9"),
			},
			version:     "1.0",
			prevVersion: "0.9",
			revision:    2,
			wantCycle:   false,
		},
		{
			name: "old version publication that introduces cycle",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("2", 1, "1"),
				pv("3", 1, "2"),
			},
			version:     "2",
			prevVersion: "3",
			revision:    2,
			wantCycle:   true,
		},
		{
			name: "new correct publication with cycle in history",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("2", 1, ""),
				pv("2", 2, "3"),
				pv("2", 3, "1"),
				pv("3", 1, "2"),
			},
			version:     "2",
			prevVersion: "1",
			revision:    4,
			wantCycle:   false,
		},
		{
			name: "new correct publication with cycle in history 2",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("2", 1, ""),
				pv("2", 2, "3"),
				pv("3", 1, "2"),
			},
			version:     "2",
			prevVersion: "1",
			revision:    4,
			wantCycle:   false,
		},
		{
			name: "new correct publication with cycle in history - latest revisions only",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("2", 3, "1"),
				pv("3", 1, "2"),
			},
			version:     "2",
			prevVersion: "1",
			revision:    4,
			wantCycle:   false,
		},
		{
			name: "new incorrect publication",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("2", 3, "1"),
				pv("3", 1, "2"),
			},
			version:     "1",
			prevVersion: "3",
			revision:    2,
			wantCycle:   true,
		},
		{
			name: "new incorrect publication 2",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("2", 1, "1"),
				pv("3", 1, "2"),
			},
			version:     "2",
			prevVersion: "3",
			revision:    2,
			wantCycle:   true,
		},
		{
			name: "new incorrect publication 3",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("2", 1, "1"),
				pv("3", 1, "2"),
				pv("2", 2, "3"),
			},
			version:     "1",
			prevVersion: "3",
			revision:    2,
			wantCycle:   false,
		},
		{
			name: "longer revisions chain",
			nodes: []entity.PackageVersionRevisionEntity{
				pv("1", 1, ""),
				pv("1", 2, ""),
				pv("2", 1, "1"),
				pv("2", 2, "1"),
				pv("3", 1, "2"),
			},
			version:     "2",
			prevVersion: "1",
			revision:    3,
			wantCycle:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := detectPreviousVersionDependencyCycleWithCurrVersion(tt.nodes, tt.version, tt.prevVersion, tt.revision)
			if got != tt.wantCycle {
				t.Fatalf("detectPreviousVersionDependencyCycleWithCurrVersion(...) = %v, want %v for %s", got, tt.wantCycle, tt.name)
			}
		})
	}
}

func TestMergeVersionComparisons(t *testing.T) {
	mainId := view.MakeVersionComparisonId("d", "v2", 1, "d", "v1", 1)
	sharedId := view.MakeVersionComparisonId("p1", "v2", 1, "p1", "v1", 1)
	opOnlyId := view.MakeVersionComparisonId("p2", "v2", 1, "p2", "v1", 1)
	ddlOnlyId := view.MakeVersionComparisonId("p3", "v2", 1, "p3", "v1", 1)

	operationComparisons := []*entity.VersionComparisonEntity{
		{ComparisonId: mainId, OperationTypes: []view.OperationType{{ApiType: "rest"}}, Refs: []string{sharedId, opOnlyId}},
		{ComparisonId: sharedId, OperationTypes: []view.OperationType{{ApiType: "rest"}}},
		{ComparisonId: opOnlyId, OperationTypes: []view.OperationType{{ApiType: "rest"}}},
	}
	ddlComparisons := []*entity.VersionComparisonEntity{
		{ComparisonId: mainId, Refs: []string{sharedId, ddlOnlyId}},
		{ComparisonId: sharedId, ContractTypes: []view.ContractType{{ContractType: view.ContractTypeDdl}}},
		{ComparisonId: ddlOnlyId, ContractTypes: []view.ContractType{{ContractType: view.ContractTypeDdl}}},
	}

	merged := mergeVersionComparisons(operationComparisons, ddlComparisons)

	byId := make(map[string]*entity.VersionComparisonEntity, len(merged))
	for _, comparison := range merged {
		byId[comparison.ComparisonId] = comparison
	}
	if len(merged) != 4 {
		t.Fatalf("merged %d comparisons, want 4", len(merged))
	}
	if byId[sharedId].ContractTypes == nil {
		t.Errorf("shared comparison must carry the rebuilt DDL contract types")
	}
	if byId[opOnlyId].ContractTypes != nil {
		t.Errorf("operation-only comparison must not gain contract types from the merge; the DB layer is responsible for preserving the stored value")
	}
	if byId[ddlOnlyId].OperationTypes != nil {
		t.Errorf("ddl-only comparison must not gain operation types from the merge; the DB layer is responsible for preserving the stored value")
	}
	if byId[mainId].ContractTypes != nil {
		t.Errorf("main comparison has no DDL data, contract types must stay empty")
	}
	// The dashboard's main comparison references one package with only operation changes (opOnlyId)
	// and another with only DDL changes (ddlOnlyId); each reader only records refs for the
	// comparisons it produced, so the merge must union them or the DDL-only ref is dropped.
	wantRefs := map[string]bool{sharedId: true, opOnlyId: true, ddlOnlyId: true}
	if len(byId[mainId].Refs) != len(wantRefs) {
		t.Fatalf("main comparison refs = %v, want union of %v", byId[mainId].Refs, wantRefs)
	}
	for _, ref := range byId[mainId].Refs {
		if !wantRefs[ref] {
			t.Errorf("main comparison refs contains unexpected ref %s", ref)
		}
	}
}
