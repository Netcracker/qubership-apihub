package service

import "os"

const (
	envGitBranch  = "GIT_BRANCH"
	envGitHash    = "GIT_HASH"
	envCommitTime = "COMMIT_TIME"

	unknownBackendVersion = "unknown"
)

// BackendVersionFromEnv returns the version of this image: <branch>.<commit>.<commit time>.
// The variables come from the thin layer that CI adds to a branch tag (tools/ci/ref-overlay).
func BackendVersionFromEnv() string {
	return makeBackendVersion(os.Getenv(envGitBranch), os.Getenv(envGitHash), os.Getenv(envCommitTime))
}

func makeBackendVersion(branch, hash, commitTime string) string {
	if branch == "" && hash == "" {
		return unknownBackendVersion
	}
	version := branch + "." + hash
	if commitTime != "" {
		version += "." + commitTime
	}
	return version
}
