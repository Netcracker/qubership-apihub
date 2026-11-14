package service

import "github.com/google/uuid"

// systemUser is the author recorded for rows the service writes on its own behalf, not on a caller's.
const systemUser = "system"

// newBuildId mints the identifier of a queued build. It doubles as the publishId the worker reports
// against, matching the build-task-consumer pattern the Java worker already follows.
func newBuildId() string {
	return uuid.NewString()
}

// newComparisonId mints the identifier of a stored comparison.
func newComparisonId() string {
	return uuid.NewString()
}
