package errorreport

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"

	"analyze-migration/internal/dbutil"
)

const (
	CategoryContent  = "A"
	CategoryCascade  = "B"
	CategoryMissing  = "C"
	CategoryRestart  = "D"
	CategoryOther    = "E"
	InsufficientData = "insufficient data"
	publishBuildType = "build"
)

var Categories = []string{CategoryContent, CategoryCascade, CategoryMissing, CategoryRestart, CategoryOther}

var Explanations = map[string]string{
	CategoryContent: "Content validation failed. Inspect the build notifications for document-specific reasons.",
	CategoryCascade: "Cascade: a referenced previous version failed. Follow the exact version/revision to its root build.",
	CategoryMissing: "A referenced previous version was not found. Establish its migration scope and database state before assigning a cause.",
	CategoryRestart: "Restart limit exceeded. This wraps an earlier error; D -> <inner category> identifies the underlying error category.",
	CategoryOther:   "Other error requiring individual investigation of inputs, configuration, or code. This category alone does not establish a code defect.",
}

type Text string

func (s *Text) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte("null")) {
		*s = ""
		return nil
	}
	var value string
	if len(data) > 0 && data[0] == '"' {
		if err := json.Unmarshal(data, &value); err != nil {
			return err
		}
	} else {
		var number json.Number
		if err := json.Unmarshal(data, &number); err != nil {
			return fmt.Errorf("expected text or a number: %w", err)
		}
		value = number.String()
	}
	*s = Text(value)
	return nil
}

type Build struct {
	BuildID           string `json:"buildId"`
	BuildType         string `json:"buildType,omitempty"`
	PackageID         string `json:"packageId"`
	Version           string `json:"version"`
	Revision          Text   `json:"revision"`
	PreviousVersion   string `json:"previousVersion,omitempty"`
	PreviousPackageID string `json:"previousVersionPackageId,omitempty"`
	Error             string `json:"error"`
	Category          string `json:"category"`
	InnerCategory     string `json:"innerCategory,omitempty"`
	EffectiveCategory string `json:"effectiveCategory"`
	RootBuildID       string `json:"rootBuildId,omitempty"`
	RootStatus        string `json:"rootStatus,omitempty"`
	Cause             string `json:"cause"`
	Evidence          string `json:"evidence"`
	Classification    string `json:"classification"`
}

type Analysis struct {
	MigrationID      string  `json:"migrationId"`
	ErrorBuildsCount int     `json:"errorBuildsCount"`
	Builds           []Build `json:"builds"`
}

var restartPattern = regexp.MustCompile(`(?is)^\s*(?:Error:\s*)?Restart count exceeded limit\.\s*Details:\s*:?\s*`)
var contentPattern = regexp.MustCompile(`(?is)^\s*(?:Error:\s*)?Cannot publish version in release status:\s*\d+ critical errors in following documents:`)
var missingPattern = regexp.MustCompile(`(?is)No such version:\s*version:?\s*.+,\s*packageId:?\s*.+`)

func category(text string) string {
	switch {
	case restartPattern.MatchString(text):
		return CategoryRestart
	case contentPattern.MatchString(text):
		return CategoryContent
	case strings.Contains(strings.ToLower(text), "cannot be published because it contains errors and is the previous version of:"):
		return CategoryCascade
	case missingPattern.MatchString(text):
		return CategoryMissing
	default:
		return CategoryOther
	}
}

func ReadReport(data []byte, migrationID string) (Analysis, error) {
	if err := dbutil.ValidateUUID("migration ID", migrationID); err != nil {
		return Analysis{}, err
	}
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))
	var envelope struct {
		Report json.RawMessage `json:"report"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		return Analysis{}, err
	}
	if envelope.Report != nil {
		data = envelope.Report
	}
	var report struct {
		Status string  `json:"status"`
		Count  int     `json:"errorBuildsCount"`
		Builds []Build `json:"errorBuilds"`
	}
	if err := json.Unmarshal(data, &report); err != nil {
		return Analysis{}, err
	}
	if report.Status == "" || report.Count != len(report.Builds) {
		return Analysis{}, fmt.Errorf("report status is missing or errorBuildsCount does not match the build list")
	}
	result := Analysis{MigrationID: migrationID, ErrorBuildsCount: report.Count, Builds: append([]Build{}, report.Builds...)}
	for i := range result.Builds {
		b := &result.Builds[i]
		b.Category = category(b.Error)
		b.EffectiveCategory = b.Category
		b.InnerCategory, b.RootBuildID, b.RootStatus = "", "", ""
		b.Cause, b.Evidence, b.Classification = "", "", ""
		inner := b.Error
		for category(inner) == CategoryRestart {
			inner = restartPattern.ReplaceAllString(inner, "")
			b.InnerCategory = category(inner)
			b.EffectiveCategory = b.InnerCategory
		}
	}
	if err := result.Validate(false); err != nil {
		return Analysis{}, err
	}
	result.resolveCascades()
	return result, nil
}

func (a *Analysis) resolveCascades() {
	for i := range a.Builds {
		b := &a.Builds[i]
		b.RootBuildID, b.RootStatus = "", ""
		if b.EffectiveCategory != CategoryCascade {
			continue
		}
		if b.PreviousVersion == "" {
			b.RootStatus = "missing previousVersion in report"
			continue
		}
		pkg := b.PreviousPackageID
		if pkg == "" {
			pkg = b.PackageID // An omitted previous package means the same package.
		}
		version, revision, hasRevision := strings.Cut(b.PreviousVersion, "@")
		var matches []string
		for _, candidate := range a.Builds {
			if candidate.BuildType != "" && candidate.BuildType != publishBuildType {
				continue
			}
			if candidate.BuildID != b.BuildID && candidate.PackageID == pkg && candidate.Version == version &&
				(!hasRevision || string(candidate.Revision) == revision) {
				matches = append(matches, candidate.BuildID)
			}
		}
		switch len(matches) {
		case 0:
			b.RootStatus = "referenced version/revision has no error build in this report"
		case 1:
			b.RootBuildID, b.RootStatus = matches[0], "found in report"
		default:
			b.RootStatus = "ambiguous root builds: " + strings.Join(matches, ", ")
		}
	}
}

func (a Analysis) Validate(requireFindings bool) error {
	if err := dbutil.ValidateUUID("migration ID", a.MigrationID); err != nil {
		return err
	}
	if a.Builds == nil {
		return fmt.Errorf("analysis must contain a builds array, even when empty")
	}
	if a.ErrorBuildsCount != len(a.Builds) {
		return fmt.Errorf("errorBuildsCount does not match the analysis build list")
	}
	seen := make(map[string]bool)
	for _, b := range a.Builds {
		if err := dbutil.ValidateUUID("build ID", b.BuildID); err != nil {
			return err
		}
		if seen[b.BuildID] {
			return fmt.Errorf("duplicate build ID %s", b.BuildID)
		}
		seen[b.BuildID] = true
		if _, ok := Explanations[b.Category]; !ok {
			return fmt.Errorf("invalid category for build %s", b.BuildID)
		}
		if _, ok := Explanations[b.EffectiveCategory]; !ok || b.EffectiveCategory == CategoryRestart {
			return fmt.Errorf("invalid effective category for build %s", b.BuildID)
		}
		if requireFindings && (strings.TrimSpace(b.Cause) == "" || strings.TrimSpace(b.Evidence) == "" || strings.TrimSpace(b.Classification) == "") {
			return fmt.Errorf("build %s needs a cause, evidence, and classification before export", b.BuildID)
		}
	}
	return nil
}

func ReadAnalysis(data []byte) (Analysis, error) {
	var result Analysis
	if err := json.Unmarshal(bytes.TrimPrefix(data, []byte("\xef\xbb\xbf")), &result); err != nil {
		return result, err
	}
	return result, result.Validate(false)
}

func Encode(w io.Writer, value any) error {
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	return encoder.Encode(value)
}
