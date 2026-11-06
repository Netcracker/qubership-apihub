package repository

import (
	"context"
	"errors"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

// FileDataRepository stores file bytes once per checksum. Rows are shared by every article_file with that checksum
// and removed by DeleteOrphanFileData once nothing references them.
type FileDataRepository interface {
	GetFileData(ctx context.Context, checksum string) (*entity.FileDataEntity, error)
	// UpsertFileData inserts the content unless the checksum is already stored. Runs inside tx when tx != nil.
	UpsertFileData(ctx context.Context, tx *pg.Tx, ent *entity.FileDataEntity) error
	// DeleteOrphanFileData removes the given checksums that no article_file references any more.
	DeleteOrphanFileData(ctx context.Context, tx *pg.Tx, checksums []string) error
}

func NewFileDataRepositoryPG(cp db.ConnectionProvider) FileDataRepository {
	return &fileDataRepositoryImpl{cp: cp}
}

type fileDataRepositoryImpl struct {
	cp db.ConnectionProvider
}

// connOrTx returns tx when set, otherwise a plain connection bound to ctx.
func connOrTx(cp db.ConnectionProvider, ctx context.Context, tx *pg.Tx) orm.DB {
	if tx != nil {
		return tx
	}
	return cp.GetConnection().WithContext(ctx)
}

func (r fileDataRepositoryImpl) GetFileData(ctx context.Context, checksum string) (*entity.FileDataEntity, error) {
	result := new(entity.FileDataEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).Where("checksum = ?", checksum).First()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func (r fileDataRepositoryImpl) UpsertFileData(ctx context.Context, tx *pg.Tx, ent *entity.FileDataEntity) error {
	_, err := connOrTx(r.cp, ctx, tx).ModelContext(ctx, ent).OnConflict("(checksum) DO NOTHING").Insert()
	return err
}

func (r fileDataRepositoryImpl) DeleteOrphanFileData(ctx context.Context, tx *pg.Tx, checksums []string) error {
	if len(checksums) == 0 {
		return nil
	}
	_, err := connOrTx(r.cp, ctx, tx).ModelContext(ctx, &entity.FileDataEntity{}).
		WhereIn("checksum IN (?)", checksums).
		Where("NOT EXISTS (SELECT 1 FROM article_file af WHERE af.checksum = file_data.checksum)").
		Delete()
	return err
}
