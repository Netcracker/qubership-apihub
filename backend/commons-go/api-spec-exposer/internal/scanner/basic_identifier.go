package scanner

import (
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
)

// BasicIdentifier handles unknown/binary files
type BasicIdentifier struct{}

func (i *BasicIdentifier) CanHandle(path string) bool {
	return true
}

func (i *BasicIdentifier) Identify(path string, content []byte) (*config.SpecMetadata, []string, []error) {
	return &config.SpecMetadata{
		Name:     getFileName(path),
		FilePath: path,
		Type:     config.DocTypeUnknown,
		ApiType:  config.ApiTypeUnknown,
		Format:   config.FormatUnknown,
		FileId:   generateFileId(path),
		XApiKind: getXApiKind(path),
	}, nil, nil
}
