package view

import "time"

// The report.json that java-task-consumer returns is jdiff-engine's canonical DiffReport. The types below
// mirror backend/java-task-consumer/jdiff-engine/src/main/java/org/qubership/jdiff/model; keep them in step
// when that model changes.

type ReportMode string

const (
	ReportModeApiReport     ReportMode = "api-report"
	ReportModeApiDiff       ReportMode = "api-diff"
	ReportModeUpgradeImpact ReportMode = "upgrade-impact"
)

type DiffReport struct {
	Tool        string                 `json:"tool"`
	ToolVersion string                 `json:"toolVersion"`
	Mode        ReportMode             `json:"mode"`
	GeneratedAt time.Time              `json:"generatedAt"`
	Input       map[string]interface{} `json:"input,omitempty"`
	Artifacts   []ArtifactReport       `json:"artifacts,omitempty"`
}

type ArtifactReport struct {
	GroupId          string      `json:"groupId,omitempty"`
	ArtifactId       string      `json:"artifactId,omitempty"`
	OldVersion       string      `json:"oldVersion,omitempty"`
	NewVersion       string      `json:"newVersion,omitempty"`
	SemverVerdict    string      `json:"semverVerdict,omitempty"`
	Changes          []ApiChange `json:"changes,omitempty"`
	DependencyOrigin string      `json:"dependencyOrigin,omitempty"`
}

type ApiChange struct {
	ClassName   string `json:"className"`
	ElementType string `json:"elementType,omitempty"`
	// Member is the display signature of a method, constructor, or field; empty for a class-level entry.
	Member           string     `json:"member,omitempty"`
	Status           string     `json:"status,omitempty"`
	ChangeTypes      []string   `json:"changeTypes,omitempty"`
	Details          string     `json:"details,omitempty"`
	BinaryCompatible *bool      `json:"binaryCompatible,omitempty"`
	SourceCompatible *bool      `json:"sourceCompatible,omitempty"`
	Breaking         bool       `json:"breaking"`
	Semver           string     `json:"semver,omitempty"`
	UsedBy           []UsageRef `json:"usedBy,omitempty"`
}

type UsageRef struct {
	Module  string   `json:"module,omitempty"`
	Classes []string `json:"classes,omitempty"`
}

// elementType values jdiff emits. Class-level entries carry japicmp's JApiClassType; a record is reported
// as a class, so ClassKindRecord never arrives from a report.
const (
	ElementTypeClass       = "CLASS"
	ElementTypeInterface   = "INTERFACE"
	ElementTypeEnum        = "ENUM"
	ElementTypeAnnotation  = "ANNOTATION"
	ElementTypeMethod      = "METHOD"
	ElementTypeConstructor = "CONSTRUCTOR"
	ElementTypeField       = "FIELD"
)

// status values jdiff emits for an element.
const (
	ChangeStatusNew       = "NEW"
	ChangeStatusRemoved   = "REMOVED"
	ChangeStatusModified  = "MODIFIED"
	ChangeStatusUnchanged = "UNCHANGED"
)

// AnnotationChangeTypePrefix marks the japicmp compatibility-change codes that only concern annotations.
// A non-breaking change whose codes are all annotation codes maps to ChangeSeverityAnnotation.
const AnnotationChangeTypePrefix = "ANNOTATION_"

// DeprecatedChangeType is japicmp's code for an element that gained @Deprecated.
const DeprecatedChangeType = "ANNOTATION_DEPRECATED_ADDED"

// IsClassElement reports whether the entry describes a class rather than one of its members.
func (c ApiChange) IsClassElement() bool {
	switch c.ElementType {
	case ElementTypeMethod, ElementTypeConstructor, ElementTypeField:
		return false
	}
	return true
}

// ClassKind maps jdiff's class-level element type onto the kind stored for a class. An entry with no
// element type is recorded as a plain class.
func (c ApiChange) ClassKind() ClassKind {
	switch c.ElementType {
	case ElementTypeInterface:
		return ClassKindInterface
	case ElementTypeEnum:
		return ClassKindEnum
	case ElementTypeAnnotation:
		return ClassKindAnnotation
	}
	return ClassKindClass
}

// Deprecated reports whether this entry marks the element as newly deprecated.
func (c ApiChange) Deprecated() bool {
	for _, changeType := range c.ChangeTypes {
		if changeType == DeprecatedChangeType {
			return true
		}
	}
	return false
}
