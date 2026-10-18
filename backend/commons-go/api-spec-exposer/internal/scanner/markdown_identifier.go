package scanner

import (
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

// MarkdownIdentifier identifies Markdown documentation files
type MarkdownIdentifier struct{}

func (i *MarkdownIdentifier) CanHandle(path string) bool {
	ext := getFileExtension(path)
	return ext == "md" || ext == "markdown"
}

func (i *MarkdownIdentifier) Identify(path string, content []byte) (*config.SpecMetadata, []string, []error) {
	return &config.SpecMetadata{
		Name:     getFileName(path),
		FilePath: path,
		Type:     config.DocTypeMarkdown,
		ApiType:  config.ApiTypeMarkdown,
		Format:   config.FormatMarkdown,
		FileId:   generateFileId(path),
		XApiKind: getXApiKind(path),
	}, nil, nil
}
