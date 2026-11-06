package repository

import (
	"context"
	"errors"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

// ArticleSearchQuery narrows a list. Visibilities empty = no visibility restriction (admin).
type ArticleSearchQuery struct {
	Scope         string
	Visibilities  []string
	PublishedOnly bool
	PackageId     string
	Version       string // matches rows with version = Version OR version IS NULL
	Limit         int
	Offset        int
}

type ArticleRepository interface {
	GetArticles(ctx context.Context, query ArticleSearchQuery) ([]entity.ArticleEntity, error)
	GetArticleBySlug(ctx context.Context, slug string) (*entity.ArticleEntity, error)
	GetArticleById(ctx context.Context, id string) (*entity.ArticleEntity, error)
	CreateArticle(ctx context.Context, ent *entity.ArticleEntity) error
	UpdateArticle(ctx context.Context, ent *entity.ArticleEntity) error
	// DeleteArticle removes the row (dependent rows cascade). Runs inside tx when tx != nil.
	DeleteArticle(ctx context.Context, tx *pg.Tx, id string) error
	SetArticlePublished(ctx context.Context, id string, published bool, userId string) (*entity.ArticleEntity, error)
	// UpsertArticleBySlug is used by import. Runs inside tx when tx != nil.
	UpsertArticleBySlug(ctx context.Context, tx *pg.Tx, ent *entity.ArticleEntity) (created bool, err error)
}

func NewArticleRepositoryPG(cp db.ConnectionProvider) ArticleRepository {
	return &articleRepositoryImpl{cp: cp}
}

type articleRepositoryImpl struct {
	cp db.ConnectionProvider
}

func applyArticleSearchQuery(q *orm.Query, f ArticleSearchQuery) *orm.Query {
	if f.Scope != "" {
		q = q.Where("scope = ?", f.Scope)
	}
	if f.PublishedOnly {
		q = q.Where("published = true")
	}
	if len(f.Visibilities) > 0 {
		q = q.WhereIn("visibility IN (?)", f.Visibilities)
	}
	if f.PackageId != "" {
		q = q.Where("package_id = ?", f.PackageId)
	}
	if f.Version != "" {
		q = q.WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			return q.Where("version = ?", f.Version).WhereOr("version IS NULL"), nil
		})
	}
	q = q.Order("display_order ASC", "title ASC")
	if f.Limit > 0 {
		q = q.Limit(f.Limit).Offset(f.Offset)
	}
	return q
}

func (r articleRepositoryImpl) GetArticles(ctx context.Context, query ArticleSearchQuery) ([]entity.ArticleEntity, error) {
	result := make([]entity.ArticleEntity, 0)
	q := r.cp.GetConnection().WithContext(ctx).Model(&result)
	if err := applyArticleSearchQuery(q, query).Select(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r articleRepositoryImpl) GetArticleBySlug(ctx context.Context, slug string) (*entity.ArticleEntity, error) {
	result := new(entity.ArticleEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).Where("slug = ?", slug).First()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func (r articleRepositoryImpl) GetArticleById(ctx context.Context, id string) (*entity.ArticleEntity, error) {
	result := new(entity.ArticleEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).Where("id = ?", id).First()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func (r articleRepositoryImpl) CreateArticle(ctx context.Context, ent *entity.ArticleEntity) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(ent).Insert()
	return err
}

func (r articleRepositoryImpl) UpdateArticle(ctx context.Context, ent *entity.ArticleEntity) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(ent).WherePK().Update()
	return err
}

func (r articleRepositoryImpl) DeleteArticle(ctx context.Context, tx *pg.Tx, id string) error {
	_, err := connOrTx(r.cp, ctx, tx).ModelContext(ctx, &entity.ArticleEntity{Id: id}).WherePK().Delete()
	return err
}

func (r articleRepositoryImpl) SetArticlePublished(ctx context.Context, id string, published bool, userId string) (*entity.ArticleEntity, error) {
	result := new(entity.ArticleEntity)
	res, err := r.cp.GetConnection().WithContext(ctx).Model(result).
		Set("published = ?", published).
		Set("updated_at = ?", time.Now()).
		Set("updated_by = ?", userId).
		Where("id = ?", id).
		Returning("*").
		Update()
	if err != nil {
		return nil, err
	}
	if res.RowsAffected() == 0 {
		return nil, nil
	}
	return result, nil
}

func (r articleRepositoryImpl) UpsertArticleBySlug(ctx context.Context, tx *pg.Tx, ent *entity.ArticleEntity) (bool, error) {
	var conn orm.DB = r.cp.GetConnection().WithContext(ctx)
	if tx != nil {
		conn = tx
	}
	existing := new(entity.ArticleEntity)
	err := conn.ModelContext(ctx, existing).Where("slug = ?", ent.Slug).First()
	switch {
	case err == nil:
		ent.Id = existing.Id
		ent.CreatedAt = existing.CreatedAt
		ent.CreatedBy = existing.CreatedBy
		_, err = conn.ModelContext(ctx, ent).WherePK().Update()
		return false, err
	case errors.Is(err, pg.ErrNoRows):
		_, err = conn.ModelContext(ctx, ent).Insert()
		return true, err
	default:
		return false, err
	}
}
