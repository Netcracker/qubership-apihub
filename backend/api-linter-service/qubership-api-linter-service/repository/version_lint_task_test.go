package repository

import (
	"regexp"
	"testing"

	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

// unreachableAddr refuses TCP connections immediately, so Select() fails fast
// without a live PostgreSQL instance while still letting go-pg render the SQL text.
const unreachableAddr = "127.0.0.1:1"

var whitespaceRe = regexp.MustCompile(`\s+`)

func normalizeWhitespace(s string) string {
	return whitespaceRe.ReplaceAllString(s, " ")
}

// TestApplyRunningTaskFilter_GroupsStatusPredicates is a regression test for
// https://github.com/Netcracker/qubership-apihub/issues/824: GET /validation/summary
// reported status "running" for a version with no active lint tasks because the
// status predicates were rendered as bare "OR" conditions. SQL "AND" binds tighter
// than "OR", so they escaped the package/version/revision filter and matched tasks
// belonging to other versions. applyRunningTaskFilter must keep the status predicates
// grouped in parentheses and ANDed onto the package/version/revision filter.
func TestApplyRunningTaskFilter_GroupsStatusPredicates(t *testing.T) {
	var tasks []entity.VersionLintTask
	db := pg.Connect(&pg.Options{Addr: unreachableAddr})
	q := applyRunningTaskFilter(db.Model(&tasks), "pkg-1", "1.2.3", 7)

	if err := q.Select(); err == nil {
		t.Fatal("expected Select to fail without a live database connection")
	}

	sql := normalizeWhitespace(orm.NewSelectQuery(q).String())

	filterRe := regexp.MustCompile(`\(package_id = 'pkg-1'\) AND \(version = '1\.2\.3'\) AND \(revision = 7\)`)
	if !filterRe.MatchString(sql) {
		t.Fatalf("expected package_id/version/revision filters to be ANDed together, got: %s", sql)
	}

	groupRe := regexp.MustCompile(`\(revision = 7\) AND \(\(status = 'not_started'\) OR \(status = 'processing'\) OR \(status = 'waiting_for_docs'\)\)`)
	if !groupRe.MatchString(sql) {
		t.Fatalf("expected the three status predicates to be grouped in one parenthesised OR clause ANDed onto the version filter, got: %s", sql)
	}

	// The actual defect: a status predicate rendered as a bare "OR" right after the
	// revision filter, outside the parenthesised group, which lets it match tasks for
	// any package/version/revision instead of just this one.
	danglingRe := regexp.MustCompile(`\(revision = 7\) OR \(?status`)
	if danglingRe.MatchString(sql) {
		t.Fatalf("status predicate escaped the package_id/version/revision filter: %s", sql)
	}
}
