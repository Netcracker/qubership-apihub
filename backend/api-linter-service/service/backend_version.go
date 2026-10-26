package service

import "os"

const (
	envGitBranch = "GIT_BRANCH"
	envGitHash   = "GIT_HASH"
	envBuildTime = "BUILD_TIME"

	unknownBackendVersion = "unknown"
)

// BackendVersionFromEnv returns the version of this image: <branch>.<commit>.<build time>.
// The variables come from the thin layer that CI adds to a branch tag (tools/ci/ref-overlay).
func BackendVersionFromEnv() string {
	return makeBackendVersion(os.Getenv(envGitBranch), os.Getenv(envGitHash), os.Getenv(envBuildTime))
}

func makeBackendVersion(branch, hash, buildTime string) string {
	if branch == "" && hash == "" {
		return unknownBackendVersion
	}
	version := branch + "." + hash
	if buildTime != "" {
		version += "." + buildTime
	}
	return version
}
