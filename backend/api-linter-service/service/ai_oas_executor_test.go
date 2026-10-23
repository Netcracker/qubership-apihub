package service

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

func TestResolveIssuePath(t *testing.T) {
	const operationData = `{"paths":{"/pets":{"get":{
		"parameters":[{"name":"limit","in":"query"},{"name":"offset","in":"query"}],
		"responses":{"200":{"description":"OK"},"404":{}}
	}}}}`
	var src any
	if err := json.Unmarshal([]byte(operationData), &src); err != nil {
		t.Fatal(err)
	}
	getPath := []string{"paths", "/pets", "get"}
	path := func(segments ...string) []string {
		return append(append([]string{}, getPath...), segments...)
	}

	tests := []struct {
		name             string
		path             []string
		wantResolvedPath []string
		wantResolved     bool
	}{
		{"response code 200 is an object key", path("responses", "200"), path("responses", "200"), true},
		{"field under a response code", path("responses", "200", "description"), path("responses", "200", "description"), true},
		{"missing field under a response code falls back to the response", path("responses", "404", "description"), path("responses", "404"), true},
		{"array index", path("parameters", "1", "name"), path("parameters", "1", "name"), true},
		{"array index out of bounds falls back to the array", path("parameters", "2"), path("parameters"), true},
		{"field under an out of bounds array index is dropped", path("parameters", "5", "name"), nil, false},
		{"non-canonical array index falls back to the array", path("parameters", "01"), path("parameters"), true},
		{"key segment on an array falls back to the array", path("parameters", "name"), path("parameters"), true},
		{"hallucinated last segment falls back to the parent", path("descr"), getPath, true},
		{"segments below a scalar are dropped", path("responses", "200", "description", "x", "y"), nil, false},
		{"unknown parent is dropped", path("responses", "500", "description"), nil, false},
		{"unknown single segment is dropped", []string{"missing"}, nil, false},
		{"JSON Pointer root is removed", append([]string{"#"}, getPath...), getPath, true},
		{"JSONPath root is removed before the parent fallback", append([]string{"$"}, path("descr")...), getPath, true},
		{"only one root segment is removed", []string{"#", "#", "paths"}, nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resolvedPath, resolved := resolveIssuePath(src, normaliseIssuePath(tt.path))
			if resolved != tt.wantResolved || !reflect.DeepEqual(resolvedPath, tt.wantResolvedPath) {
				t.Fatalf("expected resolved path %v (resolved %t), got %v (resolved %t)", tt.wantResolvedPath, tt.wantResolved, resolvedPath, resolved)
			}
		})
	}
}

func TestLintOperationForDoc(t *testing.T) {
	const operationData = `{"paths":{"/pets":{"get":{"description":"List pets"}}}}`
	getPath := []string{"paths", "/pets", "get"}
	llm := &fakeLlmClient{lint: func(string) ([]view.AiValidationIssue, error) {
		return []view.AiValidationIssue{
			{Path: []string{"#", "paths", "/pets", "get", "description"}, Code: "rooted", Severity: "warning", Message: "m1"},
			{Path: []string{"paths", "/pets", "get", "descr"}, Code: "hallucinated", Severity: "warning", Message: "m2"},
			{Path: []string{"paths", "/missing", "get"}, Code: "unresolved", Severity: "warning", Message: "m3"},
		}, nil
	}}
	executor := &aiOasExecutor{llmClient: llm}

	issues, report, err := executor.LintOperationForDoc(context.Background(), operationData, view.AiRuleset{Prompt: "p"})
	if err != nil {
		t.Fatal(err)
	}

	want := []issueWithResolvedPath{
		{Issue: view.ValidationIssue{Path: append(getPath, "description"), Code: "rooted", Severity: "warning", Message: "m1"}, ResolvedPath: append(getPath, "description")},
		{Issue: view.ValidationIssue{Path: append(getPath, "descr"), Code: "hallucinated", Severity: "warning", Message: "m2"}, ResolvedPath: getPath},
	}
	if !reflect.DeepEqual(issues, want) {
		t.Fatalf("expected %+v, got %+v", want, issues)
	}
	if report.ProviderAttempts != 1 || report.Model != testModelName {
		t.Fatalf("expected the client report, got %+v", report)
	}
}
