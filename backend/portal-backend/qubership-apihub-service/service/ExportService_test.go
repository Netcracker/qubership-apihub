package service

import (
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMakeAllowedOasExtensions(t *testing.T) {
	tests := []struct {
		name            string
		removeOasExt    bool
		packageId       string
		mockConfig      *view.PackageExportConfig
		mockErr         error
		expectedAllowed *[]string
		expectedErrMsg  string
	}{
		{
			name:            "RemoveOasExtensions is false",
			removeOasExt:    false,
			packageId:       "test-pkg",
			mockConfig:      nil,
			mockErr:         nil,
			expectedAllowed: nil,
			expectedErrMsg:  "",
		},
		{
			name:            "RemoveOasExtensions is true, GetConfig returns error",
			removeOasExt:    true,
			packageId:       "test-pkg",
			mockConfig:      nil,
			mockErr:         fmt.Errorf("config not found"),
			expectedAllowed: nil,
			expectedErrMsg:  "failed to get package test-pkg config: config not found",
		},
		{
			name:         "RemoveOasExtensions is true, GetConfig returns config with allowed extensions",
			removeOasExt: true,
			packageId:    "test-pkg",
			mockConfig: &view.PackageExportConfig{
				AllowedOasExtensions: []view.AllowedOASExtEnriched{
					{OasExtension: "x-ext1", PackageId: "a", PackageName: "a", PackageKind: "package"},
					{OasExtension: "x-ext2", PackageId: "a", PackageName: "a", PackageKind: "package"},
				},
			},
			mockErr:         nil,
			expectedAllowed: &[]string{"x-ext1", "x-ext2"},
			expectedErrMsg:  "",
		},
		{
			name:         "RemoveOasExtensions is true, GetConfig returns config with empty allowed extensions",
			removeOasExt: true,
			packageId:    "test-pkg",
			mockConfig: &view.PackageExportConfig{
				AllowedOasExtensions: []view.AllowedOASExtEnriched{},
			},
			mockErr:         nil,
			expectedAllowed: &[]string{},
			expectedErrMsg:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockPackageExportConfig := &mockPackageExportConfigService{
				GetConfigFunc: func(packageId string) (*view.PackageExportConfig, error) {
					if tt.removeOasExt && tt.name != "RemoveOasExtensions is false" {
						assert.Equal(t, tt.packageId, packageId, "packageId should match")
					}
					return tt.mockConfig, tt.mockErr
				},
			}

			if !tt.removeOasExt && tt.name == "RemoveOasExtensions is false" {
				mockPackageExportConfig.GetConfigFunc = func(packageId string) (*view.PackageExportConfig, error) {
					t.Fatal("GetConfig should not be called when removeOasExtensions is false")
					return nil, nil
				}
			}

			service := &exportServiceImpl{
				packageExportConfigService: mockPackageExportConfig,
			}

			allowed, err := service.makeAllowedOasExtensions(tt.removeOasExt, tt.packageId)

			if tt.expectedErrMsg != "" {
				assert.ErrorContains(t, err, tt.expectedErrMsg, "Error message should match")
			} else {
				assert.NoError(t, err, "Expected no error")
			}

			if tt.expectedAllowed == nil {
				assert.Nil(t, allowed, "Expected allowedOasExtensions to be nil")
			} else {
				assert.NotNil(t, allowed, "Expected allowedOasExtensions to be non-nil")
				assert.ElementsMatch(t, *tt.expectedAllowed, *allowed, "Allowed extensions should match")
			}
		})
	}
}

type mockPackageExportConfigService struct {
	GetConfigFunc func(packageId string) (*view.PackageExportConfig, error)
}

func (m mockPackageExportConfigService) GetConfig(packageId string) (*view.PackageExportConfig, error) {
	return m.GetConfigFunc(packageId)
}

func (m mockPackageExportConfigService) SetConfig(packageId string, AllowedOasExtensions []string) error {
	return nil
}
