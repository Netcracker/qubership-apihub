package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
)

type GlobalSearchPartitionRepository interface {
	EnsureWorkspacePartitions(ctx context.Context, workspaceId string) error
	DropWorkspacePartitions(ctx context.Context, workspaceId string) error
	RenameWorkspacePartitions(ctx context.Context, oldWorkspaceId, newWorkspaceId string) error
}

func NewGlobalSearchPartitionRepository(cp db.ConnectionProvider) GlobalSearchPartitionRepository {
	return &globalSearchPartitionRepositoryImpl{cp: cp}
}

type globalSearchPartitionRepositoryImpl struct {
	cp db.ConnectionProvider
}

func quoteLiteral(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

// EnsureGlobalSearchPartitionsTx creates registry row and LIST partitions inside an existing transaction.
func EnsureGlobalSearchPartitionsTx(tx *pg.Tx, workspaceId string) error {
	if workspaceId == "" {
		return fmt.Errorf("workspaceId is required")
	}
	slug := utils.PartitionSlug(workspaceId)
	ent := &entity.GlobalSearchWorkspaceRegistryEntity{
		WorkspaceId:   workspaceId,
		PartitionSlug: slug,
		CreatedAt:     time.Now(),
	}
	_, err := tx.Model(ent).
		OnConflict("(workspace_id) DO NOTHING").
		Insert()
	if err != nil {
		return err
	}
	var existing entity.GlobalSearchWorkspaceRegistryEntity
	err = tx.Model(&existing).Where("workspace_id = ?", workspaceId).Select()
	if err != nil {
		return err
	}
	slug = existing.PartitionSlug
	quotedWorkspaceId := quoteLiteral(workspaceId)
	statements := []string{
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS global_search.fts_operation_search_text_%s PARTITION OF global_search.fts_operation_search_text FOR VALUES IN (%s)`, slug, quotedWorkspaceId),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS global_search.fts_ddl_search_text_%s PARTITION OF global_search.fts_ddl_search_text FOR VALUES IN (%s)`, slug, quotedWorkspaceId),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS global_search.fts_mcp_search_text_%s PARTITION OF global_search.fts_mcp_search_text FOR VALUES IN (%s)`, slug, quotedWorkspaceId),
	}
	for _, stmt := range statements {
		if _, err := tx.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func (g globalSearchPartitionRepositoryImpl) EnsureWorkspacePartitions(ctx context.Context, workspaceId string) error {
	return g.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		return EnsureGlobalSearchPartitionsTx(tx, workspaceId)
	})
}

func (g globalSearchPartitionRepositoryImpl) DropWorkspacePartitions(ctx context.Context, workspaceId string) error {
	if workspaceId == "" {
		return fmt.Errorf("workspaceId is required")
	}
	return g.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var existing entity.GlobalSearchWorkspaceRegistryEntity
		err := tx.Model(&existing).Where("workspace_id = ?", workspaceId).Select()
		if err != nil {
			if err == pg.ErrNoRows {
				return nil
			}
			return err
		}
		slug := existing.PartitionSlug
		statements := []string{
			fmt.Sprintf(`DROP TABLE IF EXISTS global_search.fts_operation_search_text_%s`, slug),
			fmt.Sprintf(`DROP TABLE IF EXISTS global_search.fts_ddl_search_text_%s`, slug),
			fmt.Sprintf(`DROP TABLE IF EXISTS global_search.fts_mcp_search_text_%s`, slug),
		}
		for _, stmt := range statements {
			if _, err := tx.Exec(stmt); err != nil {
				return err
			}
		}
		_, err = tx.Model(&existing).Where("workspace_id = ?", workspaceId).Delete()
		return err
	})
}

func (g globalSearchPartitionRepositoryImpl) RenameWorkspacePartitions(ctx context.Context, oldWorkspaceId, newWorkspaceId string) error {
	if oldWorkspaceId == "" || newWorkspaceId == "" {
		return fmt.Errorf("oldWorkspaceId and newWorkspaceId are required")
	}
	if oldWorkspaceId == newWorkspaceId {
		return nil
	}
	if err := g.EnsureWorkspacePartitions(ctx, newWorkspaceId); err != nil {
		return err
	}
	err := g.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		moveStatements := []string{
			`UPDATE global_search.fts_operation_search_text
			 SET workspace_id = ?, package_id = CASE
			   WHEN package_id = ? THEN ?
			   WHEN package_id LIKE ? || '.%' THEN ? || substr(package_id, length(?) + 1)
			   ELSE package_id END
			 WHERE workspace_id = ?`,
			`UPDATE global_search.fts_ddl_search_text
			 SET workspace_id = ?, package_id = CASE
			   WHEN package_id = ? THEN ?
			   WHEN package_id LIKE ? || '.%' THEN ? || substr(package_id, length(?) + 1)
			   ELSE package_id END
			 WHERE workspace_id = ?`,
			`UPDATE global_search.fts_mcp_search_text
			 SET workspace_id = ?, package_id = CASE
			   WHEN package_id = ? THEN ?
			   WHEN package_id LIKE ? || '.%' THEN ? || substr(package_id, length(?) + 1)
			   ELSE package_id END
			 WHERE workspace_id = ?`,
		}
		for _, stmt := range moveStatements {
			_, err := tx.Exec(stmt,
				newWorkspaceId,
				oldWorkspaceId, newWorkspaceId,
				oldWorkspaceId, newWorkspaceId, oldWorkspaceId,
				oldWorkspaceId)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	return g.DropWorkspacePartitions(ctx, oldWorkspaceId)
}
