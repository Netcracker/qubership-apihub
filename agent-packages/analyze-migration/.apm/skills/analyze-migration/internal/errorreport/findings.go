package errorreport

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
)

type Finding struct {
	BuildID        string `json:"buildId"`
	Cause          string `json:"cause"`
	Evidence       string `json:"evidence"`
	Classification string `json:"classification"`
}

type Findings struct {
	MigrationID string    `json:"migrationId"`
	Builds      []Finding `json:"builds"`
}

type Notifications struct {
	MigrationID      string `json:"migration_id"`
	BuildID          string `json:"build_id"`
	Table            string `json:"notifications_table"`
	Found            bool   `json:"build_found"`
	MigrationMatches bool   `json:"build_migration_id_matches"`
	Truncated        bool   `json:"truncated"`
	Rows             []struct {
		Severity   Text   `json:"severity"`
		Category   Text   `json:"category"`
		Message    string `json:"message"`
		DocumentID string `json:"document_id"`
	} `json:"rows"`
}

func ReadNotifications(data []byte) ([]Notifications, error) {
	decoder := json.NewDecoder(bytes.NewReader(bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))))
	var result []Notifications
	for {
		var n Notifications
		err := decoder.Decode(&n)
		if errors.Is(err, io.EOF) {
			return result, nil
		}
		if err != nil {
			return nil, fmt.Errorf("invalid notification JSON: %w", err)
		}
		result = append(result, n)
	}
}

func BuildReport(a Analysis, notifications []Notifications, findings Findings) (Analysis, error) {
	if err := a.Validate(false); err != nil {
		return Analysis{}, err
	}
	if findings.MigrationID != "" && findings.MigrationID != a.MigrationID || len(findings.Builds) > 0 && findings.MigrationID == "" {
		return Analysis{}, fmt.Errorf("findings migrationId must match the analysis")
	}
	a.Builds = append([]Build{}, a.Builds...)
	a.resolveCascades()
	index := make(map[string]int)
	for i, b := range a.Builds {
		index[b.BuildID] = i
	}
	notes := make(map[string]Notifications)
	for _, n := range notifications {
		if _, ok := index[n.BuildID]; !ok {
			return Analysis{}, fmt.Errorf("notifications reference unknown build %s", n.BuildID)
		}
		if n.MigrationID != a.MigrationID || !n.Found || !n.MigrationMatches || n.Table == "" {
			return Analysis{}, fmt.Errorf("notifications for %s do not establish a matching build and migration", n.BuildID)
		}
		if _, exists := notes[n.BuildID]; exists {
			return Analysis{}, fmt.Errorf("duplicate notifications for %s", n.BuildID)
		}
		notes[n.BuildID] = n
	}
	manual := make(map[string]Finding)
	for _, f := range findings.Builds {
		if _, ok := index[f.BuildID]; !ok {
			return Analysis{}, fmt.Errorf("finding references unknown build %s", f.BuildID)
		}
		if _, exists := manual[f.BuildID]; exists {
			return Analysis{}, fmt.Errorf("duplicate finding for %s", f.BuildID)
		}
		if strings.TrimSpace(f.Cause) == "" || strings.TrimSpace(f.Evidence) == "" || strings.TrimSpace(f.Classification) == "" {
			return Analysis{}, fmt.Errorf("finding for %s needs cause, evidence, and classification", f.BuildID)
		}
		manual[f.BuildID] = f
	}
	const (
		visiting = 1
		visited  = 2
	)
	state := make([]int, len(a.Builds))
	var resolve func(int) error
	resolve = func(i int) error {
		if state[i] == visited {
			return nil
		}
		if state[i] == visiting {
			return fmt.Errorf("cascade cycle includes build %s", a.Builds[i].BuildID)
		}
		state[i] = visiting
		b := &a.Builds[i]
		b.Cause = "The cause has not been established. Inspect the build's inputs, configuration, and relevant code."
		b.Evidence = "Migration " + a.MigrationID + ", errorBuilds entry " + b.BuildID + ", field error: " + b.Error
		b.Classification = InsufficientData
		if f, ok := manual[b.BuildID]; ok {
			b.Cause, b.Evidence, b.Classification = f.Cause, f.Evidence, f.Classification
		} else {
			switch b.EffectiveCategory {
			case CategoryContent:
				n, ok := notes[b.BuildID]
				if !ok {
					b.Cause = "Content validation failed; document-specific notifications have not been supplied."
				} else if len(n.Rows) == 0 {
					b.Cause = "The queried notifications table returned no rows. Inspect build.details or the result archive to establish the document-specific cause."
					b.Evidence += "; notifications_table=" + n.Table + ", rows=[]"
				} else {
					var messages []string
					for _, row := range n.Rows {
						messages = append(messages, fmt.Sprintf("document=%s; severity=%s; category=%s; message=%s", row.DocumentID, row.Severity, row.Category, row.Message))
					}
					b.Cause = "Content validation failed. Notifications: " + strings.Join(messages, "\n")
					b.Evidence += "; notifications_table=" + n.Table + ", rows[].message/document_id/severity/category"
					b.Classification = "content validation failure"
					if n.Truncated {
						b.Classification += "; notification evidence is truncated"
						b.Evidence += "; truncated=true"
					}
				}
			case CategoryMissing:
				b.Cause = "A referenced previous version was not found. Database evidence is needed to distinguish migration scope, deletion, and a chain-building defect."
			case CategoryCascade:
				if b.RootBuildID == "" {
					b.Cause = "Cannot establish the cascade root: " + b.RootStatus + "; previousVersion=" + b.PreviousVersion
				} else {
					rootIndex := index[b.RootBuildID]
					if err := resolve(rootIndex); err != nil {
						return err
					}
					root := a.Builds[rootIndex]
					b.Cause = "Cascade of " + root.BuildID + ": " + root.Cause
					b.Evidence += "; root evidence: " + root.Evidence
					b.Classification = "cascade of " + root.BuildID
					if strings.Contains(root.Classification, InsufficientData) {
						b.Classification += "; " + InsufficientData
					}
				}
			}
		}
		if b.Category == CategoryRestart {
			b.Cause = "Restart limit exceeded; underlying error (" + b.InnerCategory + "): " + b.Cause
		}
		state[i] = visited
		return nil
	}
	for i := range a.Builds {
		if err := resolve(i); err != nil {
			return Analysis{}, err
		}
	}
	return a, a.Validate(true)
}
