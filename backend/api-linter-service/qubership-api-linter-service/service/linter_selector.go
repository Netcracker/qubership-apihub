package service

import (
	"context"
	"strings"

	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/view"
	log "github.com/sirupsen/logrus"
)

type LinterSelectorService interface {
	SelectLintersAndRuleset(ctx context.Context, t view.ApiType, packageId string) []view.LinterAndRuleset
}

type linterSelectorServiceImpl struct {
	repo                repository.RulesetRepository
	linterConfigService LinterConfigService
}

func (l linterSelectorServiceImpl) SelectLintersAndRuleset(ctx context.Context, t view.ApiType, packageId string) []view.LinterAndRuleset {
	rulesets, err := l.repo.GetActiveRulesets(ctx, t)
	if err != nil {
		return []view.LinterAndRuleset{{
			Linter:    view.UnknownLinter,
			RulesetId: "",
			Err:       err,
		}}
	}

	result := make([]view.LinterAndRuleset, 0)
	for _, cfg := range l.linterConfigService.GetInternalLinterConfigs() {
		if !containsApiType(cfg.ApiTypes, t) {
			continue
		}
		if !l.isLinterEnabled(cfg.Linter) {
			log.Tracef("Linter %s is disabled and not applied for api type %s ", cfg.Linter, cfg.ApiTypes)
			continue
		}
		if !l.isPackageAllowedForLinter(packageId, cfg.Linter) {
			log.Tracef("Linter %s is not applied for api type %s because package %s is not in allowed list", cfg.Linter, cfg.ApiTypes, packageId)
			continue
		}
		rsId := ""
		if rs, exists := rulesets[cfg.Linter]; exists {
			rsId = rs.Id
		}
		if rsId != "" {
			result = append(result, view.LinterAndRuleset{
				Linter:    cfg.Linter,
				RulesetId: rsId,
				Err:       nil,
			})
		} else {
			log.Tracef("Linter %s is suitable for api type %s but no ruleset found", cfg.Linter, cfg.ApiTypes)
		}
	}

	if len(result) == 0 {
		result = append(result, view.LinterAndRuleset{
			Linter:    view.UnknownLinter,
			RulesetId: "",
			Err:       nil,
		})
	}

	return result
}

func containsApiType(apiTypes []view.ApiType, t view.ApiType) bool {
	for _, at := range apiTypes {
		if at == t {
			return true
		}
	}
	return false
}

func (l linterSelectorServiceImpl) isLinterEnabled(linter view.Linter) bool {
	cfg, ok := l.linterConfigService.GetConfigForLinter(linter)
	return ok && cfg.Enabled
}

func (l linterSelectorServiceImpl) isPackageAllowedForLinter(packageId string, linter view.Linter) bool {
	cfg, ok := l.linterConfigService.GetConfigForLinter(linter)
	if !ok {
		return false
	}
	if matchesAnyPattern(packageId, cfg.ExcludePackages) {
		return false
	}
	if len(cfg.IncludePackages) > 0 && !matchesAnyPattern(packageId, cfg.IncludePackages) {
		return false
	}
	return true
}

// matchesPackagePattern returns true if packageId matches the pattern.
// Pattern uses '.' as separator; '*' matches any number of segments (0 or more).
// Examples: "A.*" matches "A", "A.B", "A.B.C"; "A.B.*" matches "A.B", "A.B.C", "A.B.C.D"
func matchesPackagePattern(packageId, pattern string) bool {
	idParts := strings.Split(packageId, ".")
	patParts := strings.Split(pattern, ".")
	if len(patParts) == 0 {
		return len(idParts) == 0
	}
	if patParts[len(patParts)-1] == "*" {
		// Trailing *: match prefix, * matches any number of segments (including zero)
		if len(patParts) == 1 {
			return true // "*" matches everything
		}
		prefixLen := len(patParts) - 1
		if len(idParts) < prefixLen {
			return false
		}
		for i := 0; i < prefixLen; i++ {
			if idParts[i] != patParts[i] {
				return false
			}
		}
		return true
	}
	// No trailing wildcard: exact match
	if len(idParts) != len(patParts) {
		return false
	}
	for i := range idParts {
		if patParts[i] == "*" {
			continue
		}
		if idParts[i] != patParts[i] {
			return false
		}
	}
	return true
}

func matchesAnyPattern(packageId string, patterns []string) bool {
	for _, p := range patterns {
		if matchesPackagePattern(packageId, p) {
			return true
		}
	}
	return false
}

func NewLinterSelectorService(repo repository.RulesetRepository, linterConfigService LinterConfigService) LinterSelectorService {
	return &linterSelectorServiceImpl{
		repo:                repo,
		linterConfigService: linterConfigService,
	}
}
