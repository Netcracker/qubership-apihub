package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"analyze-migration/internal/apiutil"
)

func main() {
	if len(os.Args) != 2 {
		die("Usage: get-apihub /api/PATH[?QUERY]")
	}
	resp, err := apiutil.Get(os.Args[1])
	if err != nil {
		die("cannot retrieve APIHub data: " + err.Error())
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		die(fmt.Sprintf("APIHub request returned HTTP %d", resp.StatusCode))
	}
	var body any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		die("response is not valid JSON: " + err.Error())
	}
	out := map[string]any{
		"collectedAt": time.Now().UTC().Format(time.RFC3339),
		"data":        body,
	}
	if err := json.NewEncoder(os.Stdout).Encode(out); err != nil {
		die("cannot encode output: " + err.Error())
	}
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	os.Exit(1)
}
