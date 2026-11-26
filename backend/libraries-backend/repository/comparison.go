package repository

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

type ComparisonRepository interface {
	// Replace stores a comparison and its changes, discarding whatever an earlier run of the same version
	// pair produced.
	Replace(ctx context.Context, comparison entity.LibraryVersionComparisonEntity, changes []entity.LibraryVersionChangeEntity) error
	Get(ctx context.Context, key view.ComparisonKey) (*entity.LibraryVersionComparisonEntity, error)
	ListChanges(ctx context.Context, comparisonId string, req view.ChangeListReq) ([]entity.LibraryVersionChangeEntity, error)
	// ListNestedClassChanges summarises the changes of the classes declared directly inside classId.
	ListNestedClassChanges(ctx context.Context, comparisonId, classId string) ([]NestedClassChangeRow, error)
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

// NestedClassChangeRow is the aggregate of one nested class's changes.
type NestedClassChangeRow struct {
	ClassId      string `pg:"class_id"`
	Kind         string `pg:"kind"`
	Added        bool   `pg:"added"`
	Removed      bool   `pg:"removed"`
	SeverityRank int    `pg:"severity_rank"`
}

// ListNestedClassChanges aggregates, per class declared directly inside classId (ids shaped Outer$Inner), the
// stored changes of one comparison. It uses the (comparison_id, class_id) index, and returns one row per
// changed nested class, so the result is bounded by the number of classes nested in one class.
func (c comparisonRepositoryImpl) ListNestedClassChanges(ctx context.Context, comparisonId, classId string) ([]NestedClassChangeRow, error) {
	prefix := utils.LikeEscaped(classId) + nestedClassSeparator
	result := make([]NestedClassChangeRow, 0)
	_, err := c.cp.GetConnection().WithContext(ctx).Query(&result, `
		SELECT
			class_id,
			min(kind) AS kind,
			bool_or(coalesce(method_id, '') = '' AND change_type = 'added') AS added,
			bool_or(coalesce(method_id, '') = '' AND change_type = 'removed') AS removed,
			min(CASE severity WHEN 'breaking' THEN 0 WHEN 'non-breaking' THEN 1 ELSE 2 END) AS severity_rank
		FROM library_version_changes
		WHERE comparison_id = ? AND class_id LIKE ? AND class_id NOT LIKE ?
		GROUP BY class_id
		ORDER BY class_id`,
		comparisonId, prefix+"%", prefix+"%"+nestedClassSeparator+"%")
	if err != nil && err != pg.ErrNoRows {
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
