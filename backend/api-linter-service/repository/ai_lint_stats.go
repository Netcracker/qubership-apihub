package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/db"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
)

type AiLintStatsRepository interface {
	Save(ctx context.Context, stats entity.AiLintStats) error
}

func NewAiLintStatsRepository(cp db.ConnectionProvider) AiLintStatsRepository {
	return &aiLintStatsRepositoryImpl{cp: cp}
}

type aiLintStatsRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (a aiLintStatsRepositoryImpl) Save(ctx context.Context, stats entity.AiLintStats) error {
	if _, err := a.cp.GetConnection().WithContext(ctx).Model(&stats).Insert(); err != nil {
		return fmt.Errorf("failed to insert AI lint stats for stage %s of doc task %s: %w", stats.Stage, stats.DocumentLintTaskId, err)
	}
	return nil
}
