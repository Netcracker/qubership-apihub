// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package exception

import (
	"testing"
)

func TestCustomError_Error(t *testing.T) {
	tests := []struct {
		name     string
		message  string
		params   map[string]interface{}
		expected string
	}{
		{
			name:     "no parameters",
			message:  "Simple error message",
			params:   nil,
			expected: "Simple error message",
		},
		{
			name:     "single parameter",
			message:  "Error with $param",
			params:   map[string]interface{}{"param": "value"},
			expected: "Error with value",
		},
		{
			name:     "multiple parameters",
			message:  "Error with $param1 and $param2",
			params:   map[string]interface{}{"param1": "value1", "param2": "value2"},
			expected: "Error with value1 and value2",
		},
		{
			name:     "substring parameter names",
			message:  "Project $project and ProjectId $projectId",
			params:   map[string]interface{}{"project": "myproject", "projectId": "proj123"},
			expected: "Project myproject and ProjectId proj123",
		},
		{
			name:     "substring parameter names - reverse order",
			message:  "ProjectId $projectId and Project $project",
			params:   map[string]interface{}{"project": "myproject", "projectId": "proj123"},
			expected: "ProjectId proj123 and Project myproject",
		},
		{
			name:     "parameter at end of string",
			message:  "Error for $param",
			params:   map[string]interface{}{"param": "value"},
			expected: "Error for value",
		},
		{
			name:     "parameter with punctuation",
			message:  "Error: $param!",
			params:   map[string]interface{}{"param": "value"},
			expected: "Error: value!",
		},
		{
			name:     "parameter in quotes",
			message:  "Error '$param'",
			params:   map[string]interface{}{"param": "value"},
			expected: "Error 'value'",
		},
		{
			name:     "parameter with numbers",
			message:  "Agent $agentId and version $version123",
			params:   map[string]interface{}{"agentId": "agent1", "version123": "v1.0"},
			expected: "Agent agent1 and version v1.0",
		},
		{
			name:     "complex substring case",
			message:  "User $user, userId $userId, userIdInfo $userIdInfo",
			params:   map[string]interface{}{"user": "john", "userId": "123", "userIdInfo": "extra"},
			expected: "User john, userId 123, userIdInfo extra",
		},
		{
			name:     "parameter not found should remain unchanged",
			message:  "Error with $missing and $param",
			params:   map[string]interface{}{"param": "value"},
			expected: "Error with $missing and value",
		},
		{
			name:     "integer parameter value",
			message:  "Count is $count",
			params:   map[string]interface{}{"count": 42},
			expected: "Count is 42",
		},
		{
			name:     "boolean parameter value",
			message:  "Active: $active",
			params:   map[string]interface{}{"active": true},
			expected: "Active: true",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			customError := CustomError{
				Message: tt.message,
				Params:  tt.params,
			}
			result := customError.Error()
			if result != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}
