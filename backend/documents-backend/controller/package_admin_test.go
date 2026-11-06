package controller_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

func (s *testStack) packageAdmin(t *testing.T, userId string, packageIds ...string) reqOpt {
	perms := map[string][]string{}
	for _, p := range packageIds {
		perms[p] = []string{"read", view.ManagePackagePermission}
	}
	s.fake.Permissions[userId] = perms
	tok := s.fake.Token(t, userId, "", time.Hour)
	return func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+tok) }
}

func TestPackageAdminArticles(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# readme", "guide": "# guide"}}
	s.fake.Packages["OTHER"] = map[string]map[string]string{"1.0": {"readme": "# other"}}
	own := s.seedPackage("own", "PKG", "1.0", "readme")
	foreign := s.seedPackage("foreign", "OTHER", "1.0", "readme")
	generic := s.seedGeneric("gen", view.VisibilityPublic, true, 1)
	pa := s.packageAdmin(t, "bob", "PKG")
	plain := s.user(t)

	// List: own package allowed, generic/other package/no scope forbidden.
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/admin/articles?scope=package&packageId=PKG", nil, pa)), []string{"own"})
	for _, q := range []string{"", "?scope=generic", "?scope=package", "?scope=package&packageId=OTHER"} {
		if w := s.do(t, "GET", "/api/v1/admin/articles"+q, nil, pa); w.Code != 403 {
			t.Fatalf("list %q: want 403, got %d", q, w.Code)
		}
	}
	if w := s.do(t, "GET", "/api/v1/admin/articles?scope=package&packageId=PKG", nil, plain); w.Code != 403 {
		t.Fatalf("plain user list: want 403, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/admin/articles?scope=package&packageId=PKG", nil); w.Code != 401 {
		t.Fatalf("anonymous list: want 401, got %d", w.Code)
	}

	// Create in own package; generic and foreign package forbidden.
	w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "new", Title: "New", Scope: view.ScopePackage, PackageId: "PKG", Version: "1.0", DocumentSlug: "guide"}), pa)
	if w.Code != 201 {
		t.Fatalf("create own: %d %s", w.Code, w.Body.String())
	}
	var created view.Article
	_ = json.Unmarshal(w.Body.Bytes(), &created)
	if w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "g2", Title: "G", Scope: view.ScopeGeneric, BodyMd: str("# g")}), pa); w.Code != 403 {
		t.Fatalf("create generic: want 403, got %d", w.Code)
	}
	if w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "f2", Title: "F", Scope: view.ScopePackage, PackageId: "OTHER", Version: "1.0", DocumentSlug: "readme"}), pa); w.Code != 403 {
		t.Fatalf("create foreign: want 403, got %d", w.Code)
	}

	// Publish/unpublish/update/delete by stored article package.
	for _, op := range []string{"unpublish", "publish"} {
		if w := s.do(t, "POST", "/api/v1/admin/articles/"+own.Id+"/"+op, nil, pa); w.Code != 200 {
			t.Fatalf("%s own: %d %s", op, w.Code, w.Body.String())
		}
		if w := s.do(t, "POST", "/api/v1/admin/articles/"+foreign.Id+"/"+op, nil, pa); w.Code != 403 {
			t.Fatalf("%s foreign: want 403, got %d", op, w.Code)
		}
		if w := s.do(t, "POST", "/api/v1/admin/articles/"+generic.Id+"/"+op, nil, pa); w.Code != 403 {
			t.Fatalf("%s generic: want 403, got %d", op, w.Code)
		}
	}
	upd := view.ArticleRequest{Slug: "own", Title: "Own 2", Scope: view.ScopePackage, PackageId: "PKG", Version: "1.0", DocumentSlug: "readme"}
	if w := s.do(t, "PUT", "/api/v1/admin/articles/"+own.Id, jsonBody(upd), pa); w.Code != 200 {
		t.Fatalf("update own: %d %s", w.Code, w.Body.String())
	}
	moved := upd
	moved.PackageId = "OTHER"
	if w := s.do(t, "PUT", "/api/v1/admin/articles/"+own.Id, jsonBody(moved), pa); w.Code != 403 {
		t.Fatalf("move to foreign package: want 403, got %d", w.Code)
	}
	if w := s.do(t, "PUT", "/api/v1/admin/articles/"+foreign.Id, jsonBody(upd), pa); w.Code != 403 {
		t.Fatalf("update foreign: want 403, got %d", w.Code)
	}

	// Files.
	if w := s.do(t, "GET", "/api/v1/admin/articles/"+own.Id+"/files", nil, pa); w.Code != 200 {
		t.Fatalf("files own: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "GET", "/api/v1/admin/articles/"+generic.Id+"/files", nil, pa); w.Code != 403 {
		t.Fatalf("files generic: want 403, got %d", w.Code)
	}

	// APIHUB relays: own package only, credentials forwarded.
	if w := s.do(t, "GET", "/api/v1/admin/apihub/packages/PKG/versions", nil, pa); w.Code != 200 {
		t.Fatalf("relay own: %d %s", w.Code, w.Body.String())
	}
	if req := s.fake.LastRequestTo("/api/v3/packages/PKG/versions"); req == nil || !strings.HasPrefix(req.Header.Get("Authorization"), "Bearer ") {
		t.Fatalf("relay must forward caller credentials")
	}
	if w := s.do(t, "GET", "/api/v1/admin/apihub/packages/PKG/versions/1.0/documents", nil, pa); w.Code != 200 {
		t.Fatalf("relay docs own: %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/admin/apihub/packages/OTHER/versions", nil, pa); w.Code != 403 {
		t.Fatalf("relay foreign: want 403, got %d", w.Code)
	}

	// Sysadmin-only endpoints stay closed.
	for _, p := range []string{"/api/v1/admin/export", "/api/v1/admin/home-articles"} {
		if w := s.do(t, "GET", p, nil, pa); w.Code != 403 {
			t.Fatalf("%s: want 403, got %d", p, w.Code)
		}
	}

	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+created.Id, nil, pa); w.Code != 204 {
		t.Fatalf("delete own: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+foreign.Id, nil, pa); w.Code != 403 {
		t.Fatalf("delete foreign: want 403, got %d", w.Code)
	}
}

func TestPackageAdminPermissionCheckedOncePerRequest(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# readme"}}
	own := s.seedPackage("own", "PKG", "1.0", "readme")
	pa := s.packageAdmin(t, "bob", "PKG")
	before := s.fake.PackageCalls
	upd := view.ArticleRequest{Slug: "own", Title: "Own 2", Scope: view.ScopePackage, PackageId: "PKG", Version: "1.0", DocumentSlug: "readme"}
	if w := s.do(t, "PUT", "/api/v1/admin/articles/"+own.Id, jsonBody(upd), pa); w.Code != 200 {
		t.Fatalf("update own: %d %s", w.Code, w.Body.String())
	}
	if got := s.fake.PackageCalls - before; got != 1 {
		t.Fatalf("want 1 APIHUB permission call per request, got %d", got)
	}
}

func TestPackageAdminNavigation(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# readme"}}
	s.fake.Packages["OTHER"] = map[string]map[string]string{"1.0": {"readme": "# other"}}
	art := s.seedPackage("own", "PKG", "1.0", "readme")
	pa := s.packageAdmin(t, "bob", "PKG")

	w := s.do(t, "POST", "/api/v1/admin/navigation/sections", jsonBody(view.NavSectionRequest{Scope: view.ScopePackage, PackageId: "PKG", Title: "Guides"}), pa)
	if w.Code != 201 {
		t.Fatalf("create section: %d %s", w.Code, w.Body.String())
	}
	var sec view.NavSection
	_ = json.Unmarshal(w.Body.Bytes(), &sec)
	foreign := s.createSection(t, view.NavSectionRequest{Scope: view.ScopePackage, PackageId: "OTHER", Title: "Other"})
	generic := s.createSection(t, view.NavSectionRequest{Scope: view.ScopeGeneric, Title: "Main"})

	if w := s.do(t, "POST", "/api/v1/admin/navigation/sections", jsonBody(view.NavSectionRequest{Scope: view.ScopeGeneric, Title: "x"}), pa); w.Code != 403 {
		t.Fatalf("create generic section: want 403, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/admin/navigation?scope=package&packageId=PKG", nil, pa); w.Code != 200 {
		t.Fatalf("get own nav: %d %s", w.Code, w.Body.String())
	}
	for _, q := range []string{"?scope=generic", "?scope=package&packageId=OTHER"} {
		if w := s.do(t, "GET", "/api/v1/admin/navigation"+q, nil, pa); w.Code != 403 {
			t.Fatalf("get nav %q: want 403, got %d", q, w.Code)
		}
	}

	w = s.do(t, "POST", "/api/v1/admin/navigation/items", jsonBody(view.NavItemRequest{SectionId: sec.Id, Kind: view.NavKindGuide, ArticleId: art.Id}), pa)
	if w.Code != 201 {
		t.Fatalf("create item: %d %s", w.Code, w.Body.String())
	}
	var item view.NavItem
	_ = json.Unmarshal(w.Body.Bytes(), &item)
	for _, secId := range []string{foreign.Id, generic.Id} {
		if w := s.do(t, "POST", "/api/v1/admin/navigation/items", jsonBody(view.NavItemRequest{SectionId: secId, Kind: view.NavKindGroup, Title: "g"}), pa); w.Code != 403 {
			t.Fatalf("item in foreign section: want 403, got %d", w.Code)
		}
	}
	if w := s.do(t, "PUT", "/api/v1/admin/navigation/sections/"+sec.Id, jsonBody(view.NavSectionRequest{Scope: view.ScopePackage, PackageId: "PKG", Title: "Renamed"}), pa); w.Code != 200 {
		t.Fatalf("update own section: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "PUT", "/api/v1/admin/navigation/sections/"+foreign.Id, jsonBody(view.NavSectionRequest{Scope: view.ScopePackage, PackageId: "PKG", Title: "Steal"}), pa); w.Code != 403 {
		t.Fatalf("update foreign section: want 403, got %d", w.Code)
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/navigation/sections/"+generic.Id, nil, pa); w.Code != 403 {
		t.Fatalf("delete generic section: want 403, got %d", w.Code)
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/navigation/items/"+item.Id, nil, pa); w.Code != 204 {
		t.Fatalf("delete own item: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/navigation/sections/"+sec.Id, nil, pa); w.Code != 204 {
		t.Fatalf("delete own section: %d %s", w.Code, w.Body.String())
	}
}
