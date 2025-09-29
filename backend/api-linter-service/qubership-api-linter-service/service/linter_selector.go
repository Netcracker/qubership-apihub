package service

import (
	"context"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/view"
)

type LinterSelectorService interface {
	SelectLinterAndRuleset(ctx context.Context, t view.ApiType) (view.Linter, string, error)
}

type linterSelectorServiceImpl struct {
	repo repository.RulesetRepository
}

func NewLinterSelectorService(repo repository.RulesetRepository) LinterSelectorService {
	return &linterSelectorServiceImpl{
		repo: repo,
	}
}

func (l linterSelectorServiceImpl) SelectLinterAndRuleset(ctx context.Context, t view.ApiType) (view.Linter, string, error) {
	var linter view.Linter
	var rulesetId string

	rulesets, err := l.repo.GetActiveRulesets(ctx, t)
	if err != nil {
		return view.UnknownLinter, "", err
	}

	switch t {
	case view.OpenAPI31Type, view.OpenAPI30Type, view.OpenAPI20Type:
		linter = view.SpectralLinter
		rs, exists := rulesets[linter]
		if !exists {
			return "", "", fmt.Errorf("no active ruleset found for api type %s and linter %s", t, linter)
		}
		rulesetId = rs.Id
		break
	default:
		// lint of this type is not supported now
		linter = view.UnknownLinter
	}

	return linter, rulesetId, nil
}
