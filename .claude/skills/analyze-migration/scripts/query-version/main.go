package main

import (
	"fmt"
	"os"

	"analyze-migration/internal/dbutil"
)

func main() {
	if len(os.Args) != 6 {
		die("Usage: query-version MODE MIGRATION_ID PACKAGE_ID VERSION REVISION")
	}
	mode := os.Args[1]
	migrationID := os.Args[2]
	packageID := os.Args[3]
	version := os.Args[4]
	revision := os.Args[5]

	if err := dbutil.ValidateUUID("MIGRATION_ID", migrationID); err != nil {
		die(err.Error())
	}
	if err := dbutil.RequireValue("PACKAGE_ID", packageID); err != nil {
		die(err.Error())
	}
	if err := dbutil.RequireValue("VERSION", version); err != nil {
		die(err.Error())
	}
	if err := dbutil.ValidateRevision(revision); err != nil {
		die(err.Error())
	}
	switch mode {
	case "release-status", "unmigrated-version", "dependencies":
	default:
		die("unsupported version query mode.")
	}

	cfg, err := dbutil.LoadConfig()
	if err != nil {
		die(err.Error())
	}

	setArgs := []string{
		"--set=migration_id=" + migrationID,
		"--set=package_id=" + packageID,
		"--set=version=" + version,
		"--set=revision=" + revision,
	}

	var sql string
	if mode == "dependencies" {
		sql = sqlDependencies
	} else {
		setArgs = append(setArgs, "--set=mode="+mode)
		sql = sqlVersionStatus
	}

	result, err := cfg.RunQuery(sql, setArgs)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
	fmt.Println(result)
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	os.Exit(1)
}

const sqlDependencies = `WITH evidence AS (
	SELECT r.reference_id, r.reference_version, r.reference_revision, r.excluded,
		r.parent_reference_id, r.parent_reference_version, r.parent_reference_revision,
		p.package_id IS NOT NULL AS current_reference_exists, p.deleted_at,
		p.metadata ->> 'migration_id' AS current_migration_id,
		p.metadata ->> 'builder_version' AS current_builder_version,
		p.previous_version, p.previous_version_package_id
	FROM :"db_schema".published_version_reference AS r
	LEFT JOIN :"db_schema".published_version AS p
		ON (p.package_id, p.version, p.revision) = (r.reference_id, r.reference_version, r.reference_revision)
	WHERE (r.package_id, r.version, r.revision) = (:'package_id', :'version', :'revision'::integer)
	ORDER BY r.reference_id, r.reference_version, r.reference_revision,
		r.parent_reference_id, r.parent_reference_version, r.parent_reference_revision
	LIMIT 101
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'migration_id', :'migration_id',
	'package_id', :'package_id', 'version', :'version', 'revision', :'revision'::integer,
	'truncated', (SELECT count(*) > 100 FROM evidence),
	'rows', COALESCE((SELECT json_agg(e) FROM (SELECT * FROM evidence LIMIT 100) AS e), '[]'::json));`

const sqlVersionStatus = `WITH version_data AS (
	SELECT p.package_id, p.version, p.revision, p.status, p.published_at, p.deleted_at,
		p.previous_version, p.previous_version_package_id, g.kind,
		g.deleted_at AS package_deleted_at, p.metadata ->> 'migration_id' AS current_migration_id,
		p.metadata ->> 'builder_version' AS current_builder_version
	FROM :"db_schema".published_version AS p
	LEFT JOIN :"db_schema".package_group AS g ON g.id = p.package_id
	WHERE (p.package_id, p.version, p.revision) = (:'package_id', :'version', :'revision'::integer)
), builds AS (
	SELECT b.build_id, b.status, b.details, b.created_at, b.started_at, b.last_active,
		b.restart_count, b.builder_id, b.metadata ->> 'migration_stage' AS migration_stage,
		b.metadata ->> 'build_type' AS build_type,
		b.metadata ->> 'previous_version' AS previous_version,
		b.metadata ->> 'previous_version_package_id' AS previous_version_package_id
	FROM :"db_schema".build AS b
	WHERE :'mode' = 'unmigrated-version' AND b.package_id = :'package_id'
		AND b.version = :'version' || '@' || :'revision'
		AND b.metadata ->> 'migration_id' = :'migration_id'
	ORDER BY b.created_at, b.build_id
	LIMIT 101
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'mode', :'mode', 'migration_id', :'migration_id',
	'package_id', :'package_id', 'version', :'version', 'revision', :'revision'::integer,
	'rows', COALESCE((SELECT json_agg(v) FROM version_data AS v), '[]'::json),
	'builds_truncated', (SELECT count(*) > 100 FROM builds),
	'builds', COALESCE((SELECT json_agg(b) FROM (SELECT * FROM builds LIMIT 100) AS b), '[]'::json),
	'migration', (SELECT json_build_object('status', status, 'started_at', started_at, 'finished_at', finished_at)
	              FROM :"db_schema".migration_run WHERE id = :'migration_id'));`
