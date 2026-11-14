package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

type ComparisonRepository interface {
	// Replace stores a comparison and its changes, discarding whatever an earlier run of the same version
	// pair produced.
	Replace(ctx context.Context, comparison entity.LibraryVersionComparisonEntity, changes []entity.LibraryVersionChangeEntity) error
	Get(ctx context.Context, key view.ComparisonKey) (*entity.LibraryVersionComparisonEntity, error)
	ListChanges(ctx context.Context, comparisonId string, req view.ChangeListReq) ([]entity.LibraryVersionChangeEntity, error)
}

func NewComparisonRepository(cp db.ConnectionProvider) ComparisonRepository {
	return comparisonRepositoryImpl{cp: cp}
}

type comparisonRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (c comparisonRepositoryImpl) Replace(ctx context.Context, comparison entity.LibraryVersionComparisonEntity, changes []entity.LibraryVersionChangeEntity) error {
	return c.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		// The changes of a previous run hang off the old comparison_id, which the delete takes with it.
		_, err := tx.ModelContext(ctx, (*entity.LibraryVersionComparisonEntity)(nil)).
			Where("library_id = ?", comparison.LibraryId).
			Where("version = ?", comparison.Version).
			Where("previous_library_id = ?", comparison.PreviousLibraryId).
			Where("previous_version = ?", comparison.PreviousVersion).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to clear the previous comparison: %w", err)
		}

		if _, err = tx.ModelContext(ctx, &comparison).Insert(); err != nil {
			return fmt.Errorf("failed to store the comparison: %w", err)
		}
		if len(changes) > 0 {
			if _, err = tx.ModelContext(ctx, &changes).Insert(); err != nil {
				return fmt.Errorf("failed to store the comparison changes: %w", err)
			}
		}
		return nil
	})
}

func (c comparisonRepositoryImpl) Get(ctx context.Context, key view.ComparisonKey) (*entity.LibraryVersionComparisonEntity, error) {
	result := new(entity.LibraryVersionComparisonEntity)
	err := c.cp.GetConnection().ModelContext(ctx, result).
		Where("library_id = ?", key.LibraryId).
		Where("version = ?", key.Version).
		Where("previous_library_id = ?", key.PreviousLibraryId).
		Where("previous_version = ?", key.PreviousVersion).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (c comparisonRepositoryImpl) ListChanges(ctx context.Context, comparisonId string, req view.ChangeListReq) ([]entity.LibraryVersionChangeEntity, error) {
	result := make([]entity.LibraryVersionChangeEntity, 0)
	query := c.cp.GetConnection().ModelContext(ctx, &result).
		Where("comparison_id = ?", comparisonId)

	if len(req.Severity) > 0 {
		severities := make([]string, 0, len(req.Severity))
		for _, severity := range req.Severity {
			severities = append(severities, string(severity))
		}
		query = query.Where("severity in (?)", pg.In(severities))
	}
	if len(req.ChangeType) > 0 {
		changeTypes := make([]string, 0, len(req.ChangeType))
		for _, changeType := range req.ChangeType {
			changeTypes = append(changeTypes, string(changeType))
		}
		query = query.Where("change_type in (?)", pg.In(changeTypes))
	}
	if req.ClassId != "" {
		query = query.Where("class_id = ?", req.ClassId)
	}

	err := query.Order("class_id", "method_id", "change_id").
		Limit(req.Limit).
		Offset(req.Limit * req.Page).
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}
