package archive

import (
	"archive/zip"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type SourcesArchive struct {
	ZipReader *zip.Reader
	BuildCfg  *view.BuildConfig

	FileHeaders map[string]*zip.File
}

func NewSourcesArchive(zipReader *zip.Reader, buildCfg *view.BuildConfig) *SourcesArchive {
	result := &SourcesArchive{
		ZipReader:   zipReader,
		BuildCfg:    buildCfg,
		FileHeaders: map[string]*zip.File{},
	}
	result.splitFiles()
	return result
}

func (a *SourcesArchive) splitFiles() {
	for _, zipFile := range a.ZipReader.File {
		if zipFile.FileInfo().IsDir() {
			continue
		}
		filepath := zipFile.Name
		a.FileHeaders[filepath] = zipFile
	}
}
