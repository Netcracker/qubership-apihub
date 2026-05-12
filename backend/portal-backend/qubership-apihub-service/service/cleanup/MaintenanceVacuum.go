package cleanup

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
)

type maintenanceVacuumCleanupJobProcessor struct {
	cp            db.ConnectionProvider
	vacuumTimeout time.Duration
}

type tableRelation struct {
	Schema string `pg:"schemaname, type:varchar"`
	Name   string `pg:"relname, type:varchar"`
}

func NewMaintenanceVacuumCleanupJobProcessor(cp db.ConnectionProvider, timeoutMinutes int) JobProcessor {
	return &maintenanceVacuumCleanupJobProcessor{
		cp:            cp,
		vacuumTimeout: time.Duration(timeoutMinutes) * time.Minute,
	}
}

func (p *maintenanceVacuumCleanupJobProcessor) Initialize(ctx context.Context, jobId string, instanceId string, deleteBefore time.Time) error {
	return nil
}

func (p *maintenanceVacuumCleanupJobProcessor) Process(ctx context.Context, jobId string, deleteBefore time.Time, deletedItems *int) ([]string, error) {
	return []string{}, nil
}

func (p *maintenanceVacuumCleanupJobProcessor) UpdateProgress(ctx context.Context, jobId string, status jobStatus, errorMessage string, deletedItems int, finishedAt *time.Time) error {
	return nil
}

func (p *maintenanceVacuumCleanupJobProcessor) GetVacuumTimeout() time.Duration {
	return p.vacuumTimeout
}

func (p *maintenanceVacuumCleanupJobProcessor) PerformVacuum(ctx context.Context, jobId string) error {
	logger.Infof(ctx, "Starting maintenance vacuum for all eligible public tables")
	vacuumQueries, err := p.prepareVacuumQueries()
	if err != nil {
		return err
	}
	for _, query := range vacuumQueries {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		if _, err = p.cp.GetConnection().Exec(query); err != nil {
			return err
		}
	}
	logger.Infof(ctx, "Maintenance vacuum finished. Executed %d vacuum queries", len(vacuumQueries))
	return nil
}

func (p *maintenanceVacuumCleanupJobProcessor) prepareVacuumQueries() ([]string, error) {
	var rels []tableRelation
	_, err := p.cp.GetConnection().Query(&rels, `select schemaname, relname
				from pg_stat_all_tables where schemaname = 'public' and relname not like 'pg_%'
				                          and ((last_analyze is null and last_autoanalyze is null)
				        or last_analyze < (current_date - interval '1 day')
				        or last_autoanalyze < (current_date - interval '1 day'));`)
	if err != nil {
		return nil, err
	}

	return buildVacuumQueries(rels), nil
}

func buildVacuumQueries(rels []tableRelation) []string {
	vacuumQueries := make([]string, 0, len(rels))
	for _, rel := range rels {
		vacuumQueries = append(vacuumQueries, fmt.Sprintf("VACUUM FULL ANALYZE %s.\"%s\";", rel.Schema, rel.Name))
	}
	return vacuumQueries
}
