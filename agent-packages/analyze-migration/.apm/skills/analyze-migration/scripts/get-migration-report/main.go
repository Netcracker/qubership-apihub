package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"analyze-migration/internal/apiutil"
)

func main() {
	migrationID := os.Getenv("MIGRATION_ID")

	if !isUUID(migrationID) {
		die("MIGRATION_ID is not a valid UUID")
	}

	endpoint := "/api/internal/migrate/operations/" + url.PathEscape(migrationID) + "?includeBuildSamples=false"
	resp, err := apiutil.Get(endpoint)
	if err != nil {
		die("cannot retrieve migration report: " + err.Error())
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "migration request returned HTTP %d; check the base URL and access\n", resp.StatusCode)
		os.Exit(1)
	}

	var report map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&report); err != nil {
		die("response is not valid JSON: " + err.Error())
	}
	if report["status"] == nil {
		die("response is not a migration report: status is missing")
	}

	out := map[string]any{
		"collectedAt": time.Now().UTC().Format(time.RFC3339),
		"report":      report,
	}
	if err := json.NewEncoder(os.Stdout).Encode(out); err != nil {
		die("cannot encode output: " + err.Error())
	}
}

func isUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, c := range s {
		switch i {
		case 8, 13, 18, 23:
			if c != '-' {
				return false
			}
		default:
			if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
				return false
			}
		}
	}
	return true
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	os.Exit(1)
}
