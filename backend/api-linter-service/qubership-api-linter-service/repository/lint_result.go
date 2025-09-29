package repository

import (
	"context"
	"database/sql"
	"errors"
	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/entity"
)

type LintResultRepository interface {
	GetLintResultSummary(ctx context.Context, dataHash string, rulesetId string) (*entity.LintFileResultSummary, error)
	GetLintResult(ctx context.Context, dataHash string, rulesetId string) (*entity.LintFileResult, error)
}

func NewLintResultRepository(cp db.ConnectionProvider) LintResultRepository {
	return &lintResultRepositoryImpl{cp: cp}
}

type lintResultRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (l lintResultRepositoryImpl) GetLintResultSummary(ctx context.Context, dataHash string, rulesetId string) (*entity.LintFileResultSummary, error) {
	var result entity.LintFileResultSummary
	err := l.cp.GetConnection().ModelContext(ctx, &result).
		Where("data_hash = ?", dataHash).
		Where("ruleset_id = ?", rulesetId).
		Select()
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (l lintResultRepositoryImpl) GetLintResult(ctx context.Context, dataHash string, rulesetId string) (*entity.LintFileResult, error) {
	var result entity.LintFileResult
	err := l.cp.GetConnection().ModelContext(ctx, &result).
		Where("data_hash = ?", dataHash).
		Where("ruleset_id = ?", rulesetId).
		Select()
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}
