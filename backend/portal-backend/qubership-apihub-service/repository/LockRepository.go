package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

var (
	ErrLockAlreadyAcquired = errors.New("lock is already acquired by another instance")
	ErrLockNotFound        = errors.New("lock not found")
	ErrLockExpired         = errors.New("lock has expired")
	ErrVersionMismatch     = errors.New("lock version mismatch - optimistic lock failure")
)

const (
	clockSkewMargin = 10 * time.Second
)

type LockRepository interface {
	TryAcquireLock(ctx context.Context, lockName string, instanceId string, leaseSeconds int) (bool, error)
	RefreshLock(ctx context.Context, lockName string, instanceId string, leaseSeconds int, expectedVersion int64) error
	ReleaseLock(ctx context.Context, lockName string, instanceId string, expectedVersion int64) error
	GetLockInfo(ctx context.Context, lockName string) (*entity.LockEntity, error)
}

type lockRepositoryImpl struct {
	cp db.ConnectionProvider
}

func NewLockRepository(cp db.ConnectionProvider) LockRepository {
	return &lockRepositoryImpl{cp: cp}
}

func (r *lockRepositoryImpl) TryAcquireLock(ctx context.Context, lockName string, instanceId string, leaseSeconds int) (bool, error) {
	now := time.Now().UTC()
	safeNow := now.Add(-clockSkewMargin)
	expiresAt := now.Add(time.Duration(leaseSeconds) * time.Second)

	existingLock, err := r.findExistingLock(ctx, lockName)
	if err != nil {
		return false, err
	}

	if existingLock == nil {
		return r.createNewLock(ctx, lockName, instanceId, now, expiresAt)
	}

	if existingLock.ExpiresAt.After(safeNow) {
		return false, nil
	}

	return r.takeOverExpiredLock(ctx, lockName, instanceId, now, expiresAt, existingLock.Version, safeNow)
}

func (r *lockRepositoryImpl) findExistingLock(ctx context.Context, lockName string) (*entity.LockEntity, error) {
	var existingLock entity.LockEntity
	err := r.cp.GetConnection().ModelContext(ctx, &existingLock).
		Where("name = ?", lockName).
		Select()
		
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to check existing lock: %w", err)
	}
	
	return &existingLock, nil
}

func (r *lockRepositoryImpl) createNewLock(ctx context.Context, lockName, instanceId string, now, expiresAt time.Time) (bool, error) {
	lock := &entity.LockEntity{
		Name:       lockName,
		InstanceId: instanceId,
		AcquiredAt: now,
		ExpiresAt:  expiresAt,
		Version:    1,
	}

	_, err := r.cp.GetConnection().ModelContext(ctx, lock).Insert()
	if err != nil {
		if pgErr, ok := err.(pg.Error); ok && pgErr.IntegrityViolation() {
			return false, ErrLockAlreadyAcquired
		}
		return false, fmt.Errorf("failed to insert lock: %w", err)
	}
	return true, nil
}

func (r *lockRepositoryImpl) takeOverExpiredLock(ctx context.Context, lockName, instanceId string, now, expiresAt time.Time, version int64, safeNow time.Time) (bool, error) {
	result, err := r.cp.GetConnection().ModelContext(ctx, &entity.LockEntity{}).
		Set("instance_id = ?, acquired_at = ?, expires_at = ?, version = version + 1", instanceId, now, expiresAt).
		Where("name = ? AND version = ? AND expires_at < ?", lockName, version, safeNow).
		Update()

	if err != nil {
		return false, fmt.Errorf("failed to take over lock: %w", err)
	}

	return result.RowsAffected() > 0, nil
}

func (r *lockRepositoryImpl) RefreshLock(ctx context.Context, lockName string, instanceId string, leaseSeconds int, expectedVersion int64) error {
	now := time.Now().UTC()
	safeNow := now.Add(clockSkewMargin)
	expiresAt := now.Add(time.Duration(leaseSeconds) * time.Second)

	result, err := r.cp.GetConnection().ModelContext(ctx, &entity.LockEntity{}).
		Set("expires_at = ?, version = version + 1", expiresAt).
		Where("name = ? AND instance_id = ? AND expires_at > ? AND version = ?",
			lockName, instanceId, safeNow, expectedVersion).
		Update()

	if err != nil {
		return fmt.Errorf("failed to refresh lock: %w", err)
	}

	if result.RowsAffected() == 0 {
		lock, err := r.GetLockInfo(ctx, lockName)
		if err != nil {
			return err
		}
	
		if lock.ExpiresAt.Before(safeNow) {
			return ErrLockExpired
		}
	
		if lock.Version != expectedVersion {
			return ErrVersionMismatch
		}
		return ErrLockAlreadyAcquired
	}

	return nil
}

func (r *lockRepositoryImpl) ReleaseLock(ctx context.Context, lockName string, instanceId string, expectedVersion int64) error {
	pastTime := time.Now().UTC().Add(-clockSkewMargin)

	result, err := r.cp.GetConnection().ModelContext(ctx, &entity.LockEntity{}).
		Set("expires_at = ?, version = version + 1", pastTime).
		Where("name = ? AND instance_id = ? AND version = ?",
			lockName, instanceId, expectedVersion).
		Update()

	if err != nil {
		return fmt.Errorf("failed to release lock: %w", err)
	}

	if result.RowsAffected() == 0 {
		lock, err := r.GetLockInfo(ctx, lockName)
		if err != nil {
			if errors.Is(err, ErrLockNotFound) {
				return nil
			}
			return err
		}
	
		if lock.Version != expectedVersion {
			return ErrVersionMismatch
		}
	
		if lock.InstanceId != instanceId {
			return ErrLockAlreadyAcquired
		}
	}

	return nil
}

func (r *lockRepositoryImpl) GetLockInfo(ctx context.Context, lockName string) (*entity.LockEntity, error) {
	var lock entity.LockEntity
	err := r.cp.GetConnection().ModelContext(ctx, &lock).
		Where("name = ?", lockName).
		Select()

	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, ErrLockNotFound
		}
		return nil, fmt.Errorf("failed to get lock info: %w", err)
	}

	return &lock, nil
}
