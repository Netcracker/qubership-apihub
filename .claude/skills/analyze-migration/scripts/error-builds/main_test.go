package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/xuri/excelize/v2"
)

func TestCommandPipeline(t *testing.T) {
	const migration = "00000000-0000-4000-8000-000000000001"
	dir := t.TempDir()
	report := filepath.Join(dir, "report.json")
	classified := filepath.Join(dir, "classified.json")
	analysed := filepath.Join(dir, "analysed.json")
	md := filepath.Join(dir, "report-en.md")
	xlsx := filepath.Join(dir, "report.xlsx")
	input := `{"report":{"status":"complete","errorBuildsCount":1,"errorBuilds":[{"buildId":"00000000-0000-4000-8000-000000000002","packageId":"pkg","version":"1.0","revision":10,"error":"unknown error"}]}}`
	if err := os.WriteFile(report, []byte(input), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{
		{"classify", "-in", report, "-out", classified, "-migration-id", migration},
		{"build-report", "-in", classified, "-out", analysed},
		{"render-report", "-in", analysed, "-out", md},
		{"build-xlsx", "-in", analysed, "-out", xlsx},
	} {
		if err := run(args); err != nil {
			t.Fatalf("%v: %v", args, err)
		}
	}
	f, err := excelize.OpenFile(xlsx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := f.Close(); err != nil {
			t.Error(err)
		}
	}()
	value, err := f.GetCellValue("Builds", "I2")
	if err != nil || value != "insufficient data" {
		t.Fatalf("unproven cause was lost: %q (%v)", value, err)
	}
	if err := run([]string{"render-report", "-in", analysed, "-out", md}); err == nil {
		t.Fatal("overwrote existing report")
	}
}
