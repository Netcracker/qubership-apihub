package view

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestBaselineVersionsFromLegacyAgent(t *testing.T) {
	var baseline Baseline
	if err := json.Unmarshal([]byte(`{"packageId":"p","versions":["2026.1@2","2025.4@1"]}`), &baseline); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	want := []BaselineVersion{{Version: "2026.1@2"}, {Version: "2025.4@1"}}
	if !reflect.DeepEqual(baseline.Versions, want) {
		t.Errorf("versions = %+v, want %+v", baseline.Versions, want)
	}
}

func TestBaselineVersionsFromCurrentAgent(t *testing.T) {
	var baseline Baseline
	data := `{"packageId":"p","versions":[{"version":"2026.1@2","apiProcessorVersion":"4.1.0","hasErrors":true,"changelogHasErrors":true}]}`
	if err := json.Unmarshal([]byte(data), &baseline); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	want := []BaselineVersion{{Version: "2026.1@2", ApiProcessorVersion: "4.1.0", HasErrors: true, ChangelogHasErrors: true}}
	if !reflect.DeepEqual(baseline.Versions, want) {
		t.Errorf("versions = %+v, want %+v", baseline.Versions, want)
	}
}

func TestBaselineVersionRejectsOtherTypes(t *testing.T) {
	var version BaselineVersion
	if err := json.Unmarshal([]byte(`42`), &version); err == nil {
		t.Error("unmarshal of a number succeeded, want an error")
	}
}
