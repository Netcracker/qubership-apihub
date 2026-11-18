package service

import (
	"context"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

type lintedVersionRepoStub struct {
	repository.VersionResultRepository

	version entity.LintedVersionWithProcess_deprecated
}

func (r *lintedVersionRepoStub) GetVersionWithProcessAndDocsSummary_deprecated(_ context.Context, _ string, _ string, _ int) (*entity.LintedVersionWithProcess_deprecated, []entity.LintedDocument, error) {
	version := r.version
	return &version, nil, nil
}

func (r *lintedVersionRepoStub) GetVersionAndDocsSummary(_ context.Context, _ string, _ string, _ int) (*entity.LintedVersion, []entity.LintedDocument, error) {
	version := r.version.LintedVersion
	return &version, nil, nil
}

func TestGetVersionSummaryDeprecated_InProgressWhileValidationProcessIsProcessing(t *testing.T) {
	tests := []struct {
		name          string
		processStatus view.ValidationProcessStatus
		wantStatus    view.LintedVersionStatus
		wantDetails   string
	}{
		{
			name:          "process is processing",
			processStatus: view.ValidationProcessProcessing,
			wantStatus:    view.VersionStatusInProgress,
			wantDetails:   "",
		},
		{
			name:          "process ended in success",
			processStatus: view.ValidationProcessSuccess,
			wantStatus:    view.VersionStatusError,
			wantDetails:   "1 doc task(s) failed",
		},
		{
			name:          "process ended in error",
			processStatus: view.ValidationProcessError,
			wantStatus:    view.VersionStatusError,
			wantDetails:   "1 doc task(s) failed",
		},
		{
			name:        "row written before validation processes",
			wantStatus:  view.VersionStatusError,
			wantDetails: "1 doc task(s) failed",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := &validationServiceImpl{versionResultRepository: &lintedVersionRepoStub{version: entity.LintedVersionWithProcess_deprecated{
				LintedVersion: entity.LintedVersion{
					PackageId:   testPackageId,
					Version:     testVersion,
					Revision:    testRevision,
					LintStatus:  view.VersionStatusError,
					LintDetails: "1 doc task(s) failed",
				},
				ValidationProcessStatus: tt.processStatus,
			}}}

			summaries := map[string]func(ctx context.Context, packageId string, version string) (*view.ValidationSummaryForVersion, error){
				"v2": svc.GetVersionSummary_deprecated_2,
				"v1": svc.GetVersionSummary_deprecated,
			}
			for endpoint, getSummary := range summaries {
				summary, err := getSummary(context.Background(), testPackageId, testVersionWithRevision)
				if err != nil {
					t.Fatalf("%s: %s", endpoint, err)
				}
				if summary.Status != tt.wantStatus || summary.Details != tt.wantDetails {
					t.Fatalf("%s: status = %s, details = %q; want %s, %q", endpoint, summary.Status, summary.Details, tt.wantStatus, tt.wantDetails)
				}
			}
		})
	}
}

func TestGetVersionSummary_ReturnsLintResultWhileValidationProcessIsProcessing(t *testing.T) {
	svc := &validationServiceImpl{versionResultRepository: &lintedVersionRepoStub{version: entity.LintedVersionWithProcess_deprecated{
		LintedVersion: entity.LintedVersion{
			PackageId:   testPackageId,
			Version:     testVersion,
			Revision:    testRevision,
			LintStatus:  view.VersionStatusSuccess,
			LintDetails: "lint finished",
		},
		ValidationProcessStatus: view.ValidationProcessProcessing,
	}}}

	v2Summary, err := svc.GetVersionSummary_deprecated_2(context.Background(), testPackageId, testVersionWithRevision)
	if err != nil {
		t.Fatalf("v2: %s", err)
	}
	if v2Summary.Status != view.VersionStatusInProgress || v2Summary.Details != "" {
		t.Fatalf("v2: status = %s, details = %q; want %s, \"\"", v2Summary.Status, v2Summary.Details, view.VersionStatusInProgress)
	}

	v3Summary, err := svc.GetVersionSummary(context.Background(), testPackageId, testVersionWithRevision)
	if err != nil {
		t.Fatalf("v3: %s", err)
	}
	if v3Summary.Status != view.VersionStatusSuccess || v3Summary.Details != "lint finished" {
		t.Fatalf("v3: status = %s, details = %q; want %s, %q", v3Summary.Status, v3Summary.Details, view.VersionStatusSuccess, "lint finished")
	}
}
