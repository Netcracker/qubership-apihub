package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

type BuildRepository interface {
	Create(ctx context.Context, build entity.BuildEntity) error
	Get(ctx context.Context, buildId string) (*entity.BuildEntity, error)
	// FindAndTakeFreeBuild claims the next queued build for a worker. It returns nil when the queue holds
	// nothing for it to do.
	FindAndTakeFreeBuild(ctx context.Context, builderId string, keepaliveTimeout time.Duration, restartLimit int) (*entity.BuildEntity, error)
	UpdateStatus(ctx context.Context, buildId string, status view.BuildStatus, details string) error
	Heartbeat(ctx context.Context, buildId string) error
	StoreResult(ctx context.Context, buildId string, data []byte) error
	GetResult(ctx context.Context, buildId string) ([]byte, error)
}

func NewBuildRepository(cp db.ConnectionProvider) BuildRepository {
	return buildRepositoryImpl{cp: cp}
}

type buildRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b buildRepositoryImpl) Create(ctx context.Context, build entity.BuildEntity) error {
	_, err := b.cp.GetConnection().ModelContext(ctx, &build).Insert()
	return err
}

func (b buildRepositoryImpl) Get(ctx context.Context, buildId string) (*entity.BuildEntity, error) {
	result := new(entity.BuildEntity)
	err := b.cp.GetConnection().ModelContext(ctx, result).
		Where("build_id = ?", buildId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

// queueCandidateQuery picks the next build to hand out: one that was never started, or one whose worker
// stopped reporting. `for no key update skip locked` lets several workers poll concurrently without
// blocking each other or handing the same build to two of them. The index on
// (status, priority DESC, created_at) serves the ordering.
const queueCandidateQuery = `
	SELECT * FROM build
	WHERE status = ?
		OR (status = ? AND last_active < (now() - ?::interval))
	ORDER BY priority DESC, created_at ASC
	LIMIT 1
	FOR NO KEY UPDATE SKIP LOCKED`

func (b buildRepositoryImpl) FindAndTakeFreeBuild(ctx context.Context, builderId string, keepaliveTimeout time.Duration, restartLimit int) (*entity.BuildEntity, error) {
	for {
		var claimed *entity.BuildEntity
		abandoned := false

		err := b.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
			var candidates []entity.BuildEntity
			_, err := tx.QueryContext(ctx, &candidates, queueCandidateQuery,
				string(view.StatusNotStarted), string(view.StatusRunning), keepaliveTimeout.String())
			if err != nil {
				if err == pg.ErrNoRows {
					return nil
				}
				return fmt.Errorf("failed to find a free build: %w", err)
			}
			if len(candidates) == 0 {
				return nil
			}
			candidate := &candidates[0]

			// A build that keeps going silent has a cause the worker cannot recover from; failing it keeps
			// the queue from re-offering it forever.
			if candidate.RestartCount >= restartLimit {
				_, err = tx.ModelContext(ctx, candidate).
					Set("status = ?", string(view.StatusError)).
					Set("details = ?", fmt.Sprintf("Restart count exceeded the limit of %d. Details: %v", restartLimit, candidate.Details)).
					Set("last_active = now()").
					WherePK().
					Update()
				if err != nil {
					return fmt.Errorf("failed to fail build %s after too many restarts: %w", candidate.BuildId, err)
				}
				abandoned = true
				return nil
			}

			if candidate.Status != string(view.StatusNotStarted) {
				candidate.RestartCount++
			}
			candidate.Status = string(view.StatusRunning)
			candidate.BuilderId = builderId

			_, err = tx.ModelContext(ctx, candidate).
				Set("status = ?status").
				Set("builder_id = ?builder_id").
				Set("restart_count = ?restart_count").
				Set("last_active = now()").
				Set("started_at = now()").
				WherePK().
				Update()
			if err != nil {
				return fmt.Errorf("failed to assign build %s to builder %s: %w", candidate.BuildId, builderId, err)
			}
			claimed = candidate
			return nil
		})
		if err != nil {
			return nil, err
		}
		if abandoned {
			// Look for the next candidate rather than telling the worker the queue is empty.
			continue
		}
		return claimed, nil
	}
}

func (b buildRepositoryImpl) UpdateStatus(ctx context.Context, buildId string, status view.BuildStatus, details string) error {
	_, err := b.cp.GetConnection().ModelContext(ctx, (*entity.BuildEntity)(nil)).
		Set("status = ?", string(status)).
		Set("details = ?", details).
		Set("last_active = now()").
		Where("build_id = ?", buildId).
		Update()
	return err
}

func (b buildRepositoryImpl) Heartbeat(ctx context.Context, buildId string) error {
	_, err := b.cp.GetConnection().ModelContext(ctx, (*entity.BuildEntity)(nil)).
		Set("last_active = now()").
		Where("build_id = ?", buildId).
		Update()
	return err
}

func (b buildRepositoryImpl) StoreResult(ctx context.Context, buildId string, data []byte) error {
	result := entity.BuildResultEntity{BuildId: buildId, Data: data}
	_, err := b.cp.GetConnection().ModelContext(ctx, &result).
		OnConflict("(build_id) DO UPDATE").
		Set("data = EXCLUDED.data").
		Insert()
	return err
}

func (b buildRepositoryImpl) GetResult(ctx context.Context, buildId string) ([]byte, error) {
	result := new(entity.BuildResultEntity)
	err := b.cp.GetConnection().ModelContext(ctx, result).
		Where("build_id = ?", buildId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result.Data, nil
}
