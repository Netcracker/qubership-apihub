package service

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
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
		t.Errorf("operation-only comparison must not gain contract types from the merge")
	}
	if byId[ddlOnlyId].OperationTypes != nil {
		t.Errorf("ddl-only comparison must not gain operation types from the merge")
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

// Only the DDL reader records errors found in DDL contracts. The merged row is the only one stored,
// so a changelog whose REST side is clean and whose DDL side has errors must still come out flagged.
func TestMergeVersionComparisonsUnionsHasErrors(t *testing.T) {
	sharedId := view.MakeVersionComparisonId("p1", "v2", 1, "p1", "v1", 1)
	ddlOnlyId := view.MakeVersionComparisonId("p2", "v2", 1, "p2", "v1", 1)

	errored := func(id string) *entity.VersionComparisonEntity {
		metadata := entity.Metadata{}
		metadata.SetHasErrors(true)
		return &entity.VersionComparisonEntity{ComparisonId: id, Metadata: metadata}
	}

	for _, tc := range []struct {
		name          string
		operationSide *entity.VersionComparisonEntity
		ddlSide       *entity.VersionComparisonEntity
		wantHasErrors bool
	}{
		{
			name:          "errors only on the ddl side",
			operationSide: &entity.VersionComparisonEntity{ComparisonId: sharedId, Metadata: entity.Metadata{}},
			ddlSide:       errored(sharedId),
			wantHasErrors: true,
		},
		{
			name:          "errors only on the operation side",
			operationSide: errored(sharedId),
			ddlSide:       &entity.VersionComparisonEntity{ComparisonId: sharedId, Metadata: entity.Metadata{}},
			wantHasErrors: true,
		},
		{
			name:          "errors on both sides",
			operationSide: errored(sharedId),
			ddlSide:       errored(sharedId),
			wantHasErrors: true,
		},
		{
			name:          "no errors on either side",
			operationSide: &entity.VersionComparisonEntity{ComparisonId: sharedId, Metadata: entity.Metadata{}},
			ddlSide:       &entity.VersionComparisonEntity{ComparisonId: sharedId, Metadata: entity.Metadata{}},
			wantHasErrors: false,
		},
		{
			// The readers always initialise the map, but a nil one must not panic the publish path.
			name:          "nil metadata on the operation side",
			operationSide: &entity.VersionComparisonEntity{ComparisonId: sharedId},
			ddlSide:       errored(sharedId),
			wantHasErrors: true,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			merged := mergeVersionComparisons(
				[]*entity.VersionComparisonEntity{tc.operationSide},
				[]*entity.VersionComparisonEntity{tc.ddlSide})
			if len(merged) != 1 {
				t.Fatalf("merged %d comparisons, want 1", len(merged))
			}
			if got := merged[0].Metadata.GetHasErrors(); got != tc.wantHasErrors {
				t.Errorf("merged has_errors = %v, want %v", got, tc.wantHasErrors)
			}
		})
	}

	t.Run("ddl-only comparison keeps its own errors", func(t *testing.T) {
		merged := mergeVersionComparisons(nil, []*entity.VersionComparisonEntity{errored(ddlOnlyId)})
		if len(merged) != 1 {
			t.Fatalf("merged %d comparisons, want 1", len(merged))
		}
		if !merged[0].Metadata.GetHasErrors() {
			t.Errorf("ddl-only comparison must keep the error flag it was read with")
		}
	})
}

type errorSummaryRepoStub struct {
	repository.PublishedRepository
	errorSummary     *entity.VersionErrorSummaryEntity
	queriedPackageId string
	queriedRevision  int
}

func (s *errorSummaryRepoStub) GetVersionErrorSummary(_ context.Context, packageId string, _ string, revision int, _ bool) (*entity.VersionErrorSummaryEntity, error) {
	s.queriedPackageId = packageId
	s.queriedRevision = revision
	return s.errorSummary, nil
}

func TestVersionHasAnyErrors(t *testing.T) {
	tests := []struct {
		name         string
		errorSummary *entity.VersionErrorSummaryEntity
		expected     bool
	}{
		{
			name:         "version without errors",
			errorSummary: &entity.VersionErrorSummaryEntity{},
			expected:     false,
		},
		{
			name:         "errors in the version's own documents",
			errorSummary: &entity.VersionErrorSummaryEntity{HasErrors: true},
			expected:     true,
		},
		{
			// The version's documents are fine, but the changes it publishes cannot be trusted.
			name:         "errors in the changelog the version declares",
			errorSummary: &entity.VersionErrorSummaryEntity{ChangelogHasErrors: true},
			expected:     true,
		},
		{
			// A dashboard owns no documents, so its own flags say nothing about its references.
			name:         "dashboard referencing a version with errored documents",
			errorSummary: &entity.VersionErrorSummaryEntity{ReferencedVersionHasErrors: true},
			expected:     true,
		},
		{
			// A draft dashboard may hold such a reference, so the fact reaches the dashboard's hasErrors flag
			// and blocks its promotion to release.
			name:         "dashboard referencing a version whose own changelog is unreliable",
			errorSummary: &entity.VersionErrorSummaryEntity{ReferencedVersionChangelogHasErrors: true},
			expected:     true,
		},
		{
			// Part of this dashboard's own changelog failed, so the changelog as a whole is unreliable.
			name:         "a reference comparison of the dashboard's changelog failed",
			errorSummary: &entity.VersionErrorSummaryEntity{ComparisonRefsHaveErrors: true},
			expected:     true,
		},
		{
			// Nothing to judge: an absent version cannot block anything, and the caller reports it missing.
			name:         "version does not exist",
			errorSummary: nil,
			expected:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &errorSummaryRepoStub{errorSummary: tt.errorSummary}
			hasErrors, err := VersionHasAnyErrors(context.Background(), repo, "QS.PKG", "2026.1", 3)
			if err != nil {
				t.Fatalf("expected the predicate to answer, but it failed: %v", err)
			}
			if hasErrors != tt.expected {
				t.Fatalf("expected hasErrors=%v, got %v", tt.expected, hasErrors)
			}
		})
	}
}

// The two public flags must stay apart: neither may report a fact that belongs to the other. An unsound
// reference, whichever of its flags is set, reaches the dashboard's hasErrors.
func TestVersionErrorSummaryFlagsAreSplit(t *testing.T) {
	tests := []struct {
		name                   string
		summary                entity.VersionErrorSummaryEntity
		expectedContent        bool
		expectedChangelog      bool
		expectedVersionUnsound bool
	}{
		{
			name:                   "the version's own documents failed",
			summary:                entity.VersionErrorSummaryEntity{HasErrors: true},
			expectedContent:        true,
			expectedVersionUnsound: true,
		},
		{
			name:                   "the version's own changelog failed",
			summary:                entity.VersionErrorSummaryEntity{ChangelogHasErrors: true},
			expectedChangelog:      true,
			expectedVersionUnsound: true,
		},
		{
			name:                   "a referenced version has errored documents",
			summary:                entity.VersionErrorSummaryEntity{ReferencedVersionHasErrors: true},
			expectedContent:        true,
			expectedVersionUnsound: true,
		},
		{
			name:                   "a reference comparison of this changelog failed",
			summary:                entity.VersionErrorSummaryEntity{ComparisonRefsHaveErrors: true},
			expectedChangelog:      true,
			expectedVersionUnsound: true,
		},
		{
			// The reference is unsound, so the dashboard's hasErrors reports it.
			name:                   "a referenced version's own changelog is unreliable",
			summary:                entity.VersionErrorSummaryEntity{ReferencedVersionChangelogHasErrors: true},
			expectedContent:        true,
			expectedVersionUnsound: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.summary.VersionHasErrors(); got != tt.expectedContent {
				t.Errorf("VersionHasErrors() = %v, want %v", got, tt.expectedContent)
			}
			if got := tt.summary.ChangelogHasAnyErrors(); got != tt.expectedChangelog {
				t.Errorf("ChangelogHasAnyErrors() = %v, want %v", got, tt.expectedChangelog)
			}
			if got := tt.summary.HasAnyErrors(); got != tt.expectedVersionUnsound {
				t.Errorf("HasAnyErrors() = %v, want %v", got, tt.expectedVersionUnsound)
			}
		})
	}
}

type failingErrorSummaryRepoStub struct {
	repository.PublishedRepository
}

var errErrorSummaryLookup = errors.New("version error summary lookup failed")

func (failingErrorSummaryRepoStub) GetVersionErrorSummary(context.Context, string, string, int, bool) (*entity.VersionErrorSummaryEntity, error) {
	return nil, errErrorSummaryLookup
}

// A failed lookup must not read as "no errors": the refusals would silently let a version with errors through.
func TestVersionHasAnyErrorsPropagatesLookupFailure(t *testing.T) {
	_, err := VersionHasAnyErrors(context.Background(), failingErrorSummaryRepoStub{}, "QS.PKG", "2026.1", 3)
	if !errors.Is(err, errErrorSummaryLookup) {
		t.Fatalf("expected the lookup failure to propagate, got %v", err)
	}
}

type dependentVersionsRepoStub struct {
	repository.PublishedRepository
	dependents         []entity.PublishedVersionKeyEntity
	err                error
	requestedPackageId string
	requestedVersion   string
}

func (s *dependentVersionsRepoStub) GetVersionRevisionsByPreviousVersion(_ context.Context, previousPackageId string, previousVersionName string) ([]entity.PublishedVersionKeyEntity, error) {
	s.requestedPackageId = previousPackageId
	s.requestedVersion = previousVersionName
	if s.err != nil {
		return nil, s.err
	}
	return s.dependents, nil
}

type publisherAccessRoleServiceStub struct {
	RoleService
	accessible  []entity.PublishedVersionKeyEntity
	hidden      int
	err         error
	publisherId string
}

func (s *publisherAccessRoleServiceStub) FilterVersionsByPublisherReadAccess(_ context.Context, publisherId string, _ []entity.PublishedVersionKeyEntity) ([]entity.PublishedVersionKeyEntity, int, error) {
	s.publisherId = publisherId
	if s.err != nil {
		return nil, 0, s.err
	}
	return s.accessible, s.hidden, nil
}

func dependentKey(packageId string, version string, revision int) entity.PublishedVersionKeyEntity {
	return entity.PublishedVersionKeyEntity{PackageId: packageId, Version: version, Revision: revision}
}

const testPublisherId = "publisher-id"

func erroredBuildArchive(hasErrors bool) *archive.BuildResultArchive {
	return erroredBuildArchiveForVersion("2026.1", hasErrors)
}

func erroredBuildArchiveForVersion(version string, hasErrors bool) *archive.BuildResultArchive {
	return &archive.BuildResultArchive{
		PackageInfo: view.PackageInfoFile{PackageId: "QS.PKG", Version: version, CreatedBy: testPublisherId, HasErrors: hasErrors},
	}
}

func TestCheckNoDependentVersionsForErroredVersion(t *testing.T) {
	tests := []struct {
		name            string
		hasErrors       bool
		dependents      []entity.PublishedVersionKeyEntity
		accessible      []entity.PublishedVersionKeyEntity
		hidden          int
		expectedListing string
	}{
		{
			// Nothing to protect: the dependents' changelogs stay trustworthy.
			name:       "build without errors publishes",
			hasErrors:  false,
			dependents: []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1)},
		},
		{
			name:      "errored build with no dependents publishes",
			hasErrors: true,
		},
		{
			name:            "every dependent is readable",
			hasErrors:       true,
			dependents:      []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1), dependentKey("QS.OTHER", "2.0", 3)},
			accessible:      []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1), dependentKey("QS.OTHER", "2.0", 3)},
			expectedListing: "QS.DEP|1.0@1, QS.OTHER|2.0@3",
		},
		{
			// An older revision of a version that has since been repointed elsewhere still depends on this baseline.
			name:            "an older revision of a dependent still counts",
			hasErrors:       true,
			dependents:      []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1), dependentKey("QS.DEP", "1.0", 2)},
			accessible:      []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1), dependentKey("QS.DEP", "1.0", 2)},
			expectedListing: "QS.DEP|1.0@1, QS.DEP|1.0@2",
		},
		{
			name:            "some dependents are hidden",
			hasErrors:       true,
			dependents:      []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1), dependentKey("QS.SECRET", "2.0", 3)},
			accessible:      []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1)},
			hidden:          1,
			expectedListing: "QS.DEP|1.0@1, and 1 more package version you cannot access (contact system administrator)",
		},
		{
			// The publisher still learns why the publication was refused, without learning what they may not see.
			name:            "no dependent is readable",
			hasErrors:       true,
			dependents:      []entity.PublishedVersionKeyEntity{dependentKey("QS.SECRET", "2.0", 3), dependentKey("QS.OTHER", "1.0", 1)},
			hidden:          2,
			expectedListing: "2 package versions you cannot access (contact system administrator)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			roleService := &publisherAccessRoleServiceStub{accessible: tt.accessible, hidden: tt.hidden}
			service := publishedServiceImpl{
				publishedRepo: &dependentVersionsRepoStub{dependents: tt.dependents},
				roleService:   roleService,
			}

			err := service.checkNoDependentVersionsForErroredVersion(context.Background(), erroredBuildArchive(tt.hasErrors))

			if tt.expectedListing == "" {
				if err != nil {
					t.Fatalf("expected the publication to be allowed, got %v", err)
				}
				return
			}

			customErr, ok := err.(*exception.CustomError)
			if !ok {
				t.Fatalf("expected a CustomError, got %T: %v", err, err)
			}
			if customErr.Code != exception.VersionHasErrors {
				t.Fatalf("expected code %v, got %v", exception.VersionHasErrors, customErr.Code)
			}
			if customErr.Params["dependentVersions"] != tt.expectedListing {
				t.Fatalf("expected dependentVersions %q, got %q", tt.expectedListing, customErr.Params["dependentVersions"])
			}
			if roleService.publisherId != testPublisherId {
				t.Fatalf("expected the filter to run for the publisher, got %q", roleService.publisherId)
			}
		})
	}
}

// A migration build names its version as "version@revision", while a dependent stores the baseline as a plain
// version name, so the lookup has to be made with the name alone.
func TestCheckNoDependentVersionsForErroredVersionLooksUpThePlainVersionName(t *testing.T) {
	repo := &dependentVersionsRepoStub{}
	service := publishedServiceImpl{
		publishedRepo: repo,
		roleService:   &publisherAccessRoleServiceStub{},
	}

	if err := service.checkNoDependentVersionsForErroredVersion(context.Background(), erroredBuildArchiveForVersion("2026.1@4", true)); err != nil {
		t.Fatalf("expected the publication to be allowed, got %v", err)
	}
	if repo.requestedPackageId != "QS.PKG" || repo.requestedVersion != "2026.1" {
		t.Fatalf("expected the lookup for QS.PKG/2026.1, got %q/%q", repo.requestedPackageId, repo.requestedVersion)
	}
}

var errDependentsLookup = errors.New("dependent versions lookup failed")

// A failed lookup must not read as "no dependents": the publication would go through and break their changelogs.
func TestCheckNoDependentVersionsForErroredVersionPropagatesLookupFailure(t *testing.T) {
	service := publishedServiceImpl{
		publishedRepo: &dependentVersionsRepoStub{err: errDependentsLookup},
		roleService:   &publisherAccessRoleServiceStub{},
	}

	err := service.checkNoDependentVersionsForErroredVersion(context.Background(), erroredBuildArchive(true))
	if !errors.Is(err, errDependentsLookup) {
		t.Fatalf("expected the lookup failure to propagate, got %v", err)
	}
}

var errReadAccessFilter = errors.New("read access filtering failed")

// The same reasoning: a filtering failure must refuse the publication, not allow it.
func TestCheckNoDependentVersionsForErroredVersionPropagatesFilterFailure(t *testing.T) {
	service := publishedServiceImpl{
		publishedRepo: &dependentVersionsRepoStub{dependents: []entity.PublishedVersionKeyEntity{dependentKey("QS.DEP", "1.0", 1)}},
		roleService:   &publisherAccessRoleServiceStub{err: errReadAccessFilter},
	}

	err := service.checkNoDependentVersionsForErroredVersion(context.Background(), erroredBuildArchive(true))
	if !errors.Is(err, errReadAccessFilter) {
		t.Fatalf("expected the filtering failure to propagate, got %v", err)
	}
}

func previousVersionInfo(previousVersionPackageId string, previousVersion string) view.PackageInfoFile {
	return view.PackageInfoFile{
		PackageId:                "QS.PKG",
		Version:                  "2026.1",
		CreatedBy:                testPublisherId,
		PreviousVersionPackageId: previousVersionPackageId,
		PreviousVersion:          previousVersion,
	}
}

func TestCheckPreviousVersionHasNoErrors(t *testing.T) {
	tests := []struct {
		name            string
		previousVersion string
		errorSummary    *entity.VersionErrorSummaryEntity
		refused         bool
	}{
		{
			// Nothing to compare against, so there is no baseline to distrust.
			name:         "no previous version",
			errorSummary: &entity.VersionErrorSummaryEntity{HasErrors: true},
		},
		{
			name:            "sound baseline",
			previousVersion: "2025.4",
			errorSummary:    &entity.VersionErrorSummaryEntity{},
		},
		{
			name:            "baseline with errors of its own",
			previousVersion: "2025.4",
			errorSummary:    &entity.VersionErrorSummaryEntity{HasErrors: true},
			refused:         true,
		},
		{
			// The baseline's documents are fine, but the changes it publishes cannot be trusted, so neither
			// can anything calculated on top of them.
			name:            "baseline with an unreliable changelog",
			previousVersion: "2025.4",
			errorSummary:    &entity.VersionErrorSummaryEntity{ChangelogHasErrors: true},
			refused:         true,
		},
		{
			name:            "dashboard baseline referencing a version with errored documents",
			previousVersion: "2025.4",
			errorSummary:    &entity.VersionErrorSummaryEntity{ReferencedVersionHasErrors: true},
			refused:         true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &errorSummaryRepoStub{errorSummary: tt.errorSummary}
			service := publishedServiceImpl{publishedRepo: repo}

			err := service.checkPreviousVersionHasNoErrors(context.Background(), previousVersionInfo("QS.PREV", tt.previousVersion), 7)

			if !tt.refused {
				if err != nil {
					t.Fatalf("expected the publication to be allowed, got %v", err)
				}
				return
			}
			customErr, ok := err.(*exception.CustomError)
			if !ok {
				t.Fatalf("expected a CustomError, got %T: %v", err, err)
			}
			if customErr.Code != exception.VersionHasErrors {
				t.Fatalf("expected code %v, got %v", exception.VersionHasErrors, customErr.Code)
			}
			if customErr.Message != exception.PreviousVersionHasErrorsMsg {
				t.Fatalf("expected the previous version message, got %q", customErr.Message)
			}
			if customErr.Params["previousVersionPackageId"] != "QS.PREV" || customErr.Params["previousVersion"] != tt.previousVersion {
				t.Fatalf("expected the baseline to be named in the params, got %v", customErr.Params)
			}
		})
	}
}

// The build result leaves previousVersionPackageId empty when the baseline lives in the same package.
func TestCheckPreviousVersionHasNoErrorsDefaultsToTheOwnPackage(t *testing.T) {
	repo := &errorSummaryRepoStub{errorSummary: &entity.VersionErrorSummaryEntity{}}
	service := publishedServiceImpl{publishedRepo: repo}

	if err := service.checkPreviousVersionHasNoErrors(context.Background(), previousVersionInfo("", "2025.4"), 7); err != nil {
		t.Fatalf("expected the publication to be allowed, got %v", err)
	}
	if repo.queriedPackageId != "QS.PKG" {
		t.Fatalf("expected the baseline to be looked up in the published package, got %q", repo.queriedPackageId)
	}
	if repo.queriedRevision != 7 {
		t.Fatalf("expected the resolved revision to be checked, got %v", repo.queriedRevision)
	}
}

// A failed lookup must not read as "sound baseline": the changelog would be written against a version with errors.
func TestCheckPreviousVersionHasNoErrorsPropagatesLookupFailure(t *testing.T) {
	service := publishedServiceImpl{publishedRepo: failingErrorSummaryRepoStub{}}

	err := service.checkPreviousVersionHasNoErrors(context.Background(), previousVersionInfo("QS.PREV", "2025.4"), 7)
	if !errors.Is(err, errErrorSummaryLookup) {
		t.Fatalf("expected the lookup failure to propagate, got %v", err)
	}
}

type referencesRepoStub struct {
	repository.PublishedRepository
	versions          map[string]*entity.PublishedVersionEntity
	erroredVersions   map[string]struct{}
	errorSummaryCalls []string
}

func referenceKey(packageId string, version string) string {
	return packageId + "|" + version
}

func (s *referencesRepoStub) GetVersionIncludingDeleted(_ context.Context, packageId string, version string) (*entity.PublishedVersionEntity, error) {
	return s.versions[referenceKey(packageId, version)], nil
}

func (s *referencesRepoStub) GetVersion(_ context.Context, packageId string, version string) (*entity.PublishedVersionEntity, error) {
	return s.versions[referenceKey(packageId, version)], nil
}

func (s *referencesRepoStub) GetVersionErrorSummary(_ context.Context, packageId string, version string, _ int, _ bool) (*entity.VersionErrorSummaryEntity, error) {
	key := referenceKey(packageId, version)
	s.errorSummaryCalls = append(s.errorSummaryCalls, key)
	if _, errored := s.erroredVersions[key]; errored {
		return &entity.VersionErrorSummaryEntity{HasErrors: true}, nil
	}
	return &entity.VersionErrorSummaryEntity{}, nil
}

func referencesRepo(erroredVersions ...string) *referencesRepoStub {
	errored := make(map[string]struct{}, len(erroredVersions))
	for _, version := range erroredVersions {
		errored[referenceKey(version, "1.0")] = struct{}{}
	}
	return &referencesRepoStub{
		versions: map[string]*entity.PublishedVersionEntity{
			referenceKey("QS.SVC1", "1.0"): {PackageId: "QS.SVC1", Version: "1.0", Revision: 2},
			referenceKey("QS.SVC2", "1.0"): {PackageId: "QS.SVC2", Version: "1.0", Revision: 1},
		},
		erroredVersions: errored,
	}
}

var dashboardInfo = view.PackageInfoFile{PackageId: "QS.DASH", Version: "2026.1", Revision: 1, Status: string(view.Release)}

func draftDashboardInfo() view.PackageInfoFile {
	info := dashboardInfo
	info.Status = string(view.Draft)
	return info
}

func dashboardRefs(excludedPackageIds ...string) []view.BCRef {
	excluded := make(map[string]struct{}, len(excludedPackageIds))
	for _, packageId := range excludedPackageIds {
		excluded[packageId] = struct{}{}
	}
	refs := make([]view.BCRef, 0, 2)
	for _, packageId := range []string{"QS.SVC1", "QS.SVC2"} {
		_, isExcluded := excluded[packageId]
		refs = append(refs, view.BCRef{RefId: packageId, Version: "1.0", Excluded: isExcluded})
	}
	return refs
}

func TestMakePublishedReferencesEntitiesRefusesReferenceWithErrorsForRelease(t *testing.T) {
	repo := referencesRepo("QS.SVC2")
	service := publishedServiceImpl{publishedRepo: repo}

	_, err := service.makePublishedReferencesEntities(context.Background(), dashboardInfo, dashboardRefs())

	customErr, ok := err.(*exception.CustomError)
	if !ok {
		t.Fatalf("expected a CustomError, got %T: %v", err, err)
	}
	if customErr.Code != exception.VersionHasErrors {
		t.Fatalf("expected code %v, got %v", exception.VersionHasErrors, customErr.Code)
	}
	if customErr.Message != exception.ReferencedVersionHasErrorsMsg {
		t.Fatalf("expected the referenced version message, got %q", customErr.Message)
	}
	if customErr.Params["packageId"] != "QS.SVC2" || customErr.Params["version"] != "1.0" {
		t.Fatalf("expected the reference to be named in the params, got %v", customErr.Params)
	}
}

// A draft dashboard may reference an unsound version, so the references are not even judged.
func TestMakePublishedReferencesEntitiesAllowsReferenceWithErrorsForDraft(t *testing.T) {
	repo := referencesRepo("QS.SVC2")
	service := publishedServiceImpl{publishedRepo: repo}

	refEntities, err := service.makePublishedReferencesEntities(context.Background(), draftDashboardInfo(), dashboardRefs())
	if err != nil {
		t.Fatalf("expected the publication to be allowed, got %v", err)
	}
	if len(refEntities) != 2 {
		t.Fatalf("expected both references to be stored, got %d", len(refEntities))
	}
	if len(repo.errorSummaryCalls) != 0 {
		t.Fatalf("expected no reference to be checked for a draft, got %v", repo.errorSummaryCalls)
	}
}

// An excluded reference contributes nothing to the dashboard, and the stored predicate ignores it as well.
func TestMakePublishedReferencesEntitiesAllowsExcludedReferenceWithErrors(t *testing.T) {
	repo := referencesRepo("QS.SVC2")
	service := publishedServiceImpl{publishedRepo: repo}

	refEntities, err := service.makePublishedReferencesEntities(context.Background(), dashboardInfo, dashboardRefs("QS.SVC2"))
	if err != nil {
		t.Fatalf("expected the publication to be allowed, got %v", err)
	}
	if len(refEntities) != 2 {
		t.Fatalf("expected both references to be stored, got %d", len(refEntities))
	}
	if !reflect.DeepEqual(repo.errorSummaryCalls, []string{referenceKey("QS.SVC1", "1.0")}) {
		t.Fatalf("expected only the included reference to be checked, got %v", repo.errorSummaryCalls)
	}
}

func TestMakePublishedReferencesEntitiesAcceptsSoundReferences(t *testing.T) {
	service := publishedServiceImpl{publishedRepo: referencesRepo()}

	refEntities, err := service.makePublishedReferencesEntities(context.Background(), dashboardInfo, dashboardRefs())
	if err != nil {
		t.Fatalf("expected the publication to be allowed, got %v", err)
	}
	if len(refEntities) != 2 {
		t.Fatalf("expected both references to be stored, got %d", len(refEntities))
	}
	if refEntities[0].RefPackageId != "QS.SVC1" || refEntities[0].RefRevision != 2 {
		t.Fatalf("expected the reference to be resolved to its latest revision, got %+v", refEntities[0])
	}
}
