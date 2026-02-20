package stages

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	log "github.com/sirupsen/logrus"
)

func (d OpsMigration) StageCleanupBefore() error {
	if len(d.ent.PackageIds) == 0 && len(d.ent.Versions) == 0 {
		// it means that we're going to rebuild all versions
		// this action will generate a lot of data and may cause DB disk overflow
		// Try to avoid too much space usage by cleaning up all old migration build data
		log.Infof("ops migration %s: Starting cleanup before full migration", d.ent.Id)
		if d.systemInfoService.IsMinioStorageActive() {
			ids, err := d.buildCleanupRepository.GetRemoveMigrationBuildIds(d.migrationCtx)
			if err != nil {
				return err
			}
			if len(ids) == 0 {
				log.Infof("ops migration %s: No migration build data to clean up", d.ent.Id)
			} else {
				err = d.minioStorageService.RemoveFiles(d.migrationCtx, view.BUILD_RESULT_TABLE, ids)
				if err != nil {
					return err
				}
				deleted, err := d.buildCleanupRepository.RemoveMigrationBuildSourceData(d.migrationCtx, ids)
				if err != nil {
					return err
				}
				log.Infof("ops migration %s: Cleanup before full migration cleaned up %d entries", d.ent.Id, deleted)
			}
		} else {
			deleted, err := d.buildCleanupRepository.RemoveMigrationBuildData(d.migrationCtx)
			if err != nil {
				return err
			}
			log.Infof("ops migration %s: Cleanup before full migration cleaned up %d entries", d.ent.Id, deleted)
		}

		err := d.runVacuumForAllTables()
		if err != nil {
			return err
		}
		d.resetStatStatements()

	}
	return nil
}

func (d OpsMigration) StageCleanupAfter() error {
	// delete temporary tables after migration end
	_, err := d.cp.GetConnection().Exec(fmt.Sprintf(`drop table migration."version_comparison_%s";`, d.ent.Id))
	if err != nil {
		log.Errorf("failed to cleanup migration tables: %v", err.Error())
	}
	_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`drop table migration."operation_comparison_%s";`, d.ent.Id))
	if err != nil {
		log.Errorf("failed to cleanup migration tables: %v", err.Error())
	}
	_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`drop table migration."expired_ts_operation_data_%s";`, d.ent.Id))
	if err != nil {
		log.Errorf("ops migration %s: failed to cleanup migration tables: %v", d.ent.Id, err.Error())
	}
	_, err = d.cp.GetConnection().Exec(fmt.Sprintf(`drop table migration."fts_operation_search_text_tmp_%s";`, d.ent.Id))
	if err != nil {
		log.Errorf("ops migration %s: failed to cleanup migration tables: %v", d.ent.Id, err.Error())
	}
	return nil
}

func (d OpsMigration) runVacuumForAllTables() error {
	log.Infof("ops migration %s: Run vacuum for all tables", d.ent.Id)

	type relation struct {
		Schema string `pg:"schemaname, type:varchar"`
		Name   string `pg:"relname, type:varchar"`
	}

	var rels []relation
	_, err := d.cp.GetConnection().Query(&rels, `select schemaname, relname
			from pg_stat_all_tables where schemaname = 'public' and relname not like 'pg_%'
			                          and ((last_analyze is null and last_autoanalyze is null)
			        or last_analyze < (current_date - interval '1 day')
			        or last_autoanalyze < (current_date - interval '1 day'));`)
	if err != nil {
		return err
	}
	vacuumQueries := []string{}
	for _, rel := range rels {
		vacuumQueries = append(vacuumQueries, fmt.Sprintf("VACUUM FULL ANALYZE %s.\"%s\";", rel.Schema, rel.Name))
	}
	for _, query := range vacuumQueries {
		_, err = d.cp.GetConnection().Exec(query)
		if err != nil {
			return err
		}
	}
	return nil
}

func (d OpsMigration) resetStatStatements() {
	log.Debugf("ops migration %s: Reset pg stat statements", d.ent.Id)
	_, err := d.cp.GetConnection().Exec(`select pg_stat_statements_reset();`) // Ignore error in this case
	if err != nil {
		log.Warnf("failed to reset stat statements: %v", err.Error())
	}
}
