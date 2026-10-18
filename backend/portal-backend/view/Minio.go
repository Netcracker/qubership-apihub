package view

type MinioStorageCreds struct {
	BucketName           string
	IsActive             bool
	Endpoint             string
	Crt                  string
	AccessKeyId          string
	SecretAccessKey      string
	IsOnlyForBuildResult bool
}

const PUBLISHED_SOURCES_ARCHIVES_TABLE = "published_sources_archives"
const BUILD_RESULT_TABLE = "build_result"
