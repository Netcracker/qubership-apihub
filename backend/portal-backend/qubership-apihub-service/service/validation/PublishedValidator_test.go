package validation

import (
	"context"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/stretchr/testify/assert"
)

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
