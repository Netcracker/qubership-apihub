package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"analyze-migration/internal/apiutil"
)

func main() {
	if len(os.Args) != 2 {
		die("Usage: get-suspicious-builds CATEGORY")
	}
	category := os.Args[1]
	if category == "" || strings.ContainsAny(category, "\r\n") {
		die("invalid CATEGORY")
	}

	migrationID := os.Getenv("MIGRATION_ID")
	if !isUUID(migrationID) {
		die("MIGRATION_ID is not a valid UUID")
	}

	q := url.Values{}
	q.Set("changedField", category)
	q.Set("limit", "5")
	endpoint := "/api/internal/migrate/operations/" + url.PathEscape(migrationID) +
		"/suspiciousBuilds?" + q.Encode()
	resp, err := apiutil.Get(endpoint)
	if err != nil {
		die("cannot retrieve suspicious builds: " + err.Error())
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "suspicious builds request returned HTTP %d\n", resp.StatusCode)
		os.Exit(1)
	}

	var body any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		die("response is not valid JSON: " + err.Error())
	}

	out := map[string]any{
		"collectedAt": time.Now().UTC().Format(time.RFC3339),
		"category":    category,
		"migrationID": migrationID,
		"builds":      body,
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
