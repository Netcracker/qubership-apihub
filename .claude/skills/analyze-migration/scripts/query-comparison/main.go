package main

import (
	"fmt"
	"os"

	"analyze-migration/internal/dbutil"
)

func main() {
	if len(os.Args) != 8 {
		die("Usage: query-comparison MIGRATION_ID PACKAGE VERSION REVISION PREVIOUS_PACKAGE PREVIOUS_VERSION PREVIOUS_REVISION")
	}
	migrationID := os.Args[1]
	pkg := os.Args[2]
	version := os.Args[3]
	revision := os.Args[4]
	prevPkg := os.Args[5]
	prevVersion := os.Args[6]
	prevRevision := os.Args[7]

	if err := dbutil.ValidateUUID("MIGRATION_ID", migrationID); err != nil {
		die(err.Error())
	}
	for _, kv := range [][2]string{
		{"PACKAGE", pkg}, {"VERSION", version},
		{"PREVIOUS_PACKAGE", prevPkg}, {"PREVIOUS_VERSION", prevVersion},
	} {
		if err := dbutil.RequireValue(kv[0], kv[1]); err != nil {
			die(err.Error())
		}
	}
	if err := dbutil.ValidateRevision(revision); err != nil {
		die(err.Error())
	}
	if err := dbutil.ValidateRevision(prevRevision); err != nil {
		die(err.Error())
	}

	cfg, err := dbutil.LoadConfig()
	if err != nil {
		die(err.Error())
	}

	setArgs := []string{
		"--set=migration_id=" + migrationID,
		"--set=package_id=" + pkg,
		"--set=version=" + version,
		"--set=revision=" + revision,
		"--set=previous_package_id=" + prevPkg,
		"--set=previous_version=" + prevVersion,
		"--set=previous_revision=" + prevRevision,
	}
	result, err := cfg.RunQuery(sqlComparison, setArgs)
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

const sqlComparison = `WITH evidence AS (
	SELECT c.comparison_id, c.package_id, c.version, c.revision,
		c.previous_package_id, c.previous_version, c.previous_revision,
		c.builder_version AS current_builder_version, c.last_active,
		c.metadata ->> 'migration_id' AS current_migration_id
	FROM :"db_schema".version_comparison AS c
	WHERE (c.package_id, c.version, c.revision, c.previous_package_id, c.previous_version, c.previous_revision) =
		(:'package_id', :'version', :'revision'::integer, :'previous_package_id', :'previous_version', :'previous_revision'::integer)
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'migration_id', :'migration_id',
	'rows', COALESCE((SELECT json_agg(e) FROM evidence AS e), '[]'::json));`
