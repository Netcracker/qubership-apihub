package validation

import (
	"archive/zip"
	"bytes"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/stretchr/testify/assert"
)

// buildResultZipReader creates an in-memory zip containing the given entries (name -> content),
// mirroring the layout a build worker would produce for a build result archive.
func buildResultZipReader(t *testing.T, files map[string]string) *zip.Reader {
	t.Helper()
	buf := new(bytes.Buffer)
	w := zip.NewWriter(buf)
	for name, content := range files {
		f, err := w.Create(name)
		assert.NoError(t, err)
		_, err = f.Write([]byte(content))
		assert.NoError(t, err)
	}
	assert.NoError(t, w.Close())
	reader, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	assert.NoError(t, err)
	return reader
}

func expectCustomErrorCode(t *testing.T, err error, wantCode string) {
	t.Helper()
	assert.Error(t, err)
	customErr, ok := err.(*exception.CustomError)
	assert.True(t, ok, "expected *exception.CustomError, got %T", err)
	assert.Equal(t, wantCode, customErr.Code)
}

func TestValidatePublishBuildResult_DdlContracts(t *testing.T) {
	t.Run("matching ddl data file passes", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			"ddl/public-table-users": "CREATE TABLE users (id int);",
		})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageDdlContracts = view.PackageDdlContractsFile{
			Tables: []view.PackageDdlContract{{DdlEntityId: "public-table-users"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		assert.NoError(t, err)
	})

	t.Run("missing ddl data file is rejected", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageDdlContracts = view.PackageDdlContractsFile{
			Tables: []view.PackageDdlContract{{DdlEntityId: "public-table-users"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileMissing)
	})

	t.Run("duplicate ddl entity id in manifest is rejected", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			"ddl/public-table-users": "CREATE TABLE users (id int);",
		})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageDdlContracts = view.PackageDdlContractsFile{
			Tables: []view.PackageDdlContract{
				{DdlEntityId: "public-table-users"},
				{DdlEntityId: "public-table-users"},
			},
		}

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileDuplicate)
	})

	t.Run("redundant ddl file not referenced by manifest is rejected", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			"ddl/public-table-users":  "CREATE TABLE users (id int);",
			"ddl/public-table-orders": "CREATE TABLE orders (id int);",
		})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageDdlContracts = view.PackageDdlContractsFile{
			Tables: []view.PackageDdlContract{{DdlEntityId: "public-table-users"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileRedundant)
	})
}

func TestValidatePublishBuildResult_McpContracts(t *testing.T) {
	t.Run("matching mcp data file passes", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			"mcp/mcp-tool-get_forecast": `{"name":"get_forecast"}`,
		})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageMcpContracts = view.PackageMcpContractsFile{
			Tools: []view.PackageMcpContract{{McpEntityId: "mcp-tool-get_forecast"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		assert.NoError(t, err)
	})

	t.Run("missing mcp data file is rejected", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageMcpContracts = view.PackageMcpContractsFile{
			Prompts: []view.PackageMcpContract{{McpEntityId: "mcp-prompt-summarize"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileMissing)
	})

	t.Run("duplicate mcp entity id across kinds is rejected", func(t *testing.T) {
		// the mcp_entities primary key is scoped across all kinds, so a tool and a
		// prompt sharing the same mcpEntityId is a manifest-level duplicate too.
		zipReader := buildResultZipReader(t, map[string]string{
			"mcp/mcp-shared-id": `{}`,
		})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageMcpContracts = view.PackageMcpContractsFile{
			Tools:   []view.PackageMcpContract{{McpEntityId: "mcp-shared-id"}},
			Prompts: []view.PackageMcpContract{{McpEntityId: "mcp-shared-id"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileDuplicate)
	})

	t.Run("redundant mcp file not referenced by manifest is rejected", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			"mcp/mcp-tool-get_forecast": `{"name":"get_forecast"}`,
			"mcp/mcp-tool-unreferenced": `{"name":"unreferenced"}`,
		})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageMcpContracts = view.PackageMcpContractsFile{
			Tools: []view.PackageMcpContract{{McpEntityId: "mcp-tool-get_forecast"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileRedundant)
	})
}

func TestValidatePublishBuildResult_DdlComparisons(t *testing.T) {
	t.Run("matching ddl comparison file passes", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			"ddl-comparisons/v1-v2-users": `{"entities":[]}`,
		})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageDdlComparisons = view.PackageDdlComparisonsFile{
			Comparisons: []view.DdlVersionComparison{{ComparisonFileId: "v1-v2-users"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		assert.NoError(t, err)
	})

	t.Run("missing ddl comparison file is rejected", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageDdlComparisons = view.PackageDdlComparisonsFile{
			Comparisons: []view.DdlVersionComparison{{ComparisonFileId: "v1-v2-users"}},
		}

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileMissing)
	})

	t.Run("comparisons without a comparisonFileId are skipped", func(t *testing.T) {
		// a comparison entry with no comparisonFileId carries no per-pair diff file
		// (e.g. a pair listed in cached-comparisons.json) and must not be treated as a
		// reference to a missing file.
		zipReader := buildResultZipReader(t, map[string]string{})
		buildArc := archive.NewBuildResultArchive(zipReader)
		buildArc.PackageDdlComparisons = view.PackageDdlComparisonsFile{
			Comparisons: []view.DdlVersionComparison{{ComparisonFileId: ""}},
		}

		err := ValidatePublishBuildResult(buildArc)
		assert.NoError(t, err)
	})
}

func TestValidatePublishBuildResult_CachedComparisons(t *testing.T) {
	t.Run("cached-comparisons.json is a known archive file", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			archive.CachedComparisonsFilePath: `{"cachedComparisons":[]}`,
		})
		buildArc := archive.NewBuildResultArchive(zipReader)

		err := ValidatePublishBuildResult(buildArc)
		assert.NoError(t, err)
	})

	t.Run("an unknown top-level file is still rejected", func(t *testing.T) {
		zipReader := buildResultZipReader(t, map[string]string{
			"cached-comparison.json": `{"cachedComparisons":[]}`,
		})
		buildArc := archive.NewBuildResultArchive(zipReader)

		err := ValidatePublishBuildResult(buildArc)
		expectCustomErrorCode(t, err, exception.FileRedundant)
	})
}
