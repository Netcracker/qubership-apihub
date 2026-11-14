package view

// BuildStatus is the lifecycle of a queued build. StatusNotStarted is internal to the queue: the worker
// only ever reports running, complete, or error.
type BuildStatus string

const (
	StatusNotStarted BuildStatus = "none"
	StatusRunning    BuildStatus = "running"
	StatusComplete   BuildStatus = "complete"
	StatusError      BuildStatus = "error"
)

// ValidWorkerStatus reports whether the worker is allowed to post this status.
func (s BuildStatus) ValidWorkerStatus() bool {
	switch s {
	case StatusRunning, StatusComplete, StatusError:
		return true
	}
	return false
}

type BuildType string

const (
	BuildTypeJavaApiReport     BuildType = "java-api-report"
	BuildTypeJavaApiDiff       BuildType = "java-api-diff"
	BuildTypeJavaUpgradeImpact BuildType = "java-upgrade-impact"
)

// JavaBuildConfig is the config.json the task ZIP carries to java-task-consumer. The field names are the
// worker's contract; see backend/java-task-consumer/docs/backend-api.md.
type JavaBuildConfig struct {
	PublishId string                 `json:"publishId"`
	LibraryId string                 `json:"libraryId"`
	BuildType BuildType              `json:"buildType"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// Metadata keys of a java-api-report task, as the worker reads them.
const (
	BuildMetadataGav        = "gav"
	BuildMetadataGroupId    = "groupId"
	BuildMetadataArtifactId = "artifactId"
	BuildMetadataVersion    = "version"
	BuildMetadataOldVersion = "oldVersion"
	BuildMetadataNewVersion = "newVersion"
)
