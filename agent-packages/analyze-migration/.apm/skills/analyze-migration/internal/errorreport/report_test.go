package errorreport

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/xuri/excelize/v2"
)

const testMigration = "00000000-0000-4000-8000-000000000001"

func testBuildID(n int) string {
	return fmt.Sprintf("00000000-0000-4000-8000-%012d", n)
}

func classifyFixture(t *testing.T, builds []Build) Analysis {
	t.Helper()
	data, err := json.Marshal(map[string]any{"report": map[string]any{"status": "complete", "errorBuildsCount": len(builds), "errorBuilds": builds}})
	if err != nil {
		t.Fatal(err)
	}
	a, err := ReadReport(data, testMigration)
	if err != nil {
		t.Fatal(err)
	}
	return a
}

func TestCascadeUsesReferencedRevisionAndPropagatesRootEvidence(t *testing.T) {
	builds := []Build{
		{BuildID: testBuildID(2), PackageID: "pkg", Version: "1.0", Revision: "1", Error: "Cannot publish version in release status: 1 critical errors in following documents: spec.yaml"},
		{BuildID: testBuildID(3), PackageID: "pkg", Version: "1.0", Revision: "2", Error: "different error"},
		{BuildID: testBuildID(4), PackageID: "pkg", Version: "2.0", Revision: "1", PreviousVersion: "1.0@1", Error: "Restart count exceeded limit. Details: Error: version cannot be published because it contains errors and is the previous version of: irrelevant|3.0@9"},
	}
	a := classifyFixture(t, builds)
	if a.Builds[2].RootBuildID != builds[0].BuildID || a.Builds[2].InnerCategory != CategoryCascade {
		t.Fatalf("wrong root or wrapped category: %+v", a.Builds[2])
	}
	result, err := BuildReport(a, nil, Findings{MigrationID: testMigration, Builds: []Finding{{BuildID: builds[0].BuildID, Cause: "Invalid schema type", Evidence: "sources.zip:spec.yaml:7", Classification: "input issue"}}})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(result.Builds[2].Cause, "Invalid schema type") || !strings.Contains(result.Builds[2].Evidence, "spec.yaml:7") {
		t.Fatalf("cascade lost root evidence: %+v", result.Builds[2])
	}
	builds[2].PreviousVersion = "1.0"
	a = classifyFixture(t, builds)
	if a.Builds[2].RootBuildID != "" || !strings.Contains(a.Builds[2].RootStatus, "ambiguous") {
		t.Fatal("ambiguous revisions must not select the highest revision")
	}
	builds[1].BuildType = "changelog"
	a = classifyFixture(t, builds)
	if a.Builds[2].RootBuildID != builds[0].BuildID {
		t.Fatal("a changelog build must not be used as a publication cascade root")
	}
	a.Builds[2].PreviousVersion = ""
	result, err = BuildReport(a, nil, Findings{})
	if err != nil || result.Builds[2].RootBuildID != "" {
		t.Fatal("a stale root link survived resolution")
	}
}

func TestNotificationsAreEvidenceNotAssumedArchiveResults(t *testing.T) {
	a := classifyFixture(t, []Build{{BuildID: testBuildID(2), Error: "Error: Cannot publish version in release status: 2 critical errors in following documents: spec.yaml"}})
	input := fmt.Sprintf(`{"migration_id":%q,"build_id":%q,"notifications_table":"build_notification","build_found":true,"build_migration_id_matches":true,"rows":[{"severity":"error","category":"schema","message":"Unknown type","document_id":"spec.yaml"}],"truncated":true}`, testMigration, testBuildID(2))
	notes, err := ReadNotifications([]byte(input))
	if err != nil {
		t.Fatal(err)
	}
	result, err := BuildReport(a, notes, Findings{})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(result.Builds[0].Cause, "Unknown type") || !strings.Contains(result.Builds[0].Evidence, "truncated=true") {
		t.Fatalf("missing notification details: %+v", result.Builds[0])
	}
	notes[0].Rows = nil
	result, err = BuildReport(a, notes, Findings{})
	if err != nil {
		t.Fatal(err)
	}
	if result.Builds[0].Classification != InsufficientData || strings.Contains(result.Builds[0].Cause, "404") {
		t.Fatal("empty notifications must not invent archive evidence or claim a proven cause")
	}
	notes[0].MigrationID = testBuildID(99)
	if _, err := BuildReport(a, notes, Findings{}); err == nil {
		t.Fatal("accepted evidence from a different migration")
	}
}

func TestWorkbookPreservesIdentifiersAndIncludesEnglishCategoryLegend(t *testing.T) {
	a := classifyFixture(t, []Build{{BuildID: testBuildID(2), PackageID: "=1+1", Version: "001.20", Revision: "9007199254740993", Error: "source <tag> | failed\nnext line"}})
	a, err := BuildReport(a, nil, Findings{MigrationID: testMigration, Builds: []Finding{{BuildID: testBuildID(2), Cause: "Invalid input", Evidence: "archive.zip:spec.yaml:3", Classification: "input issue"}}})
	if err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	if err := Workbook(&out, a); err != nil {
		t.Fatal(err)
	}
	f, err := excelize.OpenReader(bytes.NewReader(out.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := f.Close(); err != nil {
			t.Error(err)
		}
	})
	if sheets := f.GetSheetList(); len(sheets) != 2 || sheets[0] != "Summary" || sheets[1] != "Builds" {
		t.Fatalf("unexpected workbook sheets: %v", sheets)
	}
	for cell, expected := range map[string]string{"A2": testBuildID(2), "B2": "=1+1", "C2": "001.20", "D2": "9007199254740993", "F2": a.Builds[0].Error, "G2": "Invalid input", "H2": "archive.zip:spec.yaml:3"} {
		got, err := f.GetCellValue("Builds", cell)
		if err != nil || got != expected {
			t.Fatalf("%s: got %q, want %q (%v)", cell, got, expected, err)
		}
		formula, err := f.GetCellFormula("Builds", cell)
		if err != nil || formula != "" {
			t.Fatalf("%s is unexpectedly a formula", cell)
		}
	}
	for row := 4; row <= 8; row++ { // The five category legend entries follow three metadata/header rows.
		value, err := f.GetCellValue("Summary", fmt.Sprintf("D%d", row))
		if err != nil || value == "" {
			t.Fatalf("missing category explanation at row %d", row)
		}
	}
	count, err := f.GetCellValue("Summary", "B2")
	if err != nil || count != "1" {
		t.Fatalf("incorrect total: %q, %v", count, err)
	}
	var md bytes.Buffer
	if err := Markdown(&md, a); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(md.String(), "<tag>") || !strings.Contains(md.String(), "&#124;") || !strings.Contains(md.String(), "9007199254740993") {
		t.Fatal("Markdown did not escape evidence or preserve revision text")
	}
	a.Builds[0].Cause = strings.Repeat("x", excelCellLimit+1)
	if err := Workbook(&bytes.Buffer{}, a); err == nil {
		t.Fatal("oversized evidence must not be silently truncated")
	}
}

func TestRejectIncompleteAndMalformedReports(t *testing.T) {
	for _, input := range []string{`{}`, `null`, `{"status":"complete","errorBuildsCount":2}`, `{"report":null}`, `{"status":"complete","errorBuildsCount":-1}`} {
		if _, err := ReadReport([]byte(input), testMigration); err == nil {
			t.Fatalf("accepted invalid report: %s", input)
		}
	}
	a, err := ReadReport([]byte(`{"status":"complete"}`), testMigration)
	if err != nil || len(a.Builds) != 0 {
		t.Fatalf("omitted zero counter: %v", err)
	}
	result, err := BuildReport(a, nil, Findings{})
	if err != nil {
		t.Fatal(err)
	}
	if err := Workbook(&bytes.Buffer{}, result); err != nil {
		t.Fatal(err)
	}
	a = classifyFixture(t, []Build{{BuildID: testBuildID(2), Error: "No such version: version 1.0, packageId pkg"}})
	if err := Workbook(&bytes.Buffer{}, a); err == nil {
		t.Fatal("unanalysed builds must not be exported as completed findings")
	}
	result, err = BuildReport(a, nil, Findings{})
	if err != nil || result.Builds[0].Classification != InsufficientData {
		t.Fatalf("missing evidence must remain explicit: %+v, %v", result, err)
	}
	result.Builds = []Build{}
	if err := Workbook(&bytes.Buffer{}, result); err == nil {
		t.Fatal("export accepted an analysis with omitted builds")
	}
}

func TestCascadeCycleFails(t *testing.T) {
	message := "cannot be published because it contains errors and is the previous version of: other"
	a := classifyFixture(t, []Build{
		{BuildID: testBuildID(2), PackageID: "pkg", Version: "1", Revision: "1", PreviousVersion: "2@1", Error: message},
		{BuildID: testBuildID(3), PackageID: "pkg", Version: "2", Revision: "1", PreviousVersion: "1@1", Error: message},
	})
	if _, err := BuildReport(a, nil, Findings{}); err == nil {
		t.Fatal("cascade cycle must fail explicitly")
	}
}
