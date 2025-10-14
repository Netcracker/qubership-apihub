package stages

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
)

func (d OpsMigration) StageCancelling() error {
	_, err := d.cp.GetConnection().Exec(`
			update build set status = ?, details = ?, last_active=now()
			where status in (?) and metadata->>'migration_id' = ?`,
		view.StatusError, CancelledMigrationError,
		pg.In([]view.BuildStatusEnum{view.StatusNotStarted, view.StatusRunning}), d.ent.Id)
	if err != nil {
		return fmt.Errorf("failed to cancel builds for migration %s: %w", d.ent.Id, err)
	}
	return nil
}
