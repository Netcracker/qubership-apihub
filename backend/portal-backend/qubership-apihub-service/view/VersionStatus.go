package view

import "fmt"

type VersionStatus string

const (
	Draft    VersionStatus = "draft"
	Release  VersionStatus = "release"
	Archived VersionStatus = "archived"
)

func (v VersionStatus) String() string {
	switch v {
	case Draft:
		return "draft"
	case Release:
		return "release"
	case Archived:
		return "archived"
	default:
		return ""
	}
}

func ParseVersionStatus(s string) (VersionStatus, error) {
	switch s {
	case "draft":
		return Draft, nil
	case "release":
		return Release, nil
	case "archived":
		return Archived, nil
	}
	return "", fmt.Errorf("unknown version status: %v", s)
}
