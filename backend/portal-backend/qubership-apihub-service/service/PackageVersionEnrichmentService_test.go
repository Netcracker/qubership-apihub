package service

import (
	"context"
	"errors"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type enrichmentRepoStub struct {
	repository.PublishedRepository
	versions       map[string]*entity.PackageVersionRichEntity
	errorSummaries map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity
	summaryErr     error
	summaryCalls   [][]entity.PublishedVersionKeyEntity
}

func (s *enrichmentRepoStub) GetRichPackageVersion(_ context.Context, packageId string, version string) (*entity.PackageVersionRichEntity, error) {
	return s.versions[packageId+"|"+version], nil
}

func (s *enrichmentRepoStub) GetVersionsErrorSummary(_ context.Context, versionKeys []entity.PublishedVersionKeyEntity, _ bool) (map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity, error) {
	s.summaryCalls = append(s.summaryCalls, versionKeys)
	if s.summaryErr != nil {
		return nil, s.summaryErr
	}
	result := make(map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity, len(versionKeys))
	for _, key := range versionKeys {
		if summary, exists := s.errorSummaries[key]; exists {
			result[key] = summary
		}
	}
	return result, nil
}

const testApiProcessorVersion = "4.2.1"

func richVersion(packageId string, version string, revision int, previousVersion string) *entity.PackageVersionRichEntity {
	return &entity.PackageVersionRichEntity{
		PublishedVersionEntity: entity.PublishedVersionEntity{
			PackageId:       packageId,
			Version:         version,
			Revision:        revision,
			PreviousVersion: previousVersion,
			Status:          string(view.Draft),
			Metadata:        entity.Metadata{entity.BUILDER_VERSION_KEY: testApiProcessorVersion},
		},
		PackageName: packageId,
		Kind:        entity.KIND_PACKAGE,
	}
}

func versionKey(packageId string, version string, revision int) entity.PublishedVersionKeyEntity {
	return entity.PublishedVersionKeyEntity{PackageId: packageId, Version: version, Revision: revision}
}

// The referenced versions carry the same two flags as the versions list, derived the same way.
func TestGetPackageVersionRefsMapReportsErrorFlags(t *testing.T) {
	tests := []struct {
		name              string
		previousVersion   string
		errorSummary      entity.VersionErrorSummaryEntity
		expectedHasErrors bool
		expectedChangelog *bool
	}{
		{
			name: "sound version without a baseline",
		},
		{
			name:              "errored documents",
			errorSummary:      entity.VersionErrorSummaryEntity{HasErrors: true},
			expectedHasErrors: true,
		},
		{
			name:              "a referenced version's own changelog is unreliable",
			errorSummary:      entity.VersionErrorSummaryEntity{ReferencedVersionChangelogHasErrors: true},
			expectedHasErrors: true,
		},
		{
			name:              "unreliable changelog against a baseline",
			previousVersion:   "2025.4",
			errorSummary:      entity.VersionErrorSummaryEntity{ChangelogHasErrors: true},
			expectedChangelog: boolPtr(true),
		},
		{
			name:              "sound changelog against a baseline",
			previousVersion:   "2025.4",
			expectedChangelog: boolPtr(false),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &enrichmentRepoStub{
				versions:       map[string]*entity.PackageVersionRichEntity{"QS.SVC1|2026.1": richVersion("QS.SVC1", "2026.1", 2, tt.previousVersion)},
				errorSummaries: map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity{versionKey("QS.SVC1", "2026.1", 2): tt.errorSummary},
			}
			service := packageVersionEnrichmentServiceImpl{publishedRepo: repo}

			refs, err := service.GetPackageVersionRefsMap(context.Background(), map[string][]string{"QS.SVC1": {"2026.1"}})
			if err != nil {
				t.Fatalf("expected the references to be enriched, got %v", err)
			}
			ref, exists := refs["QS.SVC1@2026.1@2"]
			if !exists {
				t.Fatalf("expected the reference to be keyed by package, version and revision, got %v", refs)
			}
			if ref.ApiProcessorVersion != testApiProcessorVersion {
				t.Errorf("apiProcessorVersion = %q, want %q", ref.ApiProcessorVersion, testApiProcessorVersion)
			}
			if ref.HasErrors != tt.expectedHasErrors {
				t.Errorf("hasErrors = %v, want %v", ref.HasErrors, tt.expectedHasErrors)
			}
			if (ref.ChangelogHasErrors == nil) != (tt.expectedChangelog == nil) {
				t.Fatalf("changelogHasErrors = %v, want %v", ref.ChangelogHasErrors, tt.expectedChangelog)
			}
			if ref.ChangelogHasErrors != nil && *ref.ChangelogHasErrors != *tt.expectedChangelog {
				t.Errorf("changelogHasErrors = %v, want %v", *ref.ChangelogHasErrors, *tt.expectedChangelog)
			}
		})
	}
}

func TestGetPackageVersionRefsMapQueriesTheSummariesOnce(t *testing.T) {
	repo := &enrichmentRepoStub{
		versions: map[string]*entity.PackageVersionRichEntity{
			"QS.SVC1|2026.1": richVersion("QS.SVC1", "2026.1", 1, ""),
			"QS.SVC2|2026.2": richVersion("QS.SVC2", "2026.2", 3, ""),
		},
	}
	service := packageVersionEnrichmentServiceImpl{publishedRepo: repo}

	refs, err := service.GetPackageVersionRefsMap(context.Background(), map[string][]string{
		"QS.SVC1": {"2026.1", "2026.1"},
		"QS.SVC2": {"2026.2"},
		"QS.GONE": {"1.0"},
	})
	if err != nil {
		t.Fatalf("expected the references to be enriched, got %v", err)
	}
	if len(refs) != 2 {
		t.Fatalf("expected the missing version to be skipped, got %v", refs)
	}
	if len(repo.summaryCalls) != 1 || len(repo.summaryCalls[0]) != 2 {
		t.Fatalf("expected one summary query for the two existing versions, got %v", repo.summaryCalls)
	}
}

func TestGetPackageVersionRefsMapPropagatesSummaryFailure(t *testing.T) {
	summaryErr := errors.New("summary query failed")
	repo := &enrichmentRepoStub{
		versions:   map[string]*entity.PackageVersionRichEntity{"QS.SVC1|2026.1": richVersion("QS.SVC1", "2026.1", 1, "")},
		summaryErr: summaryErr,
	}
	service := packageVersionEnrichmentServiceImpl{publishedRepo: repo}

	_, err := service.GetPackageVersionRefsMap(context.Background(), map[string][]string{"QS.SVC1": {"2026.1"}})
	if !errors.Is(err, summaryErr) {
		t.Fatalf("expected the summary failure to be returned, got %v", err)
	}
}

func boolPtr(value bool) *bool {
	return &value
}
