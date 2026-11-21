package service

import (
	"context"
	"errors"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

type stubApihubClient struct {
	client.ApihubClient
	roles *view.PackageRoles
	err   error
}

func (s stubApihubClient) GetAvailableRoles(context.Context, string) (*view.PackageRoles, error) {
	return s.roles, s.err
}

var _ client.ApihubClient = stubApihubClient{}

// Regression for the panic reported in issue #1027: GetAvailableRoles returned
// (nil, nil) and HasPublishPackagePermission iterated roles.Roles without a nil
// check, so a non-200 answer from APIHUB crashed the request with a nil pointer
// dereference instead of denying the permission.
func TestHasPublishPackagePermissionReturnsFalseWithoutPanicWhenRolesAreNil(t *testing.T) {
	svc := NewAuthorizationService(stubApihubClient{roles: nil, err: nil})

	got, err := svc.HasPublishPackagePermission(context.Background(), "pkg")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if got {
		t.Fatalf("permission = true, want false when no roles are available")
	}
}

func TestHasPublishPackagePermissionPropagatesClientError(t *testing.T) {
	clientErr := errors.New("failed to get available roles for package 'pkg': status code 500")
	svc := NewAuthorizationService(stubApihubClient{roles: nil, err: clientErr})

	got, err := svc.HasPublishPackagePermission(context.Background(), "pkg")
	if !errors.Is(err, clientErr) {
		t.Fatalf("err = %v, want %v", err, clientErr)
	}
	if got {
		t.Fatalf("permission = true, want false on client error")
	}
}

func TestHasPublishPackagePermission(t *testing.T) {
	cases := []struct {
		name  string
		roles *view.PackageRoles
		want  bool
	}{
		{
			name: "manage draft version permission grants publishing",
			roles: &view.PackageRoles{Roles: []view.PackageRole{
				{RoleId: "developer", Permissions: []view.RolePermission{view.ManageDraftVersionPermission}},
			}},
			want: true,
		},
		{
			name: "read permission does not grant publishing",
			roles: &view.PackageRoles{Roles: []view.PackageRole{
				{RoleId: "viewer", Permissions: []view.RolePermission{view.ReadPermission}},
			}},
			want: false,
		},
		{
			name:  "empty roles do not grant publishing",
			roles: &view.PackageRoles{},
			want:  false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc := NewAuthorizationService(stubApihubClient{roles: tc.roles})

			got, err := svc.HasPublishPackagePermission(context.Background(), "pkg")
			if err != nil {
				t.Fatalf("err = %v, want nil", err)
			}
			if got != tc.want {
				t.Fatalf("permission = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestHasReadPackagePermissionReturnsFalseWithoutPanicWhenRolesAreNil(t *testing.T) {
	svc := NewAuthorizationService(stubApihubClient{roles: nil, err: nil})

	got, err := svc.HasReadPackagePermission(context.Background(), "pkg")
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if got {
		t.Fatalf("permission = true, want false when no roles are available")
	}
}
