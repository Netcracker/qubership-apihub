package service

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
)

type GlobalSearchPartitionService interface {
	EnsureWorkspacePartitions(workspaceId string) error
	DropWorkspacePartitions(workspaceId string) error
	RenameWorkspacePartitions(oldWorkspaceId, newWorkspaceId string) error
}

func NewGlobalSearchPartitionService(repo repository.GlobalSearchPartitionRepository) GlobalSearchPartitionService {
	return &globalSearchPartitionServiceImpl{repo: repo}
}

type globalSearchPartitionServiceImpl struct {
	repo repository.GlobalSearchPartitionRepository
}

func (g globalSearchPartitionServiceImpl) EnsureWorkspacePartitions(workspaceId string) error {
	if workspaceId == "" {
		return fmt.Errorf("workspaceId is required")
	}
	return g.repo.EnsureWorkspacePartitions(context.Background(), workspaceId)
}

func (g globalSearchPartitionServiceImpl) DropWorkspacePartitions(workspaceId string) error {
	if workspaceId == "" {
		return fmt.Errorf("workspaceId is required")
	}
	return g.repo.DropWorkspacePartitions(context.Background(), workspaceId)
}

func (g globalSearchPartitionServiceImpl) RenameWorkspacePartitions(oldWorkspaceId, newWorkspaceId string) error {
	if oldWorkspaceId == "" || newWorkspaceId == "" {
		return fmt.Errorf("oldWorkspaceId and newWorkspaceId are required")
	}
	return g.repo.RenameWorkspacePartitions(context.Background(), oldWorkspaceId, newWorkspaceId)
}
