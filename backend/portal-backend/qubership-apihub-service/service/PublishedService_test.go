package service

import (
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
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
