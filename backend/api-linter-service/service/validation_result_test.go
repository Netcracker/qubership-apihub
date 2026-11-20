package service

import (
	"context"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

func TestGetValidationResultKeepsSiblingLinterWhenOneResultIsMissing(t *testing.T) {
	spectralData := []byte(`[{"code":"info-contact","path":["info"],"message":"contact is missing","severity":1}]`)
	svc := validationServiceWithDocs(
		[]entity.LintedDocument{
			lintedDoc("spectral-rs", "hash-s", view.StatusSuccess, ""),
			lintedDoc("ai-rs", "hash-a", view.StatusSuccess, ""),
		},
		map[string]*entity.Ruleset{
			"spectral-rs": ruleset("spectral-rs", view.SpectralLinter),
			"ai-rs":       ruleset("ai-rs", view.AiLinter),
		},
		map[string]*entity.LintFileResult{
			"hash-s|spectral-rs": {Data: spectralData},
		},
	)

	result, err := svc.GetValidationResult(context.Background(), "pkg", "0000.1@1", "public-api")
	if err != nil {
		t.Fatalf("GetValidationResult returned error: %v", err)
	}
	if result == nil {
		t.Fatal("GetValidationResult returned nil result")
	}
	if len(result.Results) != 2 {
		t.Fatalf("results length = %d, want 2", len(result.Results))
	}

	spectral := resultByLinter(t, result.Results, view.SpectralLinter)
	if spectral.Status != view.StatusSuccess {
		t.Fatalf("spectral status = %s, want success", spectral.Status)
	}
	if len(spectral.Issues) != 1 || spectral.Issues[0].Severity != "warning" {
		t.Fatalf("spectral issues = %+v, want one warning", spectral.Issues)
	}

	ai := resultByLinter(t, result.Results, view.AiLinter)
	if ai.Status != view.StatusError {
		t.Fatalf("ai status = %s, want error", ai.Status)
	}
	if ai.Details != "lint result is missing" {
		t.Fatalf("ai details = %q", ai.Details)
	}
	if len(ai.Issues) != 0 {
		t.Fatalf("ai issues = %+v, want empty", ai.Issues)
	}
}

func TestGetValidationResultIncludesFailedLinter(t *testing.T) {
	aiData := []byte(`[{"path":["paths","/pets"],"code":"ai-rule","severity":"error","message":"broken"}]`)
	svc := validationServiceWithDocs(
		[]entity.LintedDocument{
			lintedDoc("spectral-rs", "hash-s", view.StatusError, "error linting doc with spectral: timeout"),
			lintedDoc("ai-rs", "hash-a", view.StatusSuccess, ""),
		},
		map[string]*entity.Ruleset{
			"spectral-rs": ruleset("spectral-rs", view.SpectralLinter),
			"ai-rs":       ruleset("ai-rs", view.AiLinter),
		},
		map[string]*entity.LintFileResult{
			"hash-a|ai-rs": {Data: aiData},
		},
	)

	result, err := svc.GetValidationResult(context.Background(), "pkg", "0000.1@1", "public-api")
	if err != nil {
		t.Fatalf("GetValidationResult returned error: %v", err)
	}
	if result == nil || len(result.Results) != 2 {
		t.Fatalf("result = %+v, want two linter results", result)
	}

	spectral := resultByLinter(t, result.Results, view.SpectralLinter)
	if spectral.Status != view.StatusError || spectral.Details != "error linting doc with spectral: timeout" {
		t.Fatalf("spectral result = %+v", spectral)
	}
	if len(spectral.Issues) != 0 {
		t.Fatalf("spectral issues = %+v, want empty", spectral.Issues)
	}

	ai := resultByLinter(t, result.Results, view.AiLinter)
	if ai.Status != view.StatusSuccess || len(ai.Issues) != 1 || ai.Issues[0].Severity != "error" {
		t.Fatalf("ai result = %+v", ai)
	}
}

func validationServiceWithDocs(docs []entity.LintedDocument, rulesets map[string]*entity.Ruleset, results map[string]*entity.LintFileResult) *validationServiceImpl {
	return &validationServiceImpl{
		versionResultRepository: stubVersionResultRepo{docs: docs},
		rulesetRepository:       stubRulesetRepo{byID: rulesets},
		lintResultRepository:    stubLintResultRepo{byKey: results},
	}
}

func lintedDoc(rulesetID, dataHash string, status view.LintedDocumentStatus, details string) entity.LintedDocument {
	return entity.LintedDocument{
		PackageId:         "pkg",
		Version:           "0000.1",
		Revision:          1,
		FileId:            "public-api.yaml",
		Slug:              "public-api",
		SpecificationType: view.OpenAPI30Type,
		RulesetId:         rulesetID,
		DataHash:          dataHash,
		LintStatus:        status,
		LintDetails:       details,
	}
}

func ruleset(id string, linter view.Linter) *entity.Ruleset {
	return &entity.Ruleset{
		Id:       id,
		Name:     id,
		Linter:   linter,
		ApiType:  view.OpenAPI30Type,
		FileName: id + ".yaml",
	}
}

func resultByLinter(t *testing.T, results []view.LinterResult, linter view.Linter) view.LinterResult {
	t.Helper()
	for _, result := range results {
		if result.Linter == linter {
			return result
		}
	}
	t.Fatalf("linter %s not found in %+v", linter, results)
	return view.LinterResult{}
}

type stubVersionResultRepo struct {
	docs []entity.LintedDocument
}

func (s stubVersionResultRepo) GetLintedVersion(context.Context, string, string, int) (*entity.LintedVersion, error) {
	return nil, nil
}

func (s stubVersionResultRepo) GetVersionAndDocsSummary(context.Context, string, string, int) (*entity.LintedVersion, []entity.LintedDocument, error) {
	return nil, nil, nil
}

func (s stubVersionResultRepo) GetLintedDocuments(context.Context, string, string, int, string) ([]entity.LintedDocument, error) {
	return s.docs, nil
}

type stubRulesetRepo struct {
	byID map[string]*entity.Ruleset
}

func (s stubRulesetRepo) CreateRuleset(context.Context, entity.RulesetWithData) error { return nil }
func (s stubRulesetRepo) ActivateRuleset(context.Context, string, string) error       { return nil }
func (s stubRulesetRepo) ListRulesets(context.Context) ([]entity.Ruleset, error) {
	return nil, nil
}
func (s stubRulesetRepo) GetActiveRulesets(context.Context, view.ApiType) (map[view.Linter]entity.Ruleset, error) {
	return nil, nil
}
func (s stubRulesetRepo) GetRulesetById(_ context.Context, id string) (*entity.Ruleset, error) {
	return s.byID[id], nil
}
func (s stubRulesetRepo) RulesetExists(context.Context, string, view.ApiType) (bool, error) {
	return false, nil
}
func (s stubRulesetRepo) GetRulesetWithData(context.Context, string) (*entity.RulesetWithData, error) {
	return nil, nil
}
func (s stubRulesetRepo) GetActivationHistory(context.Context, string) ([]entity.RulesetActivationHistory, error) {
	return nil, nil
}
func (s stubRulesetRepo) DeleteRuleset(context.Context, string) error { return nil }

type stubLintResultRepo struct {
	byKey map[string]*entity.LintFileResult
}

func (s stubLintResultRepo) GetLintResultSummary(context.Context, string, string) (*entity.LintFileResultSummary, error) {
	return nil, nil
}

func (s stubLintResultRepo) GetLintResult(_ context.Context, dataHash string, rulesetID string) (*entity.LintFileResult, error) {
	return s.byKey[dataHash+"|"+rulesetID], nil
}
