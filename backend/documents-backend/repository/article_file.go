package repository

import (
	"context"
	"errors"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/go-pg/pg/v10"
)

// ArticleFileRepository manages file metadata; bytes are in FileDataRepository. Methods taking tx run inside it
// when tx != nil. Delete methods return the removed rows so callers can garbage-collect their checksums.
type ArticleFileRepository interface {
	GetArticleFile(ctx context.Context, articleId string, path string) (*entity.ArticleFileEntity, error)
	// GetArticleFiles returns the files of the given articles keyed by article id, ordered by path.
	GetArticleFiles(ctx context.Context, articleIds []string) (map[string][]entity.ArticleFileEntity, error)
	// CreateArticleFile fails when (article_id, path) is taken.
	CreateArticleFile(ctx context.Context, tx *pg.Tx, ent *entity.ArticleFileEntity) error
	// UpsertArticleFile inserts or replaces by (article_id, path), keeping id and creation audit of an existing row.
	UpsertArticleFile(ctx context.Context, tx *pg.Tx, ent *entity.ArticleFileEntity) error
	DeleteArticleFile(ctx context.Context, tx *pg.Tx, articleId string, path string) (*entity.ArticleFileEntity, error)
	DeleteArticleFiles(ctx context.Context, tx *pg.Tx, articleId string) ([]entity.ArticleFileEntity, error)
}

func NewArticleFileRepositoryPG(cp db.ConnectionProvider) ArticleFileRepository {
	return &articleFileRepositoryImpl{cp: cp}
}

type articleFileRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r articleFileRepositoryImpl) GetArticleFile(ctx context.Context, articleId string, path string) (*entity.ArticleFileEntity, error) {
	result := new(entity.ArticleFileEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).Where("article_id = ?", articleId).Where("path = ?", path).First()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func (r articleFileRepositoryImpl) GetArticleFiles(ctx context.Context, articleIds []string) (map[string][]entity.ArticleFileEntity, error) {
	result := map[string][]entity.ArticleFileEntity{}
	if len(articleIds) == 0 {
		return result, nil
	}
	rows := make([]entity.ArticleFileEntity, 0)
	err := r.cp.GetConnection().WithContext(ctx).Model(&rows).
		WhereIn("article_id IN (?)", articleIds).Order("path ASC").Select()
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ArticleId] = append(result[row.ArticleId], row)
	}
	return result, nil
}

func (r articleFileRepositoryImpl) CreateArticleFile(ctx context.Context, tx *pg.Tx, ent *entity.ArticleFileEntity) error {
	_, err := connOrTx(r.cp, ctx, tx).ModelContext(ctx, ent).Insert()
	return err
}

func (r articleFileRepositoryImpl) UpsertArticleFile(ctx context.Context, tx *pg.Tx, ent *entity.ArticleFileEntity) error {
	_, err := connOrTx(r.cp, ctx, tx).ModelContext(ctx, ent).
		OnConflict("(article_id, path) DO UPDATE").
		Set("content_type = EXCLUDED.content_type, size = EXCLUDED.size, checksum = EXCLUDED.checksum").
		Insert()
	return err
}

func (r articleFileRepositoryImpl) DeleteArticleFile(ctx context.Context, tx *pg.Tx, articleId string, path string) (*entity.ArticleFileEntity, error) {
	deleted := make([]entity.ArticleFileEntity, 0, 1)
	_, err := connOrTx(r.cp, ctx, tx).ModelContext(ctx, &deleted).
		Where("article_id = ?", articleId).Where("path = ?", path).Returning("*").Delete()
	if err != nil {
		return nil, err
	}
	if len(deleted) == 0 {
		return nil, nil
	}
	return &deleted[0], nil
}

func (r articleFileRepositoryImpl) DeleteArticleFiles(ctx context.Context, tx *pg.Tx, articleId string) ([]entity.ArticleFileEntity, error) {
	deleted := make([]entity.ArticleFileEntity, 0)
	_, err := connOrTx(r.cp, ctx, tx).ModelContext(ctx, &deleted).
		Where("article_id = ?", articleId).Returning("*").Delete()
	if err != nil {
		return nil, err
	}
	return deleted, nil
}
