package repository

import (
	"context"
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/go-pg/pg/v10"
	"time"
)

type RulesetRepository interface {
	CreateRuleset(ctx context.Context, ruleset entity.RulesetWithData) error
	ActivateRuleset(ctx context.Context, id, oldId string) error
	ListRulesets(ctx context.Context) ([]entity.Ruleset, error)
	GetActiveRulesets(ctx context.Context, apiType view.ApiType) (map[view.Linter]entity.Ruleset, error)
	GetRulesetById(ctx context.Context, id string) (*entity.Ruleset, error)
	RulesetExists(ctx context.Context, name string, apiType view.ApiType) (bool, error)
	GetRulesetWithData(ctx context.Context, id string) (*entity.RulesetWithData, error)
	GetActivationHistory(ctx context.Context, id string) ([]entity.RulesetActivationHistory, error)
	DeleteRuleset(ctx context.Context, id string) error
}

func NewRuleSetRepository(cp db.ConnectionProvider) RulesetRepository {
	return ruleSetRepositoryImpl{cp: cp}
}

type ruleSetRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r ruleSetRepositoryImpl) CreateRuleset(ctx context.Context, ruleset entity.RulesetWithData) error {
	_, err := r.cp.GetConnection().ModelContext(ctx, &ruleset).Insert()
	return err
}

func (r ruleSetRepositoryImpl) ActivateRuleset(ctx context.Context, id, oldId string) error {
	user := secctx.GetUserId(ctx)
	if user == "" {
		return errors.New("user not found in context")
	}

	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		// Get old ruleset with pessimistic lock
		oldRuleset := new(entity.Ruleset)
		err := tx.Model(oldRuleset).Where("id = ?", oldId).For("UPDATE SKIP LOCKED").Select()
		if err != nil {
			return err
		}
		if oldRuleset == nil {
			return fmt.Errorf("concurrect activation detected(current ruleset is locked). please retry")
		}
		if oldRuleset.Status != view.RulesetStatusActive {
			return fmt.Errorf("concurrect activation detected(current ruleset is already inactive). please retry")
		}

		// Deactivate currently active ruleset for the same linter and API type
		_, err = tx.Model(oldRuleset).
			Set("status = ?", view.RulesetStatusInactive).
			Where("id = ?", oldId).
			Update()
		if err != nil {
			return err
		}

		// Activate the new ruleset
		ruleset := new(entity.Ruleset)
		_, err = tx.Model(ruleset).
			Set("status = ?", view.RulesetStatusActive).
			Set("can_be_deleted = ?", false).
			Set("last_activated = ?", time.Now()).
			Where("id = ?", id).
			Update()
		if err != nil {
			return err
		}

		// Update activation history for old ruleset
		_, err = tx.Model((*entity.RulesetActivationHistory)(nil)).
			Set("deactivated_at = ?", time.Now()).
			Set("deactivated_by = ?", user).
			Where("ruleset_id = ?", oldId).
			Where("deactivated_at is null").
			Update()
		if err != nil {
			return err
		}

		// Add activation history item for new active ruleset
		history := &entity.RulesetActivationHistory{
			RulesetId:   id,
			ActivatedAt: time.Now(),
			ActivatedBy: user,
		}
		_, err = tx.Model(history).Insert()
		if err != nil {
			return err
		}

		return nil
	})
}

func (r ruleSetRepositoryImpl) ListRulesets(ctx context.Context) ([]entity.Ruleset, error) {
	var rulesets []entity.Ruleset
	err := r.cp.GetConnection().ModelContext(ctx, &rulesets).Select()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return rulesets, err
}

func (r ruleSetRepositoryImpl) GetActiveRulesets(ctx context.Context, apiType view.ApiType) (map[view.Linter]entity.Ruleset, error) {
	var rulesets []entity.Ruleset

	err := r.cp.GetConnection().ModelContext(ctx, &rulesets).Where("api_type=?", apiType).Where("status=?", "active").Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	result := make(map[view.Linter]entity.Ruleset)

	for _, rs := range rulesets {
		result[rs.Linter] = rs
	}

	return result, nil
}

func (r ruleSetRepositoryImpl) GetRulesetById(ctx context.Context, id string) (*entity.Ruleset, error) {
	var ruleset entity.Ruleset

	err := r.cp.GetConnection().ModelContext(ctx, &ruleset).
		Where("id = ?", id).
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &ruleset, nil
}

func (r ruleSetRepositoryImpl) RulesetExists(ctx context.Context, name string, apiType view.ApiType) (bool, error) {
	ruleset := new(entity.Ruleset)

	err := r.cp.GetConnection().ModelContext(ctx, ruleset).
		Where("name = ?", name).
		Where("api_type = ?", apiType).
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return ruleset != nil, nil
}

func (r ruleSetRepositoryImpl) GetRulesetWithData(ctx context.Context, id string) (*entity.RulesetWithData, error) {
	var ruleset entity.RulesetWithData
	err := r.cp.GetConnection().ModelContext(ctx, &ruleset).
		Where("id = ?", id).
		Select()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return &ruleset, err
}

func (r ruleSetRepositoryImpl) GetActivationHistory(ctx context.Context, id string) ([]entity.RulesetActivationHistory, error) {
	var history []entity.RulesetActivationHistory
	err := r.cp.GetConnection().ModelContext(ctx, &history).
		Where("ruleset_id = ?", id).
		Order("activated_at DESC").
		Limit(100).
		Select()
	if errors.Is(err, pg.ErrNoRows) {
		return nil, nil
	}
	return history, err
}

func (r ruleSetRepositoryImpl) DeleteRuleset(ctx context.Context, id string) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ruleset entity.Ruleset

		err := tx.Model(&ruleset).Where("id = ?", id).Select()
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return fmt.Errorf("ruleset with id = %s does not exist", id)
			}
			return err
		}

		if !ruleset.CanBeDeleted {
			return fmt.Errorf("ruleset with id = %s can not be deleted", id)
		}

		_, err = tx.Model(&ruleset).
			Where("id = ?", id).
			Delete()
		return err
	})
}
