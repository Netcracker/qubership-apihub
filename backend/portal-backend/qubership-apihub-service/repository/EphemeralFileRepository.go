package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

type EphemeralFileRepository interface {
	Insert(ctx context.Context, f *entity.EphemeralFileEntity) error
	GetByID(ctx context.Context, fileID string) (*entity.EphemeralFileEntity, error)
	GetByIDForUser(ctx context.Context, fileID, userID string) (*entity.EphemeralFileEntity, error)
	ListExpired(ctx context.Context, limit int) ([]entity.EphemeralFileEntity, error)
	DeleteByID(ctx context.Context, fileID string) error
}

type ephemeralFileRepositoryImpl struct {
	cp db.ConnectionProvider
}

func NewEphemeralFileRepositoryPG(cp db.ConnectionProvider) EphemeralFileRepository {
	return &ephemeralFileRepositoryImpl{cp: cp}
}

func (r *ephemeralFileRepositoryImpl) Insert(ctx context.Context, f *entity.EphemeralFileEntity) error {
	_, err := r.cp.GetConnection().ModelContext(ctx, f).Insert()
	return err
}

func (r *ephemeralFileRepositoryImpl) GetByIDForUser(ctx context.Context, fileID, userID string) (*entity.EphemeralFileEntity, error) {
	res := new(entity.EphemeralFileEntity)
	err := r.cp.GetConnection().ModelContext(ctx, res).
		Where("id = ?", fileID).
		Where("user_id = ?", userID).
		Limit(1).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return res, nil
}

func (r *ephemeralFileRepositoryImpl) GetByID(ctx context.Context, fileID string) (*entity.EphemeralFileEntity, error) {
	res := new(entity.EphemeralFileEntity)
	err := r.cp.GetConnection().ModelContext(ctx, res).
		Where("id = ?", fileID).
		Limit(1).
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return res, nil
}

func (r *ephemeralFileRepositoryImpl) ListExpired(ctx context.Context, limit int) ([]entity.EphemeralFileEntity, error) {
	var rows []entity.EphemeralFileEntity
	err := r.cp.GetConnection().ModelContext(ctx, &rows).
		Where("expires_at < ?", time.Now().UTC()).
		Limit(limit).
		Select()
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *ephemeralFileRepositoryImpl) DeleteByID(ctx context.Context, fileID string) error {
	// Do not chain TableExpr("ephemeral_file") here: the model tag already names ephemeral_file
	// and go-pg would emit invalid SQL (PostgreSQL 42712: table specified more than once).
	_, err := r.cp.GetConnection().ModelContext(ctx, (*entity.EphemeralFileEntity)(nil)).
		Where("id = ?", fileID).
		Delete()
	return err
}
