package main

import (
	"fmt"
	"os"
	"strings"

	"analyze-migration/internal/dbutil"
)

// currentSchemaTables are tried in order: error_build_notification is the current name on
// Netcracker/qubership-apihub-backend@tolerant_publication (commit 035107e renamed it from
// build_notification, same columns: build_id, severity, category, message, document_id). A build
// pinned to an earlier commit on that branch may still have the pre-rename name.
var currentSchemaTables = []string{"error_build_notification", "build_notification"}

func main() {
	if len(os.Args) != 3 {
		die("Usage: query-build-notifications MIGRATION_ID BUILD_ID")
	}
	migrationID := os.Args[1]
	buildID := os.Args[2]

	if err := dbutil.ValidateUUID("MIGRATION_ID", migrationID); err != nil {
		die(err.Error())
	}
	if err := dbutil.ValidateUUID("BUILD_ID", buildID); err != nil {
		die(err.Error())
	}

	cfg, err := dbutil.LoadConfig()
	if err != nil {
		die(err.Error())
	}

	tried := make([]string, 0, len(currentSchemaTables)+1)
	for _, table := range currentSchemaTables {
		setArgs := []string{
			"--set=migration_id=" + migrationID,
			"--set=build_id=" + buildID,
			"--set=notifications_table=" + table,
		}
		result, err := cfg.RunQuery(sqlCurrentSchema, setArgs)
		if err == nil {
			fmt.Println(result)
			return
		}
		tried = append(tried, table)
		if !strings.Contains(err.Error(), "does not exist") {
			fmt.Fprintln(os.Stderr, err.Error())
			os.Exit(1)
		}
	}

	// Pre-tolerant_publication schema: builder_notifications(build_id, severity, message, file_id),
	// no category column, file_id instead of document_id.
	setArgs := []string{
		"--set=migration_id=" + migrationID,
		"--set=build_id=" + buildID,
	}
	result, err := cfg.RunQuery(sqlLegacySchema, setArgs)
	if err == nil {
		fmt.Println(result)
		return
	}
	tried = append(tried, "builder_notifications")
	if !strings.Contains(err.Error(), "does not exist") {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	fmt.Fprintln(os.Stderr, "none of the known notifications tables exist in this schema ("+
		strings.Join(tried, ", ")+"); report this as a schema evidence gap, do not guess a fourth name")
	os.Exit(1)
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	os.Exit(1)
}

const sqlCurrentSchema = `WITH target_build AS (
	SELECT b.build_id, b.status, b.details, b.package_id, b.version, b.restart_count,
		b.metadata ->> 'migration_id' AS current_migration_id,
		b.metadata ->> 'build_type' AS build_type,
		b.metadata ->> 'previous_version' AS previous_version,
		b.metadata ->> 'previous_version_package_id' AS previous_version_package_id
	FROM :"db_schema".build AS b
	WHERE b.build_id = :'build_id'
), evidence AS (
	SELECT severity, category, message, document_id
	FROM :"db_schema".:"notifications_table"
	WHERE build_id = :'build_id'
	ORDER BY severity, document_id, message
	LIMIT 101
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'migration_id', :'migration_id',
	'build_id', :'build_id', 'notifications_table', :'notifications_table',
	'build_found', (SELECT count(*) > 0 FROM target_build),
	'build_migration_id_matches', (SELECT current_migration_id = :'migration_id' FROM target_build),
	'build', (SELECT json_build_object('status', status, 'details', details, 'package_id', package_id,
		'version', version, 'restart_count', restart_count, 'build_type', build_type,
		'previous_version', previous_version, 'previous_version_package_id', previous_version_package_id)
		FROM target_build),
	'truncated', (SELECT count(*) > 100 FROM evidence),
	'rows', COALESCE((SELECT json_agg(e) FROM (SELECT * FROM evidence LIMIT 100) AS e), '[]'::json));`

const sqlLegacySchema = `WITH target_build AS (
	SELECT b.build_id, b.status, b.details, b.package_id, b.version, b.restart_count,
		b.metadata ->> 'migration_id' AS current_migration_id,
		b.metadata ->> 'build_type' AS build_type,
		b.metadata ->> 'previous_version' AS previous_version,
		b.metadata ->> 'previous_version_package_id' AS previous_version_package_id
	FROM :"db_schema".build AS b
	WHERE b.build_id = :'build_id'
), evidence AS (
	SELECT severity, NULL::varchar AS category, message, file_id AS document_id
	FROM :"db_schema".builder_notifications
	WHERE build_id = :'build_id'
	ORDER BY severity, file_id, message
	LIMIT 101
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'migration_id', :'migration_id',
	'build_id', :'build_id', 'notifications_table', 'builder_notifications',
	'build_found', (SELECT count(*) > 0 FROM target_build),
	'build_migration_id_matches', (SELECT current_migration_id = :'migration_id' FROM target_build),
	'build', (SELECT json_build_object('status', status, 'details', details, 'package_id', package_id,
		'version', version, 'restart_count', restart_count, 'build_type', build_type,
		'previous_version', previous_version, 'previous_version_package_id', previous_version_package_id)
		FROM target_build),
	'truncated', (SELECT count(*) > 100 FROM evidence),
	'rows', COALESCE((SELECT json_agg(e) FROM (SELECT * FROM evidence LIMIT 100) AS e), '[]'::json));`
