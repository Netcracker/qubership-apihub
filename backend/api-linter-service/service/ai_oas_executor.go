package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/config"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	log "github.com/sirupsen/logrus"
)

type AiOasExecutor interface {
	LintOperationForDoc(ctx context.Context, operationId string, operationData string, rulesetData view.AiRuleset) ([]issueWithResolvedPath, []entity.AiRequestMetrics, error)
	DeduplicateIssues(ctx context.Context, groups []issueGroup) (map[int]int, []entity.AiDeduplicationRequestStats, error)
	GetLinterVersion() string
}

func NewAiOasExecutor(systemInfoService SystemInfoService) (AiOasExecutor, error) {
	var llmCl client.LLMClient
	var err error
	if systemInfoService.IsAiOasLinterEnabled() {
		llmCl, err = client.NewOpenaiClient(
			systemInfoService.GetOpenAIAPIKey(),
			systemInfoService.GetOpenAIModel(),
			systemInfoService.GetOpenAIAPIProxy(),
			systemInfoService.GetOpenAIRateLimitRPS(),
			systemInfoService.GetOpenAIRateLimitBurst(),
			systemInfoService.GetOpenAIMaxConcurrentRequests(),
			systemInfoService.GetOpenAIMaxRetries(),
			systemInfoService.GetOpenAIExtraBodyJSON())
		if err != nil {
			return nil, err
		}
	} else {
		llmCl = client.NewStubLlmClient()
	}

	return &aiOasExecutor{
		llmClient:         llmCl,
		lintConfig:        systemInfoService.GetAiLinterLintConfig(),
		issueDeduplicator: newAiIssueDeduplicator(llmCl, systemInfoService.GetAiLinterDeduplicationConfig()),
	}, nil
}

type aiOasExecutor struct {
	llmClient         client.LLMClient
	lintConfig        config.AILintConfig
	issueDeduplicator *aiIssueDeduplicator
}

func (s *aiOasExecutor) LintOperationForDoc(ctx context.Context, operationId string, operationData string, rulesetData view.AiRuleset) ([]issueWithResolvedPath, []entity.AiRequestMetrics, error) {
	var src any
	if err := json.Unmarshal([]byte(operationData), &src); err != nil {
		return nil, nil, fmt.Errorf("AI lint of operation %s: %w", operationId, err)
	}

	estimatedPromptTokens := estimateTokens(len(rulesetData.Prompt) + len(operationData))
	maxAttempts := 1 + s.lintConfig.MaxRetriesOnInvalidOutput
	var requests []entity.AiRequestMetrics
	var issues []view.AiValidationIssue
	for attempt := 1; ; attempt++ {
		attemptIssues, report, err := s.llmClient.LintOasDocument(ctx, operationData, rulesetData.Prompt, s.lintConfig.MaxCompletionTokens)
		requests = append(requests, newAiRequestMetrics(report, estimatedPromptTokens, err))
		if err == nil {
			issues = attemptIssues
			break
		}
		// A cancelled request may carry the error of the sibling request that caused the cancellation, so the
		// context is checked before the error code.
		code := aiErrorCode(err)
		retryable := code == exception.AiOutputLengthExceeded || code == exception.AiMalformedOutput
		if ctx.Err() != nil || !retryable {
			return nil, requests, fmt.Errorf("AI lint of operation %s: %w", operationId, err)
		}
		warning := fmt.Sprintf("AI lint of operation %s: attempt %d of %d failed with %s", operationId, attempt, maxAttempts, client.SanitiseErrorText(err.Error()))
		if report.Usage != nil {
			warning += fmt.Sprintf(", finish_reason=%s, completion tokens %d", report.FinishReason, report.Usage.CompletionTokens)
		}
		log.Warn(warning)
		if attempt == maxAttempts {
			return nil, requests, fmt.Errorf("AI lint of operation %s still fails after %d retries: %w", operationId, s.lintConfig.MaxRetriesOnInvalidOutput, err)
		}
	}

	var result []issueWithResolvedPath
	for _, iss := range issues {
		path := normaliseIssuePath(iss.Path)
		resolvedPath, resolved := resolveIssuePath(src, path)
		if !resolved {
			continue
		}
		result = append(result, issueWithResolvedPath{
			Issue: view.ValidationIssue{
				Path:     path,
				Code:     iss.Code,
				Severity: iss.Severity,
				Message:  iss.Message,
			},
			ResolvedPath: resolvedPath,
		})
	}
	return result, requests, nil
}

const (
	jsonPointerRoot = "#"
	jsonPathRoot    = "$"
)

// normaliseIssuePath drops one leading "#" or "$" segment. The model sometimes writes paths with a JSON Pointer or
// JSONPath root, while the operation data is rooted at the document root and has no such key. The returned slice
// shares the backing array with path, so the caller's slice is not modified.
func normaliseIssuePath(path []string) []string {
	if len(path) > 0 && (path[0] == jsonPointerRoot || path[0] == jsonPathRoot) {
		return path[1:]
	}
	return path
}

// resolveIssuePath returns the issue path when it resolves in the operation data, otherwise its parent path when that
// resolves. resolved is false when neither does. The document root is never used as a parent path.
func resolveIssuePath(src any, path []string) ([]string, bool) {
	if pathResolves(src, path) {
		return path, true
	}
	if len(path) > 1 && pathResolves(src, path[:len(path)-1]) {
		return path[:len(path)-1], true
	}
	log.Warnf("Incorrect path generated by AI linter: neither %v nor its parent exists in the operation data", path)
	return nil, false
}

// pathResolves walks the decoded JSON value along path. A segment is an object key when the current node is an
// object and an array index when it is an array, so a numeric segment such as the response code "200" resolves
// as a key.
func pathResolves(node any, path []string) bool {
	for _, segment := range path {
		switch value := node.(type) {
		case map[string]any:
			child, exists := value[segment]
			if !exists {
				return false
			}
			node = child
		case []any:
			index, err := strconv.Atoi(segment)
			if err != nil || index < 0 || index >= len(value) || strconv.Itoa(index) != segment {
				return false
			}
			node = value[index]
		default:
			return false
		}
	}
	return true
}

func (s *aiOasExecutor) DeduplicateIssues(ctx context.Context, groups []issueGroup) (map[int]int, []entity.AiDeduplicationRequestStats, error) {
	return s.issueDeduplicator.findDuplicates(ctx, groups)
}

func (s *aiOasExecutor) GetLinterVersion() string {
	return "1.1"
}
