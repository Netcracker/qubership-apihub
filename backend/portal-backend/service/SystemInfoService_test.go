package service

import (
	"encoding/json"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/config"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidationRulesSeverity(t *testing.T) {
	tests := []struct {
		name                  string
		failBuildOnBrokenRefs bool
		expectedBrokenRefs    string
	}{
		{
			name:                  "failBuildOnBrokenRefs is true",
			failBuildOnBrokenRefs: true,
			expectedBrokenRefs:    view.BrokenRefsSeverityError,
		},
		{
			name:                  "failBuildOnBrokenRefs is false",
			failBuildOnBrokenRefs: false,
			expectedBrokenRefs:    view.BrokenRefsSeverityWarning,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			systemInfoService := &systemInfoServiceImpl{
				config: config.Config{
					BusinessParameters: config.BusinessParameters{FailBuildOnBrokenRefs: tt.failBuildOnBrokenRefs},
				},
			}
			expected := view.ValidationRulesSeverity{BrokenRefs: tt.expectedBrokenRefs}

			assert.Equal(t, expected, systemInfoService.GetValidationRulesSeverity())
			assert.Equal(t, expected, systemInfoService.GetSystemInfo().ValidationRulesSeverity)

			buildService := &buildServiceImpl{systemInfoService: systemInfoService}
			buildConfig := buildService.setValidationRulesSeverity(view.BuildConfig{PackageId: "pkg"})
			assert.Equal(t, expected, buildConfig.ValidationRulesSeverity)

			systemInfoJson, err := json.Marshal(systemInfoService.GetSystemInfo())
			require.NoError(t, err)
			var decoded map[string]interface{}
			require.NoError(t, json.Unmarshal(systemInfoJson, &decoded))
			assert.Equal(t, map[string]interface{}{"brokenRefs": tt.expectedBrokenRefs}, decoded["validationRulesSeverity"])
		})
	}
}
