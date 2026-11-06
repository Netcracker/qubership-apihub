package repository

import (
	"context"
	"errors"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

// NavigationRepository stores navigation sections and their item trees. Methods that take tx run inside it when
// tx != nil (import replaces whole scopes atomically).
type NavigationRepository interface {
	GetSections(ctx context.Context, scope string, packageId string) ([]entity.NavSectionEntity, error)
	GetAllSections(ctx context.Context) ([]entity.NavSectionEntity, error)
	GetSection(ctx context.Context, id string) (*entity.NavSectionEntity, error)
	CreateSection(ctx context.Context, tx *pg.Tx, ent *entity.NavSectionEntity) error
	UpdateSection(ctx context.Context, ent *entity.NavSectionEntity) error
	DeleteSection(ctx context.Context, id string) (bool, error)
	DeleteSectionsByScope(ctx context.Context, tx *pg.Tx, scope string, packageId string) error

	GetItemsBySections(ctx context.Context, sectionIds []string) ([]entity.NavItemEntity, error)
	GetItem(ctx context.Context, id string) (*entity.NavItemEntity, error)
	GetItemByArticle(ctx context.Context, articleId string) (*entity.NavItemEntity, error)
	CreateItem(ctx context.Context, tx *pg.Tx, ent *entity.NavItemEntity) error
	UpdateItem(ctx context.Context, ent *entity.NavItemEntity) error
	DeleteItem(ctx context.Context, id string) (bool, error)
	CountItemsInSection(ctx context.Context, sectionId string) (int, error)
}

func NewNavigationRepositoryPG(cp db.ConnectionProvider) NavigationRepository {
	return &navigationRepositoryImpl{cp: cp}
}

type navigationRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r navigationRepositoryImpl) conn(ctx context.Context, tx *pg.Tx) orm.DB {
	if tx != nil {
		return tx
	}
	return r.cp.GetConnection().WithContext(ctx)
}

func scopeWhere(q *orm.Query, scope string, packageId string) *orm.Query {
	q = q.Where("scope = ?", scope)
	if packageId == "" {
		return q.Where("package_id IS NULL")
	}
	return q.Where("package_id = ?", packageId)
}

func (r navigationRepositoryImpl) GetSections(ctx context.Context, scope string, packageId string) ([]entity.NavSectionEntity, error) {
	result := make([]entity.NavSectionEntity, 0)
	q := r.cp.GetConnection().WithContext(ctx).Model(&result)
	err := scopeWhere(q, scope, packageId).Order("display_order ASC", "title ASC").Select()
	return result, err
}

func (r navigationRepositoryImpl) GetAllSections(ctx context.Context) ([]entity.NavSectionEntity, error) {
	result := make([]entity.NavSectionEntity, 0)
	err := r.cp.GetConnection().WithContext(ctx).Model(&result).
		Order("scope ASC", "package_id ASC NULLS FIRST", "display_order ASC", "title ASC").Select()
	return result, err
}

func (r navigationRepositoryImpl) GetSection(ctx context.Context, id string) (*entity.NavSectionEntity, error) {
	result := new(entity.NavSectionEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).Where("id = ?", id).First()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func (r navigationRepositoryImpl) CreateSection(ctx context.Context, tx *pg.Tx, ent *entity.NavSectionEntity) error {
	_, err := r.conn(ctx, tx).ModelContext(ctx, ent).Insert()
	return err
}

func (r navigationRepositoryImpl) UpdateSection(ctx context.Context, ent *entity.NavSectionEntity) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(ent).WherePK().Update()
	return err
}

func (r navigationRepositoryImpl) DeleteSection(ctx context.Context, id string) (bool, error) {
	res, err := r.cp.GetConnection().WithContext(ctx).Model(&entity.NavSectionEntity{Id: id}).WherePK().Delete()
	if err != nil {
		return false, err
	}
	return res.RowsAffected() > 0, nil
}

func (r navigationRepositoryImpl) DeleteSectionsByScope(ctx context.Context, tx *pg.Tx, scope string, packageId string) error {
	q := r.conn(ctx, tx).ModelContext(ctx, (*entity.NavSectionEntity)(nil))
	_, err := scopeWhere(q, scope, packageId).Delete()
	return err
}

func (r navigationRepositoryImpl) GetItemsBySections(ctx context.Context, sectionIds []string) ([]entity.NavItemEntity, error) {
	result := make([]entity.NavItemEntity, 0)
	if len(sectionIds) == 0 {
		return result, nil
	}
	err := r.cp.GetConnection().WithContext(ctx).Model(&result).
		WhereIn("section_id IN (?)", sectionIds).
		Order("section_id ASC", "display_order ASC").Select()
	return result, err
}

func (r navigationRepositoryImpl) GetItem(ctx context.Context, id string) (*entity.NavItemEntity, error) {
	result := new(entity.NavItemEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).Where("id = ?", id).First()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func (r navigationRepositoryImpl) GetItemByArticle(ctx context.Context, articleId string) (*entity.NavItemEntity, error) {
	result := new(entity.NavItemEntity)
	err := r.cp.GetConnection().WithContext(ctx).Model(result).Where("article_id = ?", articleId).First()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func (r navigationRepositoryImpl) CreateItem(ctx context.Context, tx *pg.Tx, ent *entity.NavItemEntity) error {
	_, err := r.conn(ctx, tx).ModelContext(ctx, ent).Insert()
	return err
}

func (r navigationRepositoryImpl) UpdateItem(ctx context.Context, ent *entity.NavItemEntity) error {
	_, err := r.cp.GetConnection().WithContext(ctx).Model(ent).WherePK().Update()
	return err
}

func (r navigationRepositoryImpl) DeleteItem(ctx context.Context, id string) (bool, error) {
	res, err := r.cp.GetConnection().WithContext(ctx).Model(&entity.NavItemEntity{Id: id}).WherePK().Delete()
	if err != nil {
		return false, err
	}
	return res.RowsAffected() > 0, nil
}

func (r navigationRepositoryImpl) CountItemsInSection(ctx context.Context, sectionId string) (int, error) {
	return r.cp.GetConnection().WithContext(ctx).Model((*entity.NavItemEntity)(nil)).Where("section_id = ?", sectionId).Count()
}
