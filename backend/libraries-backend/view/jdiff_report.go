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
	// ClassKind is japicmp's class type of the class this entry belongs to: CLASS, INTERFACE, ENUM, or
	// ANNOTATION. Unlike elementType, it stays the same on a member entry, which is what tells an interface
	// method from a class method.
	ClassKind string `json:"classKind,omitempty"`
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

// Kind maps the class type of the entry onto the kind stored for its class. A report from a worker that
// predates the classKind field falls back to the element type of a class-level entry.
func (c ApiChange) Kind() ClassKind {
	if c.ClassKind != "" {
		return classKindOf(c.ClassKind)
	}
	return classKindOf(c.ElementType)
}

// classKindOf maps japicmp's class type onto a class kind. An element type that is not a class type (a
// method, a constructor, a field) says nothing about the kind of its class, so it maps to a plain class.
func classKindOf(classType string) ClassKind {
	switch classType {
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
