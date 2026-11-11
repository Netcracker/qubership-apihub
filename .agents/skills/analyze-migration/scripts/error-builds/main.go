package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"

	"analyze-migration/internal/artifact"
	"analyze-migration/internal/errorreport"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 {
		return errors.New("usage: error-builds classify|build-report|render-report|build-xlsx -in INPUT -out OUTPUT [-migration-id UUID] [-notifications JSONL] [-findings JSON]")
	}
	command := args[0]
	flags := flag.NewFlagSet(command, flag.ContinueOnError)
	in := flags.String("in", "", "input JSON file")
	out := flags.String("out", "", "new output file; existing files are never overwritten")
	var migrationID, notificationsPath, findingsPath *string
	switch command {
	case "classify":
		migrationID = flags.String("migration-id", "", "full migration UUID")
	case "build-report":
		notificationsPath = flags.String("notifications", "", "optional query-build-notifications JSONL file")
		findingsPath = flags.String("findings", "", "optional per-build findings JSON file")
	case "render-report", "build-xlsx":
	default:
		return fmt.Errorf("unknown command %q", command)
	}
	if err := flags.Parse(args[1:]); err != nil {
		return err
	}
	if *in == "" || *out == "" || flags.NArg() != 0 {
		return errors.New("-in and -out are required; positional arguments are not supported")
	}
	data, err := os.ReadFile(*in)
	if err != nil {
		return err
	}
	var a errorreport.Analysis
	if command == "classify" {
		a, err = errorreport.ReadReport(data, *migrationID)
	} else {
		a, err = errorreport.ReadAnalysis(data)
	}
	if err != nil {
		return err
	}
	if command == "build-report" {
		var notifications []errorreport.Notifications
		var findings errorreport.Findings
		if *notificationsPath != "" {
			data, err := os.ReadFile(*notificationsPath)
			if err != nil {
				return err
			}
			notifications, err = errorreport.ReadNotifications(data)
			if err != nil {
				return err
			}
		}
		if *findingsPath != "" {
			data, err := os.ReadFile(*findingsPath)
			if err != nil {
				return err
			}
			if err := json.Unmarshal(data, &findings); err != nil {
				return err
			}
		}
		a, err = errorreport.BuildReport(a, notifications, findings)
		if err != nil {
			return err
		}
	}
	return artifact.WriteNew(*out, func(w io.Writer) error {
		switch command {
		case "render-report":
			return errorreport.Markdown(w, a)
		case "build-xlsx":
			return errorreport.Workbook(w, a)
		default:
			return errorreport.Encode(w, a)
		}
	})
}
