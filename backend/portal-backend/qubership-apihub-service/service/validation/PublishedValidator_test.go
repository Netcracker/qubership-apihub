package validation

import (
	"archive/zip"
	"context"
	"fmt"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/stretchr/testify/assert"
)

const (
	restDocumentSlug  = "openapi-yaml"
	asyncDocumentSlug = "events-yaml"

	comparisonPackageId = "QS.PKG"
	comparisonVersion   = "2026.1"
	comparisonRevision  = 3
	previousVersionName = "2025.4"
)

func buildArchive(versionHasErrors bool, documents []view.PackageDocument, notifications []view.BuilderNotification) *archive.BuildResultArchive {
	return &archive.BuildResultArchive{
		PackageInfo:        view.PackageInfoFile{HasErrors: versionHasErrors},
		PackageDocuments:   view.PackageDocumentsFile{Documents: documents},
		BuildNotifications: view.BuildNotificationsFile{Notifications: notifications},
	}
}

func errorNotification(documentId string) view.BuilderNotification {
	return view.BuilderNotification{
		Severity:   view.BuilderNotificationSeverityError,
		Category:   "document-build",
		Message:    "Cannot process the document",
		DocumentId: documentId,
	}
}

func TestValidateErroredVersionNotPublishedAsRelease(t *testing.T) {
	const packageId = "QS.PKG"
	const versionName = "2026.1"

	tests := []struct {
		name                string
		status              view.VersionStatus
		hasErrors           bool
		comparisonHasErrors bool
		ddlComparisonErrors bool
		migrationBuild      bool
		expectError         bool
	}{
		{
			name:        "release status with errors is refused",
			status:      view.Release,
			hasErrors:   true,
			expectError: true,
		},
		{
			name:        "release status without errors is accepted",
			status:      view.Release,
			hasErrors:   false,
			expectError: false,
		},
		{
			name:        "draft status with errors is accepted",
			status:      view.Draft,
			hasErrors:   true,
			expectError: false,
		},
		{
			// A release that declares a previousVersion is expected to ship a reliable changelog, so an error
			// in the comparison blocks it even when every document built cleanly.
			name:                "release status with an errored changelog is refused",
			status:              view.Release,
			comparisonHasErrors: true,
			expectError:         true,
		},
		{
			name:                "release status with an errored DDL changelog is refused",
			status:              view.Release,
			ddlComparisonErrors: true,
			expectError:         true,
		},
		{
			// Comparison errors never block a draft; they mark the comparison, not the version.
			name:                "draft status with an errored changelog is accepted",
			status:              view.Draft,
			comparisonHasErrors: true,
			expectError:         false,
		},
		{
			name:           "migration build in release status with errors is refused",
			status:         view.Release,
			hasErrors:      true,
			migrationBuild: true,
			expectError:    true,
		},
	}

	validator := NewPublishedValidator(nil)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buildArc := &archive.BuildResultArchive{
				PackageInfo: view.PackageInfoFile{
					PackageId:      packageId,
					Version:        versionName,
					Status:         string(tt.status),
					MigrationBuild: tt.migrationBuild,
					HasErrors:      tt.hasErrors,
				},
				PackageComparisons: view.PackageComparisonsFile{
					Comparisons: []view.VersionComparison{{HasErrors: tt.comparisonHasErrors}},
				},
				PackageDdlComparisons: view.PackageDdlComparisonsFile{
					Comparisons: []view.DdlVersionComparison{{HasErrors: tt.ddlComparisonErrors}},
				},
			}

			err := validator.ValidateErroredVersionNotPublishedAsRelease(buildArc)
			if tt.expectError && err == nil {
				t.Fatalf("expected the build result to be rejected, but it was accepted")
			}
			if !tt.expectError && err != nil {
				t.Fatalf("expected the build result to be accepted, but it was rejected: %v", err)
			}
		})
	}
}

func TestValidateBuildNotifications(t *testing.T) {
	validDocument := view.PackageDocument{Slug: restDocumentSlug}
	erroredDocument := view.PackageDocument{Slug: asyncDocumentSlug, HasErrors: true}

	tests := []struct {
		name        string
		buildArc    *archive.BuildResultArchive
		expectError bool
	}{
		{
			name: "flags and notifications are stored as they come",
			buildArc: buildArchive(true,
				[]view.PackageDocument{validDocument, erroredDocument},
				[]view.BuilderNotification{errorNotification(asyncDocumentSlug)}),
			expectError: false,
		},
		{
			name:        "no errors at all",
			buildArc:    buildArchive(false, []view.PackageDocument{validDocument}, nil),
			expectError: false,
		},
		{
			// The message concerns the previous version of the comparison, whose documents are not part of
			// this build result.
			name: "error notification for a document absent from the build result",
			buildArc: buildArchive(true,
				[]view.PackageDocument{validDocument},
				[]view.BuilderNotification{errorNotification("removed-in-this-version-yaml")}),
			expectError: false,
		},
		{
			name: "severity outside the contract",
			buildArc: buildArchive(false,
				[]view.PackageDocument{validDocument},
				[]view.BuilderNotification{{Severity: view.BuilderNotificationSeverity(7), Message: "Cannot process the document"}}),
			expectError: true,
		},
		{
			name: "notification without a message",
			buildArc: buildArchive(false,
				[]view.PackageDocument{validDocument},
				[]view.BuilderNotification{{Severity: view.BuilderNotificationSeverityError, Category: "build-document"}}),
			expectError: true,
		},
	}

	validator := NewPublishedValidator(nil)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateBuildNotifications(tt.buildArc)
			if tt.expectError && err == nil {
				t.Fatalf("expected the build result to be rejected, but it was accepted")
			}
			if !tt.expectError && err != nil {
				t.Fatalf("expected the build result to be accepted, but it was rejected: %v", err)
			}
		})
	}
}

func TestValidateFailedBuildNotifications(t *testing.T) {
	valid := view.BuilderNotification{Severity: view.BuilderNotificationSeverityError, Category: "parse-file", Message: "Cannot parse file", DocumentId: "spec"}

	t.Run("both streams with valid messages pass", func(t *testing.T) {
		part := view.FailedBuildNotifications{
			Notifications:           []view.BuilderNotification{valid},
			ComparisonNotifications: []view.BuilderNotification{{Severity: view.BuilderNotificationSeverityWarning, Category: "version-not-resolved", Message: "Previous version not found"}},
		}
		assert.NoError(t, ValidateFailedBuildNotifications(part))
	})

	t.Run("empty lists pass", func(t *testing.T) {
		part := view.FailedBuildNotifications{Notifications: []view.BuilderNotification{}, ComparisonNotifications: []view.BuilderNotification{}}
		assert.NoError(t, ValidateFailedBuildNotifications(part))
	})

	t.Run("a missing list is rejected", func(t *testing.T) {
		part := view.FailedBuildNotifications{Notifications: []view.BuilderNotification{valid}}
		assert.Error(t, ValidateFailedBuildNotifications(part))
	})

	t.Run("an unknown severity is rejected with its position", func(t *testing.T) {
		bad := valid
		bad.Severity = 7
		part := view.FailedBuildNotifications{Notifications: []view.BuilderNotification{}, ComparisonNotifications: []view.BuilderNotification{valid, bad}}
		err := ValidateFailedBuildNotifications(part)
		assert.ErrorContains(t, err, "comparisonNotifications[1]")
	})

	t.Run("an empty category is rejected", func(t *testing.T) {
		bad := valid
		bad.Category = ""
		part := view.FailedBuildNotifications{Notifications: []view.BuilderNotification{bad}, ComparisonNotifications: []view.BuilderNotification{}}
		err := ValidateFailedBuildNotifications(part)
		assert.ErrorContains(t, err, "notifications[0]: category is required")
	})
}

func comparisonNotifications(previousVersion string, notifications ...view.BuilderNotification) view.ComparisonNotifications {
	return view.ComparisonNotifications{
		PackageId:                comparisonPackageId,
		Version:                  comparisonVersion,
		Revision:                 comparisonRevision,
		PreviousVersionPackageId: comparisonPackageId,
		PreviousVersion:          previousVersion,
		PreviousVersionRevision:  1,
		Notifications:            notifications,
	}
}

func builtComparison(previousVersion string) view.VersionComparison {
	return view.VersionComparison{
		PackageId:                comparisonPackageId,
		Version:                  comparisonVersion,
		Revision:                 comparisonRevision,
		PreviousVersionPackageId: comparisonPackageId,
		PreviousVersion:          previousVersion,
		PreviousVersionRevision:  1,
	}
}

func cachedComparison(previousVersion string) view.CachedVersionComparison {
	return view.CachedVersionComparison{
		PackageId:                comparisonPackageId,
		Version:                  comparisonVersion,
		Revision:                 comparisonRevision,
		PreviousVersionPackageId: comparisonPackageId,
		PreviousVersion:          previousVersion,
		PreviousVersionRevision:  1,
	}
}

func TestValidateComparisonNotifications(t *testing.T) {
	tests := []struct {
		name        string
		buildArc    *archive.BuildResultArchive
		expectError bool
	}{
		{
			name: "every entry names a comparison of this build",
			buildArc: &archive.BuildResultArchive{
				PackageComparisons: view.PackageComparisonsFile{
					Comparisons: []view.VersionComparison{builtComparison(previousVersionName)},
				},
				ComparisonNotifications: view.ComparisonNotificationsFile{
					Comparisons: []view.ComparisonNotifications{
						comparisonNotifications(previousVersionName, errorNotification("")),
					},
				},
			},
			expectError: false,
		},
		{
			// A comparison the build recalculated cleanly ships an empty entry, which clears the rows stored
			// for it earlier.
			name: "entry with no notifications",
			buildArc: &archive.BuildResultArchive{
				PackageComparisons: view.PackageComparisonsFile{
					Comparisons: []view.VersionComparison{builtComparison(previousVersionName)},
				},
				ComparisonNotifications: view.ComparisonNotificationsFile{
					Comparisons: []view.ComparisonNotifications{comparisonNotifications(previousVersionName)},
				},
			},
			expectError: false,
		},
		{
			name:        "no comparison notifications at all",
			buildArc:    &archive.BuildResultArchive{},
			expectError: false,
		},
		{
			// The pair is matched against ddl-comparisons.json too, so a DDL-only changelog is accepted.
			name: "entry names a DDL comparison of this build",
			buildArc: &archive.BuildResultArchive{
				PackageDdlComparisons: view.PackageDdlComparisonsFile{
					Comparisons: []view.DdlVersionComparison{{
						PackageId:                comparisonPackageId,
						Version:                  comparisonVersion,
						Revision:                 comparisonRevision,
						PreviousVersionPackageId: comparisonPackageId,
						PreviousVersion:          previousVersionName,
						PreviousVersionRevision:  1,
					}},
				},
				ComparisonNotifications: view.ComparisonNotificationsFile{
					Comparisons: []view.ComparisonNotifications{
						comparisonNotifications(previousVersionName, errorNotification("")),
					},
				},
			},
			expectError: false,
		},
		{
			// A reused comparison creates no version_comparison row here, so an entry for it would clear the
			// rows recorded when it was really calculated.
			name: "entry names a comparison the build reused from cache",
			buildArc: &archive.BuildResultArchive{
				PackageComparisons: view.PackageComparisonsFile{
					Comparisons: []view.VersionComparison{builtComparison(previousVersionName)},
				},
				CachedComparisons: view.PackageCachedComparisonsFile{
					CachedComparisons: []view.CachedVersionComparison{cachedComparison(previousVersionName)},
				},
				ComparisonNotifications: view.ComparisonNotificationsFile{
					Comparisons: []view.ComparisonNotifications{
						comparisonNotifications(previousVersionName, errorNotification("")),
					},
				},
			},
			expectError: true,
		},
		{
			// Without a matching comparison there is no version_comparison row to store the messages against,
			// so the publish fails instead of dropping them.
			name: "entry names a pair the build did not compare",
			buildArc: &archive.BuildResultArchive{
				PackageComparisons: view.PackageComparisonsFile{
					Comparisons: []view.VersionComparison{builtComparison(previousVersionName)},
				},
				ComparisonNotifications: view.ComparisonNotificationsFile{
					Comparisons: []view.ComparisonNotifications{
						comparisonNotifications("2025.3", errorNotification("")),
					},
				},
			},
			expectError: true,
		},
		{
			name: "notification without a message",
			buildArc: &archive.BuildResultArchive{
				PackageComparisons: view.PackageComparisonsFile{
					Comparisons: []view.VersionComparison{builtComparison(previousVersionName)},
				},
				ComparisonNotifications: view.ComparisonNotificationsFile{
					Comparisons: []view.ComparisonNotifications{
						comparisonNotifications(previousVersionName,
							view.BuilderNotification{Severity: view.BuilderNotificationSeverityError}),
					},
				},
			},
			expectError: true,
		},
	}

	validator := NewPublishedValidator(nil)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateComparisonNotifications(tt.buildArc)
			if tt.expectError && err == nil {
				t.Fatalf("expected the build result to be rejected, but it was accepted")
			}
			if !tt.expectError && err != nil {
				t.Fatalf("expected the build result to be accepted, but it was rejected: %v", err)
			}
		})
	}
}

func validDdlContract() view.PackageDdlContract {
	return view.PackageDdlContract{
		DdlEntityId:               "public-table-users",
		Kind:                      view.DdlEntityKindTable,
		Name:                      "users",
		SchemaName:                "public",
		DocumentId:                "shop.sql",
		VersionInternalDocumentId: "shop",
	}
}

func validMcpContract() view.PackageMcpContract {
	return view.PackageMcpContract{
		McpEntityId: "mcp-tool-get_forecast",
		Kind:        view.McpEntityKindTool,
		Title:       "get_forecast",
		McpEndpoint: "/mcp",
		DocumentId:  "tools-forecast-json",
	}
}

func TestValidatePackageDdlContracts(t *testing.T) {
	tests := []struct {
		name       string
		info       view.PackageInfoFile
		tables     []view.PackageDdlContract
		comparison []view.DdlVersionComparison
		wantErr    bool
		wantCode   string
	}{
		{
			name:    "valid ddl contract",
			tables:  []view.PackageDdlContract{validDdlContract()},
			wantErr: false,
		},
		{
			name:    "no ddl contracts is valid",
			tables:  nil,
			wantErr: false,
		},
		{
			name: "missing required field",
			tables: []view.PackageDdlContract{
				func() view.PackageDdlContract {
					c := validDdlContract()
					c.SchemaName = ""
					return c
				}(),
			},
			wantErr:  true,
			wantCode: exception.InvalidPackagedFile,
		},
		{
			name: "unsupported kind",
			tables: []view.PackageDdlContract{
				func() view.PackageDdlContract {
					c := validDdlContract()
					c.Kind = "view"
					return c
				}(),
			},
			wantErr:  true,
			wantCode: exception.InvalidPackagedFile,
		},
		{
			name: "noChangelog forbids ddl comparisons",
			info: view.PackageInfoFile{NoChangelog: true},
			comparison: []view.DdlVersionComparison{
				{PackageId: "pkg", Version: "1.0.0", Revision: 1},
			},
			wantErr:  true,
			wantCode: exception.ChangesAreNotEmpty,
		},
		{
			name: "ddl comparison missing packageId when version is set",
			comparison: []view.DdlVersionComparison{
				{Version: "1.0.0"},
			},
			wantErr:  true,
			wantCode: exception.InvalidComparisonField,
		},
		{
			name: "ddl comparison with both version and previousVersion empty",
			comparison: []view.DdlVersionComparison{
				{PackageId: "pkg"},
			},
			wantErr:  true,
			wantCode: exception.InvalidComparisonField,
		},
		{
			name: "ddl comparison referencing excluded ref",
			info: view.PackageInfoFile{
				Refs: []view.BCRef{
					{RefId: "pkg", Version: "1.0.0@1", Excluded: true},
				},
			},
			comparison: []view.DdlVersionComparison{
				{PackageId: "pkg", Version: "1.0.0", Revision: 1},
			},
			wantErr:  true,
			wantCode: exception.ExcludedComparisonReference,
		},
	}

	p := publishedValidatorImpl{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buildArc := &archive.BuildResultArchive{
				PackageInfo:           tt.info,
				PackageDdlContracts:   view.PackageDdlContractsFile{Tables: tt.tables},
				PackageDdlComparisons: view.PackageDdlComparisonsFile{Comparisons: tt.comparison},
			}
			err := p.validatePackageDdlContracts(context.Background(), buildArc, &view.BuildConfig{})
			if tt.wantErr {
				assert.Error(t, err)
				customErr, ok := err.(*exception.CustomError)
				assert.True(t, ok, "expected *exception.CustomError, got %T", err)
				assert.Equal(t, tt.wantCode, customErr.Code)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidatePackageMcpContracts(t *testing.T) {
	tests := []struct {
		name    string
		mcp     view.PackageMcpContractsFile
		wantErr bool
	}{
		{
			name:    "valid mcp contract",
			mcp:     view.PackageMcpContractsFile{Tools: []view.PackageMcpContract{validMcpContract()}},
			wantErr: false,
		},
		{
			name:    "no mcp contracts is valid",
			mcp:     view.PackageMcpContractsFile{},
			wantErr: false,
		},
		{
			name: "missing required field",
			mcp: view.PackageMcpContractsFile{
				Tools: []view.PackageMcpContract{
					func() view.PackageMcpContract {
						c := validMcpContract()
						c.McpEndpoint = ""
						return c
					}(),
				},
			},
			wantErr: true,
		},
		{
			name: "unsupported kind",
			mcp: view.PackageMcpContractsFile{
				Prompts: []view.PackageMcpContract{
					func() view.PackageMcpContract {
						c := validMcpContract()
						c.Kind = "unknown"
						return c
					}(),
				},
			},
			wantErr: true,
		},
	}

	p := publishedValidatorImpl{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buildArc := &archive.BuildResultArchive{PackageMcpContracts: tt.mcp}
			err := p.validatePackageMcpContracts(buildArc, &view.BuildConfig{})
			if tt.wantErr {
				assert.Error(t, err)
				customErr, ok := err.(*exception.CustomError)
				assert.True(t, ok, "expected *exception.CustomError, got %T", err)
				assert.Equal(t, exception.InvalidPackagedFile, customErr.Code)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func changelogPackageInfo() view.PackageInfoFile {
	return view.PackageInfoFile{
		PackageId:                "pkg",
		Version:                  "2.0.0",
		Revision:                 2,
		PreviousVersionPackageId: "pkg",
		PreviousVersion:          "1.0.0",
		PreviousVersionRevision:  1,
	}
}

func TestValidateChanges(t *testing.T) {
	tests := []struct {
		name           string
		comparisons    []view.VersionComparison
		ddlComparisons []view.DdlVersionComparison
		wantErr        bool
	}{
		{
			name:    "no comparisons of either kind is rejected",
			wantErr: true,
		},
		{
			name: "ddl-only comparison is accepted",
			ddlComparisons: []view.DdlVersionComparison{
				{PackageId: "pkg", Version: "2.0.0", Revision: 2},
			},
			wantErr: false,
		},
		{
			name: "regular comparison is accepted",
			comparisons: []view.VersionComparison{
				{
					PackageId: "pkg", Version: "2.0.0", Revision: 2,
					OperationTypes: []view.OperationType{
						{ApiType: "rest", ChangesSummary: view.ChangeSummary{Breaking: 1}},
					},
				},
			},
			wantErr: false,
		},
	}

	p := publishedValidatorImpl{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buildArc := &archive.BuildResultArchive{
				PackageInfo:           changelogPackageInfo(),
				PackageComparisons:    view.PackageComparisonsFile{Comparisons: tt.comparisons},
				PackageDdlComparisons: view.PackageDdlComparisonsFile{Comparisons: tt.ddlComparisons},
			}
			err := p.ValidateChanges(context.Background(), buildArc)
			if tt.wantErr {
				assert.Error(t, err)
				customErr, ok := err.(*exception.CustomError)
				assert.True(t, ok, "expected *exception.CustomError, got %T", err)
				assert.Equal(t, exception.InvalidPackagedFile, customErr.Code)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

type versionComparisonRepoStub struct {
	repository.PublishedRepository
	comparison *entity.VersionComparisonEntity
}

func (s versionComparisonRepoStub) GetVersionComparison(context.Context, string) (*entity.VersionComparisonEntity, error) {
	return s.comparison, nil
}

func TestValidateCachedComparisons(t *testing.T) {
	// The publish path validates before the version being published is split into name and revision,
	// so the archive still carries the "version@revision" form here.
	packageInfo := view.PackageInfoFile{
		PackageId: comparisonPackageId,
		Version:   fmt.Sprintf("%v@%v", comparisonVersion, comparisonRevision),
	}
	refCached := view.CachedVersionComparison{
		PackageId:                "QS.REF",
		Version:                  "1.2",
		Revision:                 4,
		PreviousVersionPackageId: "QS.REF",
		PreviousVersion:          "1.1",
		PreviousVersionRevision:  2,
	}
	refComparison := view.VersionComparison{
		PackageId:                refCached.PackageId,
		Version:                  refCached.Version,
		Revision:                 refCached.Revision,
		PreviousVersionPackageId: refCached.PreviousVersionPackageId,
		PreviousVersion:          refCached.PreviousVersion,
		PreviousVersionRevision:  refCached.PreviousVersionRevision,
	}
	refDdlComparison := view.DdlVersionComparison{
		PackageId:                refCached.PackageId,
		Version:                  refCached.Version,
		Revision:                 refCached.Revision,
		PreviousVersionPackageId: refCached.PreviousVersionPackageId,
		PreviousVersion:          refCached.PreviousVersion,
		PreviousVersionRevision:  refCached.PreviousVersionRevision,
	}

	tests := []struct {
		name             string
		filePresent      bool
		comparisonsFile  bool
		cached           []view.CachedVersionComparison
		comparisons      []view.VersionComparison
		ddlComparisons   []view.DdlVersionComparison
		storedComparison *entity.VersionComparisonEntity
		wantErrorCode    string
	}{
		{
			name:             "a reused reference pair listed in comparisons.json is accepted",
			filePresent:      true,
			comparisonsFile:  true,
			cached:           []view.CachedVersionComparison{refCached},
			comparisons:      []view.VersionComparison{builtComparison(previousVersionName), refComparison},
			storedComparison: &entity.VersionComparisonEntity{OperationTypes: []view.OperationType{{ApiType: "rest"}}},
		},
		{
			name:             "a reused reference pair listed only in ddl-comparisons.json is accepted",
			filePresent:      true,
			comparisonsFile:  true,
			cached:           []view.CachedVersionComparison{refCached},
			ddlComparisons:   []view.DdlVersionComparison{refDdlComparison},
			storedComparison: &entity.VersionComparisonEntity{ContractTypes: []view.ContractType{{ContractType: view.ContractTypeDdl}}},
		},
		{
			name:            "an empty list is accepted",
			filePresent:     true,
			comparisonsFile: true,
			comparisons:     []view.VersionComparison{builtComparison(previousVersionName)},
		},
		{
			name:            "the file is required once the archive carries comparisons",
			filePresent:     false,
			comparisonsFile: true,
			comparisons:     []view.VersionComparison{builtComparison(previousVersionName)},
			wantErrorCode:   exception.FileMissingFromSources,
		},
		{
			name:            "an archive without comparisons needs no cached comparisons file",
			filePresent:     false,
			comparisonsFile: false,
		},
		{
			// The comparison id is a hash over both revisions, so an entry without them can only ever
			// point at a row that does not exist.
			name:            "an entry without a revision is rejected",
			filePresent:     true,
			comparisonsFile: true,
			cached: []view.CachedVersionComparison{{
				PackageId:                refCached.PackageId,
				Version:                  refCached.Version,
				PreviousVersionPackageId: refCached.PreviousVersionPackageId,
				PreviousVersion:          refCached.PreviousVersion,
				PreviousVersionRevision:  refCached.PreviousVersionRevision,
			}},
			comparisons:   []view.VersionComparison{refComparison},
			wantErrorCode: exception.InvalidPackagedFile,
		},
		{
			name:            "an entry without a previous version revision is rejected",
			filePresent:     true,
			comparisonsFile: true,
			cached: []view.CachedVersionComparison{{
				PackageId:                refCached.PackageId,
				Version:                  refCached.Version,
				Revision:                 refCached.Revision,
				PreviousVersionPackageId: refCached.PreviousVersionPackageId,
				PreviousVersion:          refCached.PreviousVersion,
			}},
			comparisons:   []view.VersionComparison{refComparison},
			wantErrorCode: exception.InvalidPackagedFile,
		},
		{
			name:            "an entry listed in neither index is rejected",
			filePresent:     true,
			comparisonsFile: true,
			cached:          []view.CachedVersionComparison{refCached},
			comparisons:     []view.VersionComparison{builtComparison(previousVersionName)},
			wantErrorCode:   exception.InvalidPackagedFile,
		},
		{
			name:            "the pair the build was started for cannot be reused",
			filePresent:     true,
			comparisonsFile: true,
			cached:          []view.CachedVersionComparison{cachedComparison(previousVersionName)},
			comparisons:     []view.VersionComparison{builtComparison(previousVersionName)},
			wantErrorCode:   exception.InvalidPackagedFile,
		},
		{
			name:             "an entry with no stored comparison is rejected",
			filePresent:      true,
			comparisonsFile:  true,
			cached:           []view.CachedVersionComparison{refCached},
			comparisons:      []view.VersionComparison{refComparison},
			storedComparison: nil,
			wantErrorCode:    exception.ComparisonNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buildArc := &archive.BuildResultArchive{
				PackageInfo:           packageInfo,
				PackageComparisons:    view.PackageComparisonsFile{Comparisons: tt.comparisons},
				PackageDdlComparisons: view.PackageDdlComparisonsFile{Comparisons: tt.ddlComparisons},
				CachedComparisons:     view.PackageCachedComparisonsFile{CachedComparisons: tt.cached},
			}
			if tt.filePresent {
				buildArc.CachedComparisonsFile = &zip.File{}
			}
			if tt.comparisonsFile {
				buildArc.ComparisonsFile = &zip.File{}
			}

			p := publishedValidatorImpl{publishedRepo: versionComparisonRepoStub{comparison: tt.storedComparison}}
			err := p.validateCachedComparisons(context.Background(), buildArc)
			if tt.wantErrorCode == "" {
				assert.NoError(t, err)
				return
			}
			customErr, ok := err.(*exception.CustomError)
			assert.True(t, ok, "expected *exception.CustomError, got %T", err)
			assert.Equal(t, tt.wantErrorCode, customErr.Code)
		})
	}
}

func TestValidateCachedComparisonExists(t *testing.T) {
	key := view.ComparisonKey{
		PackageId:                comparisonPackageId,
		Version:                  comparisonVersion,
		Revision:                 comparisonRevision,
		PreviousVersionPackageId: comparisonPackageId,
		PreviousVersion:          previousVersionName,
		PreviousVersionRevision:  1,
	}

	t.Run("comparison row does not exist", func(t *testing.T) {
		p := publishedValidatorImpl{publishedRepo: versionComparisonRepoStub{comparison: nil}}
		err := p.validateCachedComparisonExists(context.Background(), key)
		customErr, ok := err.(*exception.CustomError)
		assert.True(t, ok, "expected *exception.CustomError, got %T", err)
		assert.Equal(t, exception.ComparisonNotFound, customErr.Code)
		assert.Equal(t, exception.ComparisonNotFoundMsg, customErr.Message)
	})

	// A reused comparison is stored as a whole, so neither side of it has to be present for the reuse
	// to be legitimate: a package with only DDL content stores no operation types and vice versa.
	t.Run("comparison row exists with only one kind of changes", func(t *testing.T) {
		p := publishedValidatorImpl{publishedRepo: versionComparisonRepoStub{
			comparison: &entity.VersionComparisonEntity{OperationTypes: []view.OperationType{{ApiType: "rest"}}},
		}}
		assert.NoError(t, p.validateCachedComparisonExists(context.Background(), key))
	})
}
