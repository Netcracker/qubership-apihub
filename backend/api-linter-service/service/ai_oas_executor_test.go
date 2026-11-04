package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/config"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	log "github.com/sirupsen/logrus"
	logtest "github.com/sirupsen/logrus/hooks/test"
)

const (
	testLintCompletionTokens = 12000
	testLintOperationId      = "list-pets"
)

var (
	testLintConfig = config.AILintConfig{MaxCompletionTokens: testLintCompletionTokens, MaxRetriesOnInvalidOutput: 2}

	errOutputLength    error = &exception.CustomError{Code: exception.AiOutputLengthExceeded, Message: exception.AiOutputLengthExceededMsg}
	errMalformedOutput error = &exception.CustomError{Code: exception.AiMalformedOutput, Message: exception.AiMalformedOutputMsg}
	errContextLength   error = &exception.CustomError{Code: exception.AiContextLengthExceeded, Message: exception.AiContextLengthExceededMsg}
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
	llm := &fakeLlmClient{lint: func(context.Context, string) ([]view.AiValidationIssue, error) {
		return []view.AiValidationIssue{
			{Path: []string{"#", "paths", "/pets", "get", "description"}, Code: "rooted", Severity: "warning", Message: "m1"},
			{Path: []string{"paths", "/pets", "get", "descr"}, Code: "hallucinated", Severity: "warning", Message: "m2"},
			{Path: []string{"paths", "/missing", "get"}, Code: "unresolved", Severity: "warning", Message: "m3"},
		}, nil
	}}
	executor := &aiOasExecutor{llmClient: llm, lintConfig: testLintConfig}

	issues, requests, err := executor.LintOperationForDoc(context.Background(), testLintOperationId, operationData, view.AiRuleset{Prompt: "p"})
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
	if len(requests) != 1 || requests[0].ProviderAttempts != 1 || requests[0].Model != testModelName ||
		requests[0].EstimatedPromptTokens != estimateTokens(len("p")+len(operationData)) {
		t.Fatalf("expected the metrics of one request, got %+v", requests)
	}
	if len(llm.lintLimits) != 1 || llm.lintLimits[0] != testLintCompletionTokens {
		t.Fatalf("expected the configured completion limit %d, got %v", testLintCompletionTokens, llm.lintLimits)
	}
}

func TestLintOperationForDocRetries(t *testing.T) {
	const operationData = `{"paths":{"/pets":{"get":{"description":"List pets"}}}}`
	issue := view.AiValidationIssue{Path: []string{"paths", "/pets", "get", "description"}, Code: "vague", Severity: "warning", Message: "m"}
	const modelOutputKey = "sk-abcdefghij0123456789"
	tests := []struct {
		name         string
		retries      int
		cancelled    bool
		errs         []error
		wantClasses  []entity.AiRequestErrorClass
		wantErr      error
		wantRetries  bool
		wantWarnings int
	}{
		{
			name:         "second attempt succeeds",
			retries:      2,
			errs:         []error{errOutputLength},
			wantClasses:  []entity.AiRequestErrorClass{entity.AiRequestErrorClassOutputLength, ""},
			wantWarnings: 1,
		},
		{
			name:         "retries exhausted",
			retries:      2,
			errs:         []error{errOutputLength, errOutputLength, errOutputLength},
			wantClasses:  []entity.AiRequestErrorClass{entity.AiRequestErrorClassOutputLength, entity.AiRequestErrorClassOutputLength, entity.AiRequestErrorClassOutputLength},
			wantErr:      errOutputLength,
			wantRetries:  true,
			wantWarnings: 3,
		},
		{
			name:        "context length is not retried",
			retries:     2,
			errs:        []error{errContextLength},
			wantClasses: []entity.AiRequestErrorClass{entity.AiRequestErrorClassContextLength},
			wantErr:     errContextLength,
		},
		{
			name:         "malformed output is retried and its secret is not logged",
			retries:      2,
			errs:         []error{fmt.Errorf("%w (content prefix=%q)", errMalformedOutput, modelOutputKey)},
			wantClasses:  []entity.AiRequestErrorClass{entity.AiRequestErrorClassValidation, ""},
			wantWarnings: 1,
		},
		{
			name:        "cancelled request is not retried",
			retries:     2,
			cancelled:   true,
			errs:        []error{fmt.Errorf("%w: %w", context.Canceled, errOutputLength)},
			wantClasses: []entity.AiRequestErrorClass{entity.AiRequestErrorClassCancelled},
			wantErr:     context.Canceled,
		},
		{
			name:         "zero retries sends once",
			retries:      0,
			errs:         []error{errOutputLength},
			wantClasses:  []entity.AiRequestErrorClass{entity.AiRequestErrorClassOutputLength},
			wantErr:      errOutputLength,
			wantRetries:  true,
			wantWarnings: 1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := log.StandardLogger()
			previousHooks := logger.ReplaceHooks(make(log.LevelHooks))
			t.Cleanup(func() { logger.ReplaceHooks(previousHooks) })
			hook := logtest.NewLocal(logger)
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			calls := 0
			llm := &fakeLlmClient{lint: func(context.Context, string) ([]view.AiValidationIssue, error) {
				if tt.cancelled {
					cancel()
				}
				calls++
				if calls <= len(tt.errs) {
					return nil, tt.errs[calls-1]
				}
				return []view.AiValidationIssue{issue}, nil
			}}
			executor := &aiOasExecutor{llmClient: llm, lintConfig: config.AILintConfig{MaxCompletionTokens: testLintCompletionTokens, MaxRetriesOnInvalidOutput: tt.retries}}

			issues, requests, err := executor.LintOperationForDoc(ctx, testLintOperationId, operationData, view.AiRuleset{Prompt: "p"})

			var classes []entity.AiRequestErrorClass
			for _, request := range requests {
				classes = append(classes, request.ErrorClass)
				if (request.ErrorClass == "") != (request.ErrorMessage == "") {
					t.Errorf("expected an error message only for a failure, got %+v", request)
				}
			}
			if !reflect.DeepEqual(classes, tt.wantClasses) {
				t.Fatalf("expected request error classes %q, got %q", tt.wantClasses, classes)
			}
			warnings := 0
			for _, entry := range hook.AllEntries() {
				if entry.Level == log.WarnLevel && strings.HasPrefix(entry.Message, "AI lint of operation "+testLintOperationId) {
					warnings++
				}
				if strings.Contains(entry.Message, modelOutputKey) {
					t.Errorf("expected the secret to be redacted in the log, got %q", entry.Message)
				}
			}
			if warnings != tt.wantWarnings {
				t.Fatalf("expected %d warnings for failed attempts, got %d", tt.wantWarnings, warnings)
			}
			if tt.wantErr == nil {
				if err != nil || len(issues) != 1 || issues[0].Issue.Code != issue.Code {
					t.Fatalf("expected the issue of the last attempt, got %+v, %v", issues, err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) || !strings.Contains(err.Error(), "AI lint of operation "+testLintOperationId) || issues != nil {
				t.Fatalf("expected %v for operation %s, got %+v, %v", tt.wantErr, testLintOperationId, issues, err)
			}
			if wantText := fmt.Sprintf("still fails after %d retries", tt.retries); strings.Contains(err.Error(), wantText) != tt.wantRetries {
				t.Fatalf("expected %q in the error only when retries are exhausted, got %v", wantText, err)
			}
		})
	}
}
