package repository

import (
	"context"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

type LibraryVersionRepository interface {
	// Upsert inserts the version, or revives it when a soft-deleted row of the same version is still
	// there. The primary key is (library_id, version), so a deleted version has to be reused rather than
	// inserted a second time.
	Upsert(ctx context.Context, version entity.LibraryVersionEntity) error
	Get(ctx context.Context, libraryId, version string) (*entity.LibraryVersionEntity, error)
	Exists(ctx context.Context, libraryId, version string) (bool, error)
	// ListVersionNames returns every version of the library that is not soft-deleted, whatever its status.
	ListVersionNames(ctx context.Context, libraryId string) ([]string, error)
	List(ctx context.Context, libraryId string, req view.LibraryVersionListReq) ([]entity.LibraryVersionEntity, error)
	// LatestRelease returns the newest release version of the library other than the one given, which is
	// what a comparison falls back to when the caller names no previous version.
	LatestRelease(ctx context.Context, libraryId, excludeVersion string) (*entity.LibraryVersionEntity, error)
	SoftDelete(ctx context.Context, libraryId, version, userId string) error
	SetMetadata(ctx context.Context, libraryId, version string, metadata map[string]interface{}) error
	SetStatus(ctx context.Context, libraryId, version string, status view.VersionStatus) error
}

func NewLibraryVersionRepository(cp db.ConnectionProvider) LibraryVersionRepository {
	return libraryVersionRepositoryImpl{cp: cp}
}

type libraryVersionRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (l libraryVersionRepositoryImpl) Upsert(ctx context.Context, version entity.LibraryVersionEntity) error {
	_, err := l.cp.GetConnection().ModelContext(ctx, &version).
		OnConflict("(library_id, version) DO UPDATE").
		Set("previous_version = EXCLUDED.previous_version").
		Set("status = EXCLUDED.status").
		Set("labels = EXCLUDED.labels").
		Set("metadata = EXCLUDED.metadata").
		Set("created_at = EXCLUDED.created_at").
		Set("created_by = EXCLUDED.created_by").
		Set("deleted_at = null").
		Set("deleted_by = null").
		Insert()
	return err
}

func (l libraryVersionRepositoryImpl) Get(ctx context.Context, libraryId, version string) (*entity.LibraryVersionEntity, error) {
	result := new(entity.LibraryVersionEntity)
	err := l.cp.GetConnection().ModelContext(ctx, result).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
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

func (l libraryVersionRepositoryImpl) Exists(ctx context.Context, libraryId, version string) (bool, error) {
	return l.cp.GetConnection().ModelContext(ctx, (*entity.LibraryVersionEntity)(nil)).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
		Where("deleted_at is null").
		Exists()
}

func (l libraryVersionRepositoryImpl) ListVersionNames(ctx context.Context, libraryId string) ([]string, error) {
	result := make([]string, 0)
	err := l.cp.GetConnection().ModelContext(ctx, (*entity.LibraryVersionEntity)(nil)).
		Column("version").
		Where("library_id = ?", libraryId).
		Where("deleted_at is null").
		Select(&result)
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (l libraryVersionRepositoryImpl) List(ctx context.Context, libraryId string, req view.LibraryVersionListReq) ([]entity.LibraryVersionEntity, error) {
	result := make([]entity.LibraryVersionEntity, 0)
	query := l.cp.GetConnection().ModelContext(ctx, &result).
		Where("library_id = ?", libraryId).
		Where("deleted_at is null")

	if len(req.Status) > 0 {
		statuses := make([]string, 0, len(req.Status))
		for _, status := range req.Status {
			statuses = append(statuses, string(status))
		}
		query = query.Where("status in (?)", pg.In(statuses))
	}
	if req.TextFilter != "" {
		textFilter := "%" + utils.LikeEscaped(strings.ToLower(req.TextFilter)) + "%"
		query = query.WhereGroup(func(q *pg.Query) (*pg.Query, error) {
			return q.WhereOr("lower(version) like ?", textFilter).
				WhereOr("exists (select 1 from unnest(labels) as label where lower(label) like ?)", textFilter), nil
		})
	}

	err := query.Order("created_at desc", "version").
		Limit(req.Limit).
		Offset(req.Limit * req.Page).
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (l libraryVersionRepositoryImpl) LatestRelease(ctx context.Context, libraryId, excludeVersion string) (*entity.LibraryVersionEntity, error) {
	result := new(entity.LibraryVersionEntity)
	err := l.cp.GetConnection().ModelContext(ctx, result).
		Where("library_id = ?", libraryId).
		Where("version != ?", excludeVersion).
		Where("status = ?", string(view.VersionStatusRelease)).
		Where("deleted_at is null").
		Order("created_at desc").
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (l libraryVersionRepositoryImpl) SoftDelete(ctx context.Context, libraryId, version, userId string) error {
	result, err := l.cp.GetConnection().ModelContext(ctx, (*entity.LibraryVersionEntity)(nil)).
		Set("deleted_at = ?", time.Now()).
		Set("deleted_by = ?", userId).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
		Where("deleted_at is null").
		Update()
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return pg.ErrNoRows
	}
	return nil
}

func (l libraryVersionRepositoryImpl) SetMetadata(ctx context.Context, libraryId, version string, metadata map[string]interface{}) error {
	_, err := l.cp.GetConnection().ModelContext(ctx, (*entity.LibraryVersionEntity)(nil)).
		Set("metadata = ?", metadata).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
		Update()
	return err
}

func (l libraryVersionRepositoryImpl) SetStatus(ctx context.Context, libraryId, version string, status view.VersionStatus) error {
	_, err := l.cp.GetConnection().ModelContext(ctx, (*entity.LibraryVersionEntity)(nil)).
		Set("status = ?", string(status)).
		Where("library_id = ?", libraryId).
		Where("version = ?", version).
		Update()
	return err
}
