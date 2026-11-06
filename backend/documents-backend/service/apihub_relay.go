package service

import (
	"context"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// ApihubRelayService forwards admin lookups to APIHUB with the admin's credentials so an admin UI can pick a
// package version and a Markdown document slug.
type ApihubRelayService interface {
	GetPackageVersions(ctx context.Context, packageId string) (*view.ApihubVersions, error)
	GetVersionMarkdownDocuments(ctx context.Context, packageId string, version string) (*view.ApihubDocuments, error)
}

func NewApihubRelayService(apihubClient client.ApihubClient) ApihubRelayService {
	return &apihubRelayServiceImpl{apihubClient: apihubClient}
}

type apihubRelayServiceImpl struct {
	apihubClient client.ApihubClient
}

func (s apihubRelayServiceImpl) GetPackageVersions(ctx context.Context, packageId string) (*view.ApihubVersions, error) {
	result, err := s.apihubClient.GetVersions(ctx, secctx.GetCredential(ctx), packageId)
	if err != nil {
		return nil, mapApihubReadError(err, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageVersionNotAccessible,
			Message: exception.PackageVersionNotAccessibleMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": "*"},
		})
	}
	return result, nil
}

func (s apihubRelayServiceImpl) GetVersionMarkdownDocuments(ctx context.Context, packageId string, version string) (*view.ApihubDocuments, error) {
	result, err := s.apihubClient.GetVersionDocuments(ctx, secctx.GetCredential(ctx), packageId, version)
	if err != nil {
		return nil, mapApihubReadError(err, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageVersionNotAccessible,
			Message: exception.PackageVersionNotAccessibleMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": version},
		})
	}
	documents := make([]view.ApihubDocument, 0, len(result.Documents))
	for _, d := range result.Documents {
		if d.Type == view.ApihubMarkdownType {
			documents = append(documents, d)
		}
	}
	return &view.ApihubDocuments{Documents: documents}, nil
}
