package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/go-pg/pg/v10"
)

type MemberRepository interface {
	List(ctx context.Context, libraryId string) ([]entity.LibraryMemberRoleEntity, error)
	Get(ctx context.Context, libraryId, userId string) (*entity.LibraryMemberRoleEntity, error)
	// SetRoles replaces the user's direct role assignment on the library.
	SetRoles(ctx context.Context, libraryId, userId string, roles []string, actingUserId string) error
	Delete(ctx context.Context, libraryId, userId string) error

	AddFavorite(ctx context.Context, userId, libraryId string) error
	RemoveFavorite(ctx context.Context, userId, libraryId string) error
}

func NewMemberRepository(cp db.ConnectionProvider) MemberRepository {
	return memberRepositoryImpl{cp: cp}
}

type memberRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (m memberRepositoryImpl) List(ctx context.Context, libraryId string) ([]entity.LibraryMemberRoleEntity, error) {
	result := make([]entity.LibraryMemberRoleEntity, 0)
	err := m.cp.GetConnection().ModelContext(ctx, &result).
		Where("library_id = ?", libraryId).
		Order("user_id").
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (m memberRepositoryImpl) Get(ctx context.Context, libraryId, userId string) (*entity.LibraryMemberRoleEntity, error) {
	result := new(entity.LibraryMemberRoleEntity)
	err := m.cp.GetConnection().ModelContext(ctx, result).
		Where("library_id = ?", libraryId).
		Where("user_id = ?", userId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (m memberRepositoryImpl) SetRoles(ctx context.Context, libraryId, userId string, roles []string, actingUserId string) error {
	now := time.Now()
	member := entity.LibraryMemberRoleEntity{
		LibraryId: libraryId,
		UserId:    userId,
		Roles:     roles,
		CreatedAt: now,
		CreatedBy: actingUserId,
	}
	_, err := m.cp.GetConnection().ModelContext(ctx, &member).
		OnConflict("(library_id, user_id) DO UPDATE").
		Set("roles = EXCLUDED.roles").
		Set("updated_at = ?", now).
		Set("updated_by = ?", actingUserId).
		Insert()
	return err
}

func (m memberRepositoryImpl) Delete(ctx context.Context, libraryId, userId string) error {
	_, err := m.cp.GetConnection().ModelContext(ctx, (*entity.LibraryMemberRoleEntity)(nil)).
		Where("library_id = ?", libraryId).
		Where("user_id = ?", userId).
		Delete()
	return err
}

func (m memberRepositoryImpl) AddFavorite(ctx context.Context, userId, libraryId string) error {
	favorite := entity.FavoriteLibraryEntity{UserId: userId, LibraryId: libraryId}
	_, err := m.cp.GetConnection().ModelContext(ctx, &favorite).
		OnConflict("(user_id, library_id) DO NOTHING").
		Insert()
	return err
}

func (m memberRepositoryImpl) RemoveFavorite(ctx context.Context, userId, libraryId string) error {
	_, err := m.cp.GetConnection().ModelContext(ctx, (*entity.FavoriteLibraryEntity)(nil)).
		Where("user_id = ?", userId).
		Where("library_id = ?", libraryId).
		Delete()
	return err
}
