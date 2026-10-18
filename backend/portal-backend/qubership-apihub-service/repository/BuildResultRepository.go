package repository

import (
	"context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
	"github.com/pkg/errors"
)

type BuildResultRepository interface {
	StoreBuildResult(ctx context.Context, ent entity.BuildResultEntity) error
	GetBuildResult(ctx context.Context, buildId string) (*entity.BuildResultEntity, error)
	GetBuildResultWithOffset(ctx context.Context, offset int) (*entity.BuildResultEntity, error)
	DeleteBuildResults(ctx context.Context, buildIds []string) error
}

func NewBuildResultRepository(cp db.ConnectionProvider) BuildResultRepository {
	return &buildResultRepositoryImpl{cp: cp}
}

type buildResultRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b buildResultRepositoryImpl) GetBuildResult(ctx context.Context, buildId string) (*entity.BuildResultEntity, error) {
	result := new(entity.BuildResultEntity)
	err := b.cp.GetConnection().WithContext(ctx).Model(result).
		Where("build_id = ?", buildId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b buildResultRepositoryImpl) StoreBuildResult(ctx context.Context, ent entity.BuildResultEntity) error {
	_, err := b.cp.GetConnection().WithContext(ctx).Model(&ent).Insert()
	if err != nil {
		return err
	}
	return nil

}

func (b buildResultRepositoryImpl) GetBuildResultWithOffset(ctx context.Context, offset int) (*entity.BuildResultEntity, error) {
	result := new(entity.BuildResultEntity)
	err := b.cp.GetConnection().WithContext(ctx).Model(result).Offset(offset).Limit(1).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (b buildResultRepositoryImpl) DeleteBuildResults(ctx context.Context, buildIds []string) error {
	var deletedRows int
	err := b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		query := `delete from build_result
		where build_id in (?)`
		result, err := tx.Exec(query, pg.In(buildIds))
		if err != nil {
			return err
		}
		deletedRows += result.RowsAffected()
		return nil
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete rows from table build_result")
	}

	if deletedRows > 0 {
		_, err = b.cp.GetConnection().WithContext(ctx).Exec("vacuum full build_result")
		if err != nil {
			return errors.Wrap(err, "failed to run vacuum for table build_result")
		}
	}
	return nil
}
