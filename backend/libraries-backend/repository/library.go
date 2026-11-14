package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

type LibraryRepository interface {
	Create(ctx context.Context, library entity.LibraryEntity) error
	Update(ctx context.Context, library entity.LibraryEntity) error
	GetById(ctx context.Context, libraryId string) (*entity.LibraryEntity, error)
	GetByCoordinates(ctx context.Context, repository, coordinatesKey string) (*entity.LibraryEntity, error)
	SoftDelete(ctx context.Context, libraryId, userId string) error
	List(ctx context.Context, userId string, req view.LibraryListReq) ([]entity.LibraryWithFavoriteEntity, error)
	ListFavorites(ctx context.Context, userId string, limit, page int) ([]entity.LibraryEntity, error)
	IsFavorite(ctx context.Context, userId, libraryId string) (bool, error)
	Search(ctx context.Context, req view.SearchLibrariesReq) ([]entity.LibraryEntity, error)
}

func NewLibraryRepository(cp db.ConnectionProvider) LibraryRepository {
	return libraryRepositoryImpl{cp: cp}
}

type libraryRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (l libraryRepositoryImpl) Create(ctx context.Context, library entity.LibraryEntity) error {
	return l.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		if _, err := tx.ModelContext(ctx, &library).Insert(); err != nil {
			return err
		}
		return upsertLibrarySearchVector(ctx, tx, library)
	})
}

func (l libraryRepositoryImpl) Update(ctx context.Context, library entity.LibraryEntity) error {
	return l.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		result, err := tx.ModelContext(ctx, &library).
			Column("alias", "name", "description", "parent_package_id", "default_role").
			WherePK().
			Where("deleted_at is null").
			Update()
		if err != nil {
			return err
		}
		if result.RowsAffected() == 0 {
			return pg.ErrNoRows
		}
		return upsertLibrarySearchVector(ctx, tx, library)
	})
}

// upsertLibrarySearchVector rebuilds the library's search row from the fields the search covers: name,
// alias, description, and the normalised coordinates.
func upsertLibrarySearchVector(ctx context.Context, tx *pg.Tx, library entity.LibraryEntity) error {
	searchText := strings.Join([]string{library.Name, library.Alias, library.Description, library.CoordinatesKey}, " ")
	_, err := tx.ExecContext(ctx, `
		INSERT INTO library_search (library_id, search_vector)
		VALUES (?, `+searchVectorExpr("?")+`)
		ON CONFLICT (library_id) DO UPDATE SET search_vector = excluded.search_vector`,
		library.Id, searchTextConfig, searchText)
	if err != nil {
		return fmt.Errorf("failed to update the search vector of library %s: %w", library.Id, err)
	}
	return nil
}

func (l libraryRepositoryImpl) GetById(ctx context.Context, libraryId string) (*entity.LibraryEntity, error) {
	result := new(entity.LibraryEntity)
	err := l.cp.GetConnection().ModelContext(ctx, result).
		Where("id = ?", libraryId).
		Where("deleted_at is null").
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (l libraryRepositoryImpl) GetByCoordinates(ctx context.Context, repository, coordinatesKey string) (*entity.LibraryEntity, error) {
	result := new(entity.LibraryEntity)
	err := l.cp.GetConnection().ModelContext(ctx, result).
		Where("repository = ?", repository).
		Where("coordinates_key = ?", coordinatesKey).
		Where("deleted_at is null").
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

// SoftDelete marks the library deleted. Its versions, members, and favorites stay in place behind the same
// flag: nothing reads them once the library is gone, and a hard delete would take the build history with it.
func (l libraryRepositoryImpl) SoftDelete(ctx context.Context, libraryId, userId string) error {
	now := time.Now()
	return l.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		result, err := tx.ModelContext(ctx, (*entity.LibraryEntity)(nil)).
			Set("deleted_at = ?", now).
			Set("deleted_by = ?", userId).
			Where("id = ?", libraryId).
			Where("deleted_at is null").
			Update()
		if err != nil {
			return err
		}
		if result.RowsAffected() == 0 {
			return pg.ErrNoRows
		}
		_, err = tx.ModelContext(ctx, (*entity.LibraryVersionEntity)(nil)).
			Set("deleted_at = ?", now).
			Set("deleted_by = ?", userId).
			Where("library_id = ?", libraryId).
			Where("deleted_at is null").
			Update()
		if err != nil {
			return fmt.Errorf("failed to delete the versions of library %s: %w", libraryId, err)
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM library_search WHERE library_id = ?`, libraryId)
		if err != nil {
			return fmt.Errorf("failed to remove library %s from the search index: %w", libraryId, err)
		}
		return nil
	})
}

func (l libraryRepositoryImpl) List(ctx context.Context, userId string, req view.LibraryListReq) ([]entity.LibraryWithFavoriteEntity, error) {
	result := make([]entity.LibraryWithFavoriteEntity, 0)
	query := l.cp.GetConnection().ModelContext(ctx, &result).
		ColumnExpr("library.*").
		ColumnExpr("fav.user_id is not null as is_favorite").
		Join("left join favorite_libraries as fav on fav.library_id = library.id and fav.user_id = ?", userId).
		Where("library.deleted_at is null")

	if req.Repository != "" {
		query = query.Where("library.repository = ?", req.Repository)
	}
	if req.Language != "" {
		query = query.Where("library.language = ?", string(req.Language))
	}
	if req.ParentPackageId != "" {
		query = query.Where("library.parent_package_id = ?", req.ParentPackageId)
	}
	if req.TextFilter != "" {
		textFilter := "%" + utils.LikeEscaped(strings.ToLower(req.TextFilter)) + "%"
		query = query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			return q.WhereOr("lower(library.name) like ?", textFilter).
				WhereOr("lower(library.alias) like ?", textFilter).
				WhereOr("lower(library.description) like ?", textFilter).
				WhereOr("lower(library.coordinates_key) like ?", textFilter), nil
		})
	}
	if req.OnlyFavorite {
		query = query.Where("fav.user_id is not null")
	}

	err := query.Order("library.name", "library.id").
		Limit(req.Limit).
		Offset(req.Limit * req.Page).
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (l libraryRepositoryImpl) ListFavorites(ctx context.Context, userId string, limit, page int) ([]entity.LibraryEntity, error) {
	result := make([]entity.LibraryEntity, 0)
	err := l.cp.GetConnection().ModelContext(ctx, &result).
		Join("inner join favorite_libraries as fav on fav.library_id = library.id").
		Where("fav.user_id = ?", userId).
		Where("library.deleted_at is null").
		Order("library.name", "library.id").
		Limit(limit).
		Offset(limit * page).
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (l libraryRepositoryImpl) IsFavorite(ctx context.Context, userId, libraryId string) (bool, error) {
	return l.cp.GetConnection().ModelContext(ctx, (*entity.FavoriteLibraryEntity)(nil)).
		Where("user_id = ?", userId).
		Where("library_id = ?", libraryId).
		Exists()
}

func (l libraryRepositoryImpl) Search(ctx context.Context, req view.SearchLibrariesReq) ([]entity.LibraryEntity, error) {
	result := make([]entity.LibraryEntity, 0)
	query := l.cp.GetConnection().ModelContext(ctx, &result).
		ColumnExpr("library.*").
		Join("inner join library_search as ls on ls.library_id = library.id").
		Where("ls.search_vector @@ "+searchQueryExpr, searchTextConfig, req.TextFilter).
		Where("library.deleted_at is null")

	if req.Language != "" {
		query = query.Where("library.language = ?", string(req.Language))
	}
	if req.Repository != "" {
		query = query.Where("library.repository = ?", req.Repository)
	}

	err := query.
		OrderExpr("ts_rank(ls.search_vector, "+searchQueryExpr+") desc", searchTextConfig, req.TextFilter).
		Order("library.id").
		Limit(req.Limit).
		Offset(req.Limit * req.Page).
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}
