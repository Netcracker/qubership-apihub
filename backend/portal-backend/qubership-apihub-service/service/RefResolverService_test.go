package service

import (
	"context"
	"reflect"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

// The conflict case needs two versions of one package, which the shared referencesRepo fixture does not carry.
func conflictingRefsRepo(erroredVersions ...string) *referencesRepoStub {
	errored := make(map[string]struct{}, len(erroredVersions))
	for _, version := range erroredVersions {
		errored[version] = struct{}{}
	}
	return &referencesRepoStub{
		versions: map[string]*entity.PublishedVersionEntity{
			referenceKey("QS.SVC1", "1.0"): {PackageId: "QS.SVC1", Version: "1.0", Revision: 2},
			referenceKey("QS.SVC2", "1.0"): {PackageId: "QS.SVC2", Version: "1.0", Revision: 1},
			referenceKey("QS.SVC2", "2.0"): {PackageId: "QS.SVC2", Version: "2.0", Revision: 1},
		},
		erroredVersions: errored,
	}
}

// An excluded reference contributes nothing to the dashboard, so the publication accepts it and so must the build.
func TestCalculateBuildConfigRefsAllowsExcludedReferenceWithErrors(t *testing.T) {
	repo := referencesRepo("QS.SVC2")
	resolver := refResolverServiceImpl{publishedRepo: repo}

	refs, err := resolver.CalculateBuildConfigRefs(context.Background(), dashboardRefs("QS.SVC2"), string(view.Release), false, false)
	if err != nil {
		t.Fatalf("expected the build config to be accepted, got %v", err)
	}
	if len(refs) != 2 {
		t.Fatalf("expected both references to be kept, got %d", len(refs))
	}
	if !reflect.DeepEqual(repo.errorSummaryCalls, []string{referenceKey("QS.SVC1", "1.0")}) {
		t.Fatalf("expected only the included reference to be checked, got %v", repo.errorSummaryCalls)
	}
}

// Conflict resolution runs after every reference has been read, so the errored duplicate is excluded before it is
// judged. Checking earlier refused a build config that the publication itself accepts.
func TestCalculateBuildConfigRefsAllowsReferenceExcludedByConflictResolution(t *testing.T) {
	repo := conflictingRefsRepo(referenceKey("QS.SVC2", "2.0"))
	resolver := refResolverServiceImpl{publishedRepo: repo}
	refs := []view.BCRef{
		{RefId: "QS.SVC2", Version: "1.0"},
		{RefId: "QS.SVC2", Version: "2.0"},
	}

	resolved, err := resolver.CalculateBuildConfigRefs(context.Background(), refs, string(view.Release), false, true)
	if err != nil {
		t.Fatalf("expected the build config to be accepted, got %v", err)
	}
	if resolved[0].Excluded {
		t.Fatal("expected the first reference to the package to be kept")
	}
	if !resolved[1].Excluded {
		t.Fatal("expected conflict resolution to exclude the duplicate reference")
	}
	if !reflect.DeepEqual(repo.errorSummaryCalls, []string{referenceKey("QS.SVC2", "1.0")}) {
		t.Fatalf("expected only the included reference to be checked, got %v", repo.errorSummaryCalls)
	}
}

func TestCalculateBuildConfigRefsRefusesIncludedReferenceWithErrorsForRelease(t *testing.T) {
	resolver := refResolverServiceImpl{publishedRepo: referencesRepo("QS.SVC2")}

	_, err := resolver.CalculateBuildConfigRefs(context.Background(), dashboardRefs(), string(view.Release), false, false)

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
	if customErr.Params["packageId"] != "QS.SVC2" || customErr.Params["version"] != "1.0@1" {
		t.Fatalf("expected the resolved reference to be named in the params, got %v", customErr.Params)
	}
}

// A draft dashboard may reference an unsound version, so the references are not even judged.
func TestCalculateBuildConfigRefsAllowsIncludedReferenceWithErrorsForDraft(t *testing.T) {
	repo := referencesRepo("QS.SVC2")
	resolver := refResolverServiceImpl{publishedRepo: repo}

	refs, err := resolver.CalculateBuildConfigRefs(context.Background(), dashboardRefs(), string(view.Draft), false, false)
	if err != nil {
		t.Fatalf("expected the build config to be accepted, got %v", err)
	}
	if len(refs) != 2 {
		t.Fatalf("expected both references to be kept, got %d", len(refs))
	}
	if len(repo.errorSummaryCalls) != 0 {
		t.Fatalf("expected no reference to be checked for a draft, got %v", repo.errorSummaryCalls)
	}
}
