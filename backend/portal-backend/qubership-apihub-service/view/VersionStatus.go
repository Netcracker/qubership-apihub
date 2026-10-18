package view

import (
	"fmt"
	"strings"
)

type VersionStatus string

const (
	Draft   VersionStatus = "draft"
	Release VersionStatus = "release"
)

func (v VersionStatus) String() string {
	switch v {
	case Draft:
		return "draft"
	case Release:
		return "release"
	default:
		return ""
	}
}

type InvalidVersionStatusError struct {
	Value string
}

func (e *InvalidVersionStatusError) Error() string {
	return fmt.Sprintf("unknown version status: %v", e.Value)
}

func ParseVersionStatus(s string) (VersionStatus, error) {
	switch strings.ToLower(s) {
	case "draft":
		return Draft, nil
	case "release":
		return Release, nil
	}
	return "", &InvalidVersionStatusError{Value: s}
}

// ParseVersionStatuses validates each comma-separated status value from a query parameter list.
// An empty list means no status filter (all statuses). Values are normalised to lowercase.
func ParseVersionStatuses(parts []string) ([]string, error) {
	if len(parts) == 0 {
		return nil, nil
	}
	statuses := make([]string, 0, len(parts))
	for _, part := range parts {
		status, err := ParseVersionStatus(part)
		if err != nil {
			return nil, err
		}
		statuses = append(statuses, status.String())
	}
	return statuses, nil
}
