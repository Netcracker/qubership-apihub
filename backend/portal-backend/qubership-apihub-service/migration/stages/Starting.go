package stages

import (
	"fmt"
	"strings"
	"time"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	log "github.com/sirupsen/logrus"
)

const (
	lockPollInterval = 10 * time.Second
)

func (d OpsMigration) getLockMaxWait() time.Duration {
	return time.Duration(d.systemInfoService.GetMigrationLockMaxWaitMinutes()) * time.Minute
}

func (d OpsMigration) StageStarting() error {
	// When restarting, the previous PostgreSQL backend may still
	// be running a long query, holding a lock on the temp tables
	if d.restartStage != "" {
		if err := d.waitForLocks(); err != nil {
			return fmt.Errorf("ops migration %s: %w", d.ent.Id, err)
		}
	}

	err := d.createTempTablesWithRetry()
	if err != nil {
		return fmt.Errorf("ops migration %s: failed to create temp tables: %w", d.ent.Id, err)
	}

	return nil
}

func (d OpsMigration) createTempTablesWithRetry() error {
	maxAttempts := 1
	if d.restartStage != "" {
		maxAttempts = int(d.getLockMaxWait() / lockPollInterval)
	}

	// Retry on lock timeout as a safety net to handle unpredictable cases
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			log.Warnf("ops migration %s: lock timeout creating temp tables (attempt %d/%d)", d.ent.Id, attempt, maxAttempts)
			select {
			case <-time.After(lockPollInterval):
			case <-d.migrationCtx.Done():
				return d.migrationCtx.Err()
			}
		}

		err := d.createTempTables()
		if err == nil {
			if attempt > 0 {
				log.Infof("ops migration %s: temp tables created successfully after %d retries", d.ent.Id, attempt)
			}
			return nil
		}
		if d.restartStage == "" || !isLockTimeoutError(err) {
			return err
		}
	}
	return fmt.Errorf("timed out waiting for lock release after %d attempts", maxAttempts)
}

func (d OpsMigration) createTempTables() error {
	// create temporary tables required for suspicious builds analysis
	_, err := withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, `create schema if not exists migration;`)
	})
	if err != nil {
		return err
	}

	isPartialMigration := len(d.ent.PackageIds) > 0 || len(d.ent.Versions) > 0

	if isPartialMigration {
		whereClauses := ""
		params := make([]interface{}, 0)

		if len(d.ent.PackageIds) > 0 {
			whereClauses += " where package_id in (?)"
			params = append(params, pg.In(d.ent.PackageIds))
		}

		if len(d.ent.Versions) > 0 {
			extractedVersions := extractVersions(d.ent.Versions)
			if len(extractedVersions) > 0 {
				if len(params) == 0 {
					whereClauses += " where version in (?)"
				} else {
					whereClauses += " and version in (?)"
				}
				params = append(params, pg.In(extractedVersions))
			}
		}

		vcQuery := fmt.Sprintf(
			`create table if not exists migration."version_comparison_%s" as select * from version_comparison%s;`,
			d.ent.Id, whereClauses)
		_, err = withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().ExecContext(d.migrationCtx, vcQuery, params...)
		})
	} else {
		_, err = withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().ExecContext(d.migrationCtx,
				fmt.Sprintf(`create table if not exists migration."version_comparison_%s" as select * from version_comparison;`, d.ent.Id))
		})
	}
	if err != nil {
		return err
	}

	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create index if not exists "ix_ver_comp_%s"
on migration."version_comparison_%s"(package_id,version,revision,previous_package_id,previous_version,previous_revision);`, d.ent.Id, d.ent.Id))
	})
	if err != nil {
		return err
	}
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create index if not exists "ix_compid_%s" on migration."version_comparison_%s"(comparison_id)`, d.ent.Id, d.ent.Id))
	})
	if err != nil {
		return err
	}

	if isPartialMigration {
		ocQuery := fmt.Sprintf(
			`create table if not exists migration."operation_comparison_%s" as select oc.* from operation_comparison oc where oc.comparison_id in (select comparison_id from migration."version_comparison_%s");`,
			d.ent.Id, d.ent.Id)
		_, err = withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().ExecContext(d.migrationCtx, ocQuery)
		})
	} else if d.restartStage != "" {
		// The version_comparison temp table may have been created in a prior run; need to have consistent data in the operation_comparison temp table
		ocQuery := fmt.Sprintf(
			`create table if not exists migration."operation_comparison_%s" as select oc.* from operation_comparison oc where oc.comparison_id in (select comparison_id from migration."version_comparison_%s");`,
			d.ent.Id, d.ent.Id)
		_, err = withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().ExecContext(d.migrationCtx, ocQuery)
		})
	} else {
		_, err = withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().ExecContext(d.migrationCtx,
				fmt.Sprintf(`create table if not exists migration."operation_comparison_%s" as select * from operation_comparison;`, d.ent.Id))
		})
	}
	if err != nil {
		return err
	}

	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create index if not exists "operation_comparison_%s_comparison_id_index" on migration."operation_comparison_%s" (comparison_id);`, d.ent.Id, d.ent.Id))
	})
	if err != nil {
		return err
	}

	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create table if not exists migration."expired_ts_operation_data_%s" (package_id varchar, version varchar, revision integer);`, d.ent.Id))
	})
	if err != nil {
		return err
	}
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().ExecContext(d.migrationCtx,
			fmt.Sprintf(`create table if not exists migration."fts_operation_search_text_tmp_%s" (
			package_id varchar, version varchar, revision integer,
			operation_id varchar, api_type varchar, status varchar,
			search_data_hash varchar, search_text_data bytea, title varchar,
			PRIMARY KEY (package_id, version, revision, operation_id));`, d.ent.Id))
	})
	if err != nil {
		return err
	}
	return nil
}

func (d OpsMigration) waitForLocks() error {
	lockPattern := fmt.Sprintf("%%\\_%s", d.ent.Id)
	// Count all locks that were queued by the previous instance
	locksQuery := `SELECT count(*)
		FROM pg_locks l
		JOIN pg_class c ON l.relation = c.oid
		JOIN pg_namespace n ON c.relnamespace = n.oid
		WHERE n.nspname = 'migration'
		AND c.relname LIKE ?
		AND l.pid != pg_backend_pid()`

	var lockCount int
	_, err := withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().QueryOneContext(d.migrationCtx, pg.Scan(&lockCount), locksQuery, lockPattern)
	})
	if err != nil {
		return err
	}
	if lockCount == 0 {
		return nil
	}

	log.Infof("ops migration %s: found %d lock(s) on migration tables, waiting for release", d.ent.Id, lockCount)

	// Wait for locks to be released. The old backend will eventually finish its query
	// (commits the table) or PostgreSQL will detect the dead client connection (rolls back).
	maxPolls := int(d.getLockMaxWait() / lockPollInterval)
	for i := 0; i < maxPolls; i++ {
		select {
		case <-time.After(lockPollInterval):
		case <-d.migrationCtx.Done():
			return fmt.Errorf("migration cancelled while waiting for locks")
		}

		_, pollErr := withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().QueryOneContext(d.migrationCtx, pg.Scan(&lockCount), locksQuery, lockPattern)
		})
		if pollErr != nil {
			log.Warnf("ops migration %s: failed to query pg_locks during wait: %v", d.ent.Id, pollErr)
			continue
		}
		if lockCount == 0 {
			log.Infof("ops migration %s: locks released", d.ent.Id)
			return nil
		}
		if (i+1)%6 == 0 { //log every minute
			log.Infof("ops migration %s: still waiting for %d lock(s) to release", d.ent.Id, lockCount)
		}
	}
	return fmt.Errorf("locks were not released within %s", d.getLockMaxWait())
}

func isLockTimeoutError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "55P03")
}

func extractVersions(versionsIn []string) []string {
	extractedVersions := make([]string, 0, len(versionsIn))
	for _, ver := range versionsIn {
		verSplit := strings.Split(ver, "@")
		if len(verSplit) > 0 && verSplit[0] != "" {
			extractedVersions = append(extractedVersions, verSplit[0])
		}
	}
	return extractedVersions
}
