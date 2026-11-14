package view

import "time"

type ChangeSeverity string

const (
	ChangeSeverityBreaking    ChangeSeverity = "breaking"
	ChangeSeverityNonBreaking ChangeSeverity = "non-breaking"
	ChangeSeverityAnnotation  ChangeSeverity = "annotation"
)

func (s ChangeSeverity) Valid() bool {
	switch s {
	case ChangeSeverityBreaking, ChangeSeverityNonBreaking, ChangeSeverityAnnotation:
		return true
	}
	return false
}

type ChangeType string

const (
	ChangeTypeAdded      ChangeType = "added"
	ChangeTypeRemoved    ChangeType = "removed"
	ChangeTypeChanged    ChangeType = "changed"
	ChangeTypeDeprecated ChangeType = "deprecated"
)

func (t ChangeType) Valid() bool {
	switch t {
	case ChangeTypeAdded, ChangeTypeRemoved, ChangeTypeChanged, ChangeTypeDeprecated:
		return true
	}
	return false
}

type ChangeSummary struct {
	ComparisonId      string         `json:"comparisonId"`
	LibraryId         string         `json:"libraryId"`
	Version           string         `json:"version"`
	PreviousLibraryId string         `json:"previousLibraryId"`
	PreviousVersion   string         `json:"previousVersion"`
	ChangeCounts      map[string]int `json:"changeCounts,omitempty"`
	OpenCount         int            `json:"openCount"`
	NoContent         bool           `json:"noContent"`
	BuilderVersion    string         `json:"builderVersion,omitempty"`
	LastActive        time.Time      `json:"lastActive"`
}

type Change struct {
	ChangeId    string                 `json:"changeId"`
	ClassId     string                 `json:"classId"`
	MethodId    string                 `json:"methodId,omitempty"`
	ChangeType  ChangeType             `json:"changeType"`
	Severity    ChangeSeverity         `json:"severity"`
	Description string                 `json:"description,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
}

type VersionChanges struct {
	Comparison ChangeSummary `json:"comparison"`
	Changes    []Change      `json:"changes"`
}

// ComparisonKey identifies one comparison: a version of a library against a version of a — possibly
// different — library. A cross-library pair is how an upgrade-impact diff is stored.
type ComparisonKey struct {
	LibraryId         string
	Version           string
	PreviousLibraryId string
	PreviousVersion   string
}

type ChangeListReq struct {
	Severity   []ChangeSeverity
	ChangeType []ChangeType
	ClassId    string
	Limit      int
	Page       int
}
