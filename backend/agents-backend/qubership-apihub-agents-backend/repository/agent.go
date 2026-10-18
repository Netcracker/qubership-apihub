package repository

import (
	"github.com/Netcracker/qubership-apihub-agents-backend/db"
	"github.com/Netcracker/qubership-apihub-agents-backend/entity"
	"github.com/go-pg/pg/v10"
)

type AgentRepository interface {
	CreateOrUpdateAgent(ent entity.AgentEntity) error
	ListAgents(onlyActive bool) ([]entity.AgentEntity, error)
	GetAgent(id string) (*entity.AgentEntity, error)
}

func NewAgentRepository(cp db.ConnectionProvider) AgentRepository {
	return agentRepositoryImpl{cp: cp}
}

type agentRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (a agentRepositoryImpl) CreateOrUpdateAgent(ent entity.AgentEntity) error {
	_, err := a.cp.GetConnection().Model(&ent).OnConflict("(agent_id) DO UPDATE").Insert()
	if err != nil {
		return err
	}
	return nil
}

func (a agentRepositoryImpl) ListAgents(onlyActive bool) ([]entity.AgentEntity, error) {
	var result []entity.AgentEntity
	query := a.cp.GetConnection().Model(&result)
	if onlyActive {
		query.Where("last_active > (now() - interval '30 seconds')")
	}
	query.Order("agent_id ASC")

	err := query.Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (a agentRepositoryImpl) GetAgent(id string) (*entity.AgentEntity, error) {
	result := new(entity.AgentEntity)
	err := a.cp.GetConnection().Model(result).
		Where("agent_id = ?", id).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
