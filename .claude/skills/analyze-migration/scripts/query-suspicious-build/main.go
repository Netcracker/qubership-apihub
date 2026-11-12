package main

import (
	"fmt"
	"os"

	"analyze-migration/internal/dbutil"
)

func main() {
	if len(os.Args) < 5 {
		die("Usage: query-suspicious-build CATEGORY MIGRATION_ID BUILD_ID OBJECT_ID [OBJECT_DETAILS...]")
	}
	category := os.Args[1]
	migrationID := os.Args[2]
	buildID := os.Args[3]
	objectID := os.Args[4]

	if err := dbutil.ValidateUUID("MIGRATION_ID", migrationID); err != nil {
		die(err.Error())
	}
	if err := dbutil.ValidateUUID("BUILD_ID", buildID); err != nil {
		die(err.Error())
	}
	if err := dbutil.RequireValue("OBJECT_ID", objectID); err != nil {
		die(err.Error())
	}

	cfg, err := dbutil.LoadConfig()
	if err != nil {
		die(err.Error())
	}

	var sql string
	var setArgs []string

	switch category {
	case "operation.PreviousReleaseVersions":
		if len(os.Args) != 5 {
			die("PreviousReleaseVersions requires exactly four arguments.")
		}
		setArgs = []string{
			"--set=migration_id=" + migrationID,
			"--set=build_id=" + buildID,
			"--set=object_id=" + objectID,
		}
		sql = sqlPreviousReleaseVersions

	case "operation_comparison.NotFound", "operation_comparison.Unexpected",
		"operation_comparison.Changes", "operation_comparison.ChangesSummary",
		"operation_comparison.TotalChangesSummary", "operation_comparison.ComparisonInternalDocumentId":
		if len(os.Args) != 7 {
			die("operation comparison requires CATEGORY MIGRATION_ID BUILD_ID COMPARISON_ID OPERATION_ID PREVIOUS_OPERATION_ID.")
		}
		comparisonID := objectID
		operationID := os.Args[5]
		previousOperationID := os.Args[6]
		if operationID == "" && previousOperationID == "" {
			die("at least one operation ID is required.")
		}
		changeKey := "ComparisonId:" + comparisonID + ";OperationId:" + operationID + ";PreviousOperationId:" + previousOperationID
		setArgs = []string{
			"--set=migration_id=" + migrationID,
			"--set=build_id=" + buildID,
			"--set=category=" + category,
			"--set=comparison_id=" + comparisonID,
			"--set=operation_id=" + operationID,
			"--set=previous_operation_id=" + previousOperationID,
			"--set=change_key=" + changeKey,
		}
		sql = sqlOperationComparison

	case "comparison_internal_document.NotFound", "comparison_internal_document.Unexpected",
		"comparison_internal_document.Hash":
		if len(os.Args) != 11 {
			die("document requires CATEGORY MIGRATION_ID BUILD_ID DOCUMENT_ID PACKAGE VERSION REVISION PREVIOUS_PACKAGE PREVIOUS_VERSION PREVIOUS_REVISION.")
		}
		revision := os.Args[7]
		prevRevision := os.Args[10]
		if err := dbutil.ValidateRevision(revision); err != nil {
			die(err.Error())
		}
		if err := dbutil.ValidateRevision(prevRevision); err != nil {
			die(err.Error())
		}
		setArgs = []string{
			"--set=migration_id=" + migrationID,
			"--set=build_id=" + buildID,
			"--set=category=" + category,
			"--set=document_id=" + objectID,
			"--set=package_id=" + os.Args[5],
			"--set=version=" + os.Args[6],
			"--set=revision=" + revision,
			"--set=previous_package_id=" + os.Args[8],
			"--set=previous_version=" + os.Args[9],
			"--set=previous_revision=" + prevRevision,
		}
		sql = sqlComparisonInternalDocument

	default:
		die("unsupported category. Report the missing evidence; do not substitute arbitrary SQL.")
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

const sqlPreviousReleaseVersions = `WITH evidence AS (
	SELECT m.package_id, m.version, m.revision,
		m.changes -> 'operation' -> :'object_id' -> 'PreviousReleaseVersions' AS recorded_change,
		o.operation_id IS NOT NULL AS current_operation_exists,
		o.previous_release_versions AS current_release_versions,
		pv.published_at AS current_published_at,
		pv.metadata ->> 'builder_version' AS current_builder_version,
		pv.metadata ->> 'migration_id' AS current_migration_id
	FROM :"db_schema".migrated_version_changes AS m
	LEFT JOIN :"db_schema".operation AS o
		ON (o.package_id, o.version, o.revision, o.operation_id) =
		   (m.package_id, m.version, m.revision::integer, :'object_id')
	LEFT JOIN :"db_schema".published_version AS pv
		ON (pv.package_id, pv.version, pv.revision) = (m.package_id, m.version, m.revision::integer)
	WHERE m.migration_id = :'migration_id' AND m.build_id = :'build_id'
		AND 'operation.PreviousReleaseVersions' = ANY(m.unique_changes)
		AND m.changes -> 'operation' -> :'object_id' -> 'PreviousReleaseVersions' IS NOT NULL
	LIMIT 101
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'migration_id', :'migration_id',
	'build_id', :'build_id', 'category', 'operation.PreviousReleaseVersions', 'object_id', :'object_id',
	'truncated', (SELECT count(*) > 100 FROM evidence),
	'rows', COALESCE((SELECT json_agg(e) FROM (SELECT * FROM evidence LIMIT 100) AS e), '[]'::json));`

const sqlOperationComparison = `WITH sample AS (
	SELECT CASE WHEN jsonb_typeof(changes -> 'operation_comparison' -> :'change_key') = 'object'
		THEN changes -> 'operation_comparison' -> :'change_key' -> split_part(:'category', '.', 2)
		ELSE changes -> 'operation_comparison' -> :'change_key' END AS recorded_change
	FROM :"db_schema".migrated_version_changes
	WHERE migration_id = :'migration_id' AND build_id = :'build_id'
		AND :'category' = ANY(unique_changes)
		AND (changes -> 'operation_comparison' -> :'change_key' -> split_part(:'category', '.', 2) IS NOT NULL
		     OR (split_part(:'category', '.', 2) IN ('NotFound', 'Unexpected')
		         AND jsonb_typeof(changes -> 'operation_comparison' -> :'change_key') = 'string'))
	LIMIT 1
), evidence AS (
	SELECT s.recorded_change, c.comparison_id IS NOT NULL AS current_comparison_exists,
		c.package_id, c.version, c.revision, c.previous_package_id, c.previous_version, c.previous_revision,
		c.builder_version AS current_builder_version, c.last_active AS current_last_active,
		c.metadata ->> 'migration_id' AS current_migration_id,
		o.comparison_id IS NOT NULL AS current_operation_comparison_exists,
		o.operation_id, o.previous_operation_id, o.changes_summary,
		o.comparison_internal_document_id, o.data_hash, o.previous_data_hash
	FROM sample AS s
	LEFT JOIN :"db_schema".version_comparison AS c ON c.comparison_id = :'comparison_id'
	LEFT JOIN :"db_schema".operation_comparison AS o
		ON o.comparison_id = c.comparison_id
		AND COALESCE(o.operation_id, '') = :'operation_id'
		AND COALESCE(o.previous_operation_id, '') = :'previous_operation_id'
	LIMIT 101
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'migration_id', :'migration_id',
	'build_id', :'build_id', 'category', :'category', 'object_id', :'change_key',
	'truncated', (SELECT count(*) > 100 FROM evidence),
	'rows', COALESCE((SELECT json_agg(e) FROM (SELECT * FROM evidence LIMIT 100) AS e), '[]'::json));`

const sqlComparisonInternalDocument = `WITH sample AS (
	SELECT CASE WHEN jsonb_typeof(changes -> 'comparison_internal_document' -> :'document_id') = 'object'
		THEN changes -> 'comparison_internal_document' -> :'document_id' -> split_part(:'category', '.', 2)
		ELSE changes -> 'comparison_internal_document' -> :'document_id' END AS recorded_change
	FROM :"db_schema".migrated_version_changes
	WHERE migration_id = :'migration_id' AND build_id = :'build_id'
		AND :'category' = ANY(unique_changes)
		AND (changes -> 'comparison_internal_document' -> :'document_id' -> split_part(:'category', '.', 2) IS NOT NULL
		     OR (split_part(:'category', '.', 2) IN ('NotFound', 'Unexpected')
		         AND jsonb_typeof(changes -> 'comparison_internal_document' -> :'document_id') = 'string'))
	LIMIT 1
), evidence AS (
	SELECT s.recorded_change, d.document_id IS NOT NULL AS current_document_exists,
		d.package_id, d.version, d.revision, d.previous_package_id, d.previous_version, d.previous_revision,
		d.document_id, d.filename, d.hash AS current_hash,
		EXISTS (SELECT 1 FROM :"db_schema".comparison_internal_document_data AS data
		        WHERE data.hash = d.hash) AS current_document_data_exists
	FROM sample AS s
	LEFT JOIN :"db_schema".comparison_internal_document AS d
		ON (d.package_id, d.version, d.revision, d.previous_package_id, d.previous_version, d.previous_revision, d.document_id) =
		   (:'package_id', :'version', :'revision'::integer, :'previous_package_id', :'previous_version', :'previous_revision'::integer, :'document_id')
)
SELECT json_build_object('collected_at', CURRENT_TIMESTAMP, 'migration_id', :'migration_id',
	'build_id', :'build_id', 'category', :'category', 'object_id', :'document_id',
	'rows', COALESCE((SELECT json_agg(e) FROM evidence AS e), '[]'::json));`
