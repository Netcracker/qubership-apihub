package service

import (
	"context"
	"net/http"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

const (
	listPackageId = "QS.DASH"
	listVersion   = "2026.1"
	listRevision  = 2
)

type versionsListRepoStub struct {
	repository.PublishedRepository
	kind            string
	previousVersion string
	errorSummary    entity.VersionErrorSummaryEntity
	summaryQueried  bool
}

func (s *versionsListRepoStub) GetPackage(context.Context, string) (*entity.PackageEntity, error) {
	return &entity.PackageEntity{Id: listPackageId, Kind: s.kind}, nil
}

func (s *versionsListRepoStub) GetReadonlyPackageVersionsWithLimit(context.Context, entity.PublishedVersionSearchQueryEntity, bool, bool) ([]entity.PackageVersionRevisionEntity, error) {
	return []entity.PackageVersionRevisionEntity{{
		PublishedVersionEntity: entity.PublishedVersionEntity{
			PackageId:       listPackageId,
			Version:         listVersion,
			Revision:        listRevision,
			Status:          string(view.Draft),
			PreviousVersion: s.previousVersion,
		},
	}}, nil
}

func (s *versionsListRepoStub) GetVersionsErrorSummary(_ context.Context, versionKeys []entity.PublishedVersionKeyEntity, _ bool) (map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity, error) {
	s.summaryQueried = true
	result := make(map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity, len(versionKeys))
	for _, key := range versionKeys {
		result[key] = s.errorSummary
	}
	return result, nil
}

// The versions list reports the same two flags as the version content endpoint, and reports them
// separately. A referenced version's own unreliable changelog makes the reference unsound, so it moves the
// dashboard's hasErrors and nothing else.
func TestGetPackageVersionsViewSplitsErrorFlags(t *testing.T) {
	tests := []struct {
		name              string
		kind              string
		errorSummary      entity.VersionErrorSummaryEntity
		expectedContent   bool
		expectedChangelog bool
	}{
		{
			name:         "version without errors",
			kind:         entity.KIND_PACKAGE,
			errorSummary: entity.VersionErrorSummaryEntity{},
		},
		{
			name:            "the version's own documents failed",
			kind:            entity.KIND_PACKAGE,
			errorSummary:    entity.VersionErrorSummaryEntity{HasErrors: true},
			expectedContent: true,
		},
		{
			// A package version, not a dashboard: the changelog flag is reported for every kind.
			name:              "the version's own changelog failed",
			kind:              entity.KIND_PACKAGE,
			errorSummary:      entity.VersionErrorSummaryEntity{ChangelogHasErrors: true},
			expectedChangelog: true,
		},
		{
			name:            "a referenced version has errored documents",
			kind:            entity.KIND_DASHBOARD,
			errorSummary:    entity.VersionErrorSummaryEntity{ReferencedVersionHasErrors: true},
			expectedContent: true,
		},
		{
			name:              "a reference comparison of this changelog failed",
			kind:              entity.KIND_DASHBOARD,
			errorSummary:      entity.VersionErrorSummaryEntity{ComparisonRefsHaveErrors: true},
			expectedChangelog: true,
		},
		{
			name:            "a referenced version's own changelog is unreliable",
			kind:            entity.KIND_DASHBOARD,
			errorSummary:    entity.VersionErrorSummaryEntity{ReferencedVersionChangelogHasErrors: true},
			expectedContent: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &versionsListRepoStub{kind: tt.kind, previousVersion: "2025.4", errorSummary: tt.errorSummary}
			service := versionServiceImpl{publishedRepo: repo}

			versions, err := service.GetPackageVersionsView(context.Background(), view.VersionListReq{
				PackageId: listPackageId,
				SortBy:    view.VersionSortByVersion,
				SortOrder: view.VersionSortOrderAsc,
			}, false)
			if err != nil {
				t.Fatalf("expected the versions to be listed, got %v", err)
			}
			if len(versions.Versions) != 1 {
				t.Fatalf("listed %d versions, want 1", len(versions.Versions))
			}
			if versions.Versions[0].HasErrors != tt.expectedContent {
				t.Errorf("hasErrors = %v, want %v", versions.Versions[0].HasErrors, tt.expectedContent)
			}
			if versions.Versions[0].ChangelogHasErrors == nil {
				t.Fatal("expected changelogHasErrors to be reported for a version that declares a previous version")
			}
			if *versions.Versions[0].ChangelogHasErrors != tt.expectedChangelog {
				t.Errorf("changelogHasErrors = %v, want %v", *versions.Versions[0].ChangelogHasErrors, tt.expectedChangelog)
			}
		})
	}
}

// "no previous version" and "the changelog is sound" are different statements, so a version with no
// baseline reports no changelog flag at all rather than a misleading false.
func TestGetPackageVersionsViewOmitsChangelogFlagWithoutABaseline(t *testing.T) {
	repo := &versionsListRepoStub{kind: entity.KIND_PACKAGE}
	service := versionServiceImpl{publishedRepo: repo}

	versions, err := service.GetPackageVersionsView(context.Background(), view.VersionListReq{
		PackageId: listPackageId,
		SortBy:    view.VersionSortByVersion,
		SortOrder: view.VersionSortOrderAsc,
	}, false)
	if err != nil {
		t.Fatalf("expected the versions to be listed, got %v", err)
	}
	if versions.Versions[0].ChangelogHasErrors != nil {
		t.Fatalf("expected no changelog flag, got %v", *versions.Versions[0].ChangelogHasErrors)
	}
}

// A package owns no references, but its own changelog can still be unreliable, so the flags are calculated
// for every kind rather than for dashboards only.
func TestGetPackageVersionsViewQueriesTheSummaryForPackagesToo(t *testing.T) {
	repo := &versionsListRepoStub{kind: entity.KIND_PACKAGE}
	service := versionServiceImpl{publishedRepo: repo}

	if _, err := service.GetPackageVersionsView(context.Background(), view.VersionListReq{
		PackageId: listPackageId,
		SortBy:    view.VersionSortByVersion,
		SortOrder: view.VersionSortOrderAsc,
	}, false); err != nil {
		t.Fatalf("expected the versions to be listed, got %v", err)
	}
	if !repo.summaryQueried {
		t.Fatal("expected the error summary to be queried for a package as well as for a dashboard")
	}
}

const (
	revisionsPreviousVersion      = "2025.4"
	revisionsLatestBuilderVersion = "2.1.0"
	revisionsFirstBuilderVersion  = "2.0.0"
)

func revisionMetadata(builderVersion string) entity.Metadata {
	metadata := entity.Metadata{}
	metadata.SetBuilderVersion(builderVersion)
	return metadata
}

type revisionsListRepoStub struct {
	repository.PublishedRepository
	summaries      map[int]entity.VersionErrorSummaryEntity
	queriedKeys    []entity.PublishedVersionKeyEntity
	summaryQueries int
}

func (s *revisionsListRepoStub) GetVersion(context.Context, string, string) (*entity.PublishedVersionEntity, error) {
	return &entity.PublishedVersionEntity{PackageId: listPackageId, Version: listVersion, Revision: listRevision}, nil
}

// Revision 1 was published against a baseline, revision 2 without one.
func (s *revisionsListRepoStub) GetVersionRevisionsList(context.Context, entity.PackageVersionSearchQueryEntity) ([]entity.PackageVersionRevisionEntity, error) {
	return []entity.PackageVersionRevisionEntity{
		{PublishedVersionEntity: entity.PublishedVersionEntity{PackageId: listPackageId, Version: listVersion, Revision: 2, Metadata: revisionMetadata(revisionsLatestBuilderVersion)}},
		{PublishedVersionEntity: entity.PublishedVersionEntity{PackageId: listPackageId, Version: listVersion, Revision: 1, PreviousVersion: revisionsPreviousVersion, Metadata: revisionMetadata(revisionsFirstBuilderVersion)}},
	}, nil
}

func (s *revisionsListRepoStub) GetVersionsErrorSummary(_ context.Context, versionKeys []entity.PublishedVersionKeyEntity, _ bool) (map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity, error) {
	s.summaryQueries++
	s.queriedKeys = versionKeys
	result := make(map[entity.PublishedVersionKeyEntity]entity.VersionErrorSummaryEntity, len(versionKeys))
	for _, key := range versionKeys {
		result[key] = s.summaries[key.Revision]
	}
	return result, nil
}

// Every revision reports its own flags: a revision published with errors stays marked after a later revision
// fixed them, and the changelog flag appears only on revisions that had a baseline to compare against.
func TestGetVersionRevisionsListReportsFlagsPerRevision(t *testing.T) {
	repo := &revisionsListRepoStub{summaries: map[int]entity.VersionErrorSummaryEntity{
		1: {HasErrors: true, ChangelogHasErrors: true},
		2: {},
	}}
	service := versionServiceImpl{publishedRepo: repo}

	revisions, err := service.GetVersionRevisionsList(context.Background(), listPackageId, listVersion, view.PagingFilterReq{})
	if err != nil {
		t.Fatalf("expected the revisions to be listed, got %v", err)
	}
	if repo.summaryQueries != 1 || len(repo.queriedKeys) != 2 {
		t.Fatalf("expected one summary query for both revisions, got %d queries for %d keys", repo.summaryQueries, len(repo.queriedKeys))
	}

	latest, first := revisions.Revisions[0], revisions.Revisions[1]
	if latest.Revision != 2 || first.Revision != 1 {
		t.Fatalf("expected revisions 2 and 1 in order, got %d and %d", latest.Revision, first.Revision)
	}
	if latest.HasErrors {
		t.Error("expected the fixed revision to report no errors")
	}
	if latest.ChangelogHasErrors != nil {
		t.Errorf("expected no changelog flag without a baseline, got %v", *latest.ChangelogHasErrors)
	}
	if !first.HasErrors {
		t.Error("expected the errored revision to stay marked")
	}
	if first.ChangelogHasErrors == nil || !*first.ChangelogHasErrors {
		t.Error("expected the errored revision to report its changelog flag")
	}
	if latest.ApiProcessorVersion != revisionsLatestBuilderVersion || first.ApiProcessorVersion != revisionsFirstBuilderVersion {
		t.Errorf("expected each revision to report its own api-processor version, got %q and %q", latest.ApiProcessorVersion, first.ApiProcessorVersion)
	}
}

const (
	copySourcePackageId = "QS.SRC"
	copySourceVersion   = "2026.2"
	copySourceRevision  = 1
	copyRefPackageId    = "QS.REF"
	copyRefVersion      = "2026.1"
)

type copyVersionRepoStub struct {
	repository.PublishedRepository
	kind             string
	sourceSummary    entity.VersionErrorSummaryEntity
	refs             []entity.PublishedReferenceEntity
	refSummaries     map[string]entity.VersionErrorSummaryEntity
	summaryQueriedAt []string
}

func (s *copyVersionRepoStub) GetVersion(_ context.Context, packageId string, _ string) (*entity.PublishedVersionEntity, error) {
	return &entity.PublishedVersionEntity{PackageId: packageId, Version: copySourceVersion, Revision: copySourceRevision, Status: string(view.Draft)}, nil
}

func (s *copyVersionRepoStub) GetPackage(_ context.Context, packageId string) (*entity.PackageEntity, error) {
	return &entity.PackageEntity{Id: packageId, Kind: s.kind}, nil
}

func (s *copyVersionRepoStub) GetVersionRefsV3(context.Context, string, string, int) ([]entity.PublishedReferenceEntity, error) {
	return s.refs, nil
}

func (s *copyVersionRepoStub) GetVersionErrorSummary(_ context.Context, packageId string, _ string, _ int, _ bool) (*entity.VersionErrorSummaryEntity, error) {
	s.summaryQueriedAt = append(s.summaryQueriedAt, packageId)
	if packageId == copySourcePackageId {
		summary := s.sourceSummary
		return &summary, nil
	}
	summary := s.refSummaries[packageId]
	return &summary, nil
}

func copySourceVersionEntity() *entity.PublishedVersionEntity {
	return &entity.PublishedVersionEntity{PackageId: copySourcePackageId, Version: copySourceVersion, Revision: copySourceRevision}
}

func assertCopyRefused(t *testing.T, err error, wantMessage string, wantParams map[string]interface{}) {
	t.Helper()
	customErr, ok := err.(*exception.CustomError)
	if !ok {
		t.Fatalf("expected a CustomError, got %v", err)
	}
	if customErr.Status != http.StatusBadRequest || customErr.Code != exception.VersionHasErrors {
		t.Errorf("got status %d code %s, want %d %s", customErr.Status, customErr.Code, http.StatusBadRequest, exception.VersionHasErrors)
	}
	if customErr.Message != wantMessage {
		t.Errorf("message = %q, want %q", customErr.Message, wantMessage)
	}
	for key, want := range wantParams {
		if customErr.Params[key] != want {
			t.Errorf("param %s = %v, want %v", key, customErr.Params[key], want)
		}
	}
}

// A copy is a rebuild of the source version, so an errored source would be refused as a release at publish time
// anyway. Refusing it up front returns the reason on the copy request instead of in the publish status.
func TestCopyVersionRefusesAnErroredSourceAsRelease(t *testing.T) {
	repo := &copyVersionRepoStub{kind: entity.KIND_PACKAGE, sourceSummary: entity.VersionErrorSummaryEntity{HasErrors: true}}
	// publishedService and buildService stay nil: the refusal must happen before the build config is loaded.
	service := versionServiceImpl{publishedRepo: repo}

	_, err := service.CopyVersion(context.Background(), copySourcePackageId, copySourceVersion, view.CopyVersionReq{
		TargetPackageId: "QS.TARGET",
		TargetVersion:   "2026.3",
		TargetStatus:    string(view.Release),
	})

	assertCopyRefused(t, err, exception.VersionCopyWithErrorsMsg, map[string]interface{}{
		"packageId": copySourcePackageId,
		"version":   copySourceVersion,
	})
}

func TestCheckSourceVersionCanBeCopiedForPackages(t *testing.T) {
	tests := []struct {
		name          string
		sourceSummary entity.VersionErrorSummaryEntity
		targetStatus  string
		wantRefusal   bool
		wantQueried   bool
	}{
		{
			name:         "sound version copied as release",
			targetStatus: string(view.Release),
			wantQueried:  true,
		},
		{
			name:          "errored version copied as release",
			sourceSummary: entity.VersionErrorSummaryEntity{HasErrors: true},
			targetStatus:  string(view.Release),
			wantRefusal:   true,
			wantQueried:   true,
		},
		{
			// A draft copy is the troubleshooting path the feature exists for.
			name:          "errored version copied as draft",
			sourceSummary: entity.VersionErrorSummaryEntity{HasErrors: true},
			targetStatus:  string(view.Draft),
		},
		{
			// The changelog is recalculated against the previous version named in the copy request, so an
			// unreliable changelog of the source does not block the copy.
			name:          "version with an unreliable changelog copied as release",
			sourceSummary: entity.VersionErrorSummaryEntity{ChangelogHasErrors: true},
			targetStatus:  string(view.Release),
			wantQueried:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &copyVersionRepoStub{kind: entity.KIND_PACKAGE, sourceSummary: tt.sourceSummary}
			service := versionServiceImpl{publishedRepo: repo}

			err := service.checkSourceVersionCanBeCopied(context.Background(), copySourceVersionEntity(), entity.KIND_PACKAGE, tt.targetStatus)

			if tt.wantRefusal {
				assertCopyRefused(t, err, exception.VersionCopyWithErrorsMsg, map[string]interface{}{
					"packageId": copySourcePackageId,
					"version":   copySourceVersion,
				})
			} else if err != nil {
				t.Fatalf("expected the copy to be allowed, got %v", err)
			}
			if queried := len(repo.summaryQueriedAt) > 0; queried != tt.wantQueried {
				t.Errorf("error summary queried = %v, want %v", queried, tt.wantQueried)
			}
		})
	}
}

// A release dashboard that references an unsound version is refused at publish time, so a release copy is refused
// the same way, naming the reference rather than the dashboard. A draft copy is allowed.
func TestCheckSourceVersionCanBeCopiedForDashboards(t *testing.T) {
	erroredRef := entity.PublishedReferenceEntity{RefPackageId: copyRefPackageId, RefVersion: copyRefVersion, RefRevision: 1}
	excludedErroredRef := erroredRef
	excludedErroredRef.Excluded = true

	tests := []struct {
		name         string
		refs         []entity.PublishedReferenceEntity
		refSummaries map[string]entity.VersionErrorSummaryEntity
		targetStatus string
		wantRefusal  bool
	}{
		{
			name:         "sound reference copied as release",
			refs:         []entity.PublishedReferenceEntity{erroredRef},
			targetStatus: string(view.Release),
		},
		{
			name:         "reference with errored documents copied as draft",
			refs:         []entity.PublishedReferenceEntity{erroredRef},
			refSummaries: map[string]entity.VersionErrorSummaryEntity{copyRefPackageId: {HasErrors: true}},
			targetStatus: string(view.Draft),
		},
		{
			name:         "reference with errored documents copied as release",
			refs:         []entity.PublishedReferenceEntity{erroredRef},
			refSummaries: map[string]entity.VersionErrorSummaryEntity{copyRefPackageId: {HasErrors: true}},
			targetStatus: string(view.Release),
			wantRefusal:  true,
		},
		{
			name:         "reference with an unreliable changelog copied as release",
			refs:         []entity.PublishedReferenceEntity{erroredRef},
			refSummaries: map[string]entity.VersionErrorSummaryEntity{copyRefPackageId: {ChangelogHasErrors: true}},
			targetStatus: string(view.Release),
			wantRefusal:  true,
		},
		{
			name:         "excluded errored reference copied as release",
			refs:         []entity.PublishedReferenceEntity{excludedErroredRef},
			refSummaries: map[string]entity.VersionErrorSummaryEntity{copyRefPackageId: {HasErrors: true}},
			targetStatus: string(view.Release),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &copyVersionRepoStub{kind: entity.KIND_DASHBOARD, refs: tt.refs, refSummaries: tt.refSummaries}
			service := versionServiceImpl{publishedRepo: repo}

			err := service.checkSourceVersionCanBeCopied(context.Background(), copySourceVersionEntity(), entity.KIND_DASHBOARD, tt.targetStatus)

			if tt.wantRefusal {
				assertCopyRefused(t, err, exception.ReferencedVersionHasErrorsMsg, map[string]interface{}{
					"packageId": copyRefPackageId,
					"version":   copyRefVersion,
				})
			} else if err != nil {
				t.Fatalf("expected the copy to be allowed, got %v", err)
			}
		})
	}
}
