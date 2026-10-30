package view

// VersionLintIssues is the MCP (and API) payload for all linter findings for a published package version.
type VersionLintIssues struct {
	PackageId      string              `json:"packageId"`
	Version        string              `json:"version"`
	VersionStatus  LintedVersionStatus `json:"versionStatus"`
	VersionDetails string              `json:"versionDetails,omitempty"`
	Documents      []DocumentLintBlock `json:"documents"`
}

// DocumentLintBlock aggregates rule violations for one API specification document (slug) within a version.
type DocumentLintBlock struct {
	Slug          string               `json:"slug"`
	ApiType       ApiType              `json:"apiType"`
	DocumentName  string               `json:"documentName"`
	LintStatus    LintedDocumentStatus `json:"lintStatus,omitempty"`
	LintDetails   string               `json:"lintDetails,omitempty"`
	LinterResults []LinterResult       `json:"linterResults,omitempty"`
}
