package repository

import (
	"context"
	"errors"

	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/go-pg/pg/v10"
)

type ScoringRepository interface {
	GetScoringForVersion(ctx context.Context, packageId string, version string, revision int) (*entity.VersionScore, error)
}

func NewScoringRepository(cp db.ConnectionProvider) ScoringRepository {
	return &scoringRepositoryImpl{cp: cp}
}

type scoringRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (s scoringRepositoryImpl) GetScoringForVersion(ctx context.Context, packageId string, version string, revision int) (*entity.VersionScore, error) {
	var ent entity.VersionScore
	err := s.cp.GetConnection().ModelContext(ctx, &ent).
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		Select()
	if err != nil {
		if errors.As(err, &pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &ent, nil
}
