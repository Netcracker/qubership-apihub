package repository

import (
	"context"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

// HomeArticleRepository stores the ordered home page list. Replace runs inside tx when tx != nil.
type HomeArticleRepository interface {
	GetAll(ctx context.Context) ([]entity.HomeArticleEntity, error)
	Replace(ctx context.Context, tx *pg.Tx, ents []entity.HomeArticleEntity) error
}

func NewHomeArticleRepositoryPG(cp db.ConnectionProvider) HomeArticleRepository {
	return &homeArticleRepositoryImpl{cp: cp}
}

type homeArticleRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r homeArticleRepositoryImpl) conn(ctx context.Context, tx *pg.Tx) orm.DB {
	if tx != nil {
		return tx
	}
	return r.cp.GetConnection().WithContext(ctx)
}

func (r homeArticleRepositoryImpl) GetAll(ctx context.Context) ([]entity.HomeArticleEntity, error) {
	result := make([]entity.HomeArticleEntity, 0)
	err := r.cp.GetConnection().WithContext(ctx).Model(&result).Order("display_order ASC").Select()
	return result, err
}

func (r homeArticleRepositoryImpl) Replace(ctx context.Context, tx *pg.Tx, ents []entity.HomeArticleEntity) error {
	conn := r.conn(ctx, tx)
	if _, err := conn.ModelContext(ctx, (*entity.HomeArticleEntity)(nil)).Where("TRUE").Delete(); err != nil {
		return err
	}
	if len(ents) == 0 {
		return nil
	}
	_, err := conn.ModelContext(ctx, &ents).Insert()
	return err
}
