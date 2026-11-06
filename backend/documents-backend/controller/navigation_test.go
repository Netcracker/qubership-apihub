package controller_test

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"gopkg.in/yaml.v3"
)

func decodeNav(t *testing.T, w *httptest.ResponseRecorder) view.Navigation {
	t.Helper()
	if w.Code != 200 {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
	var out view.Navigation
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out
}

// outline renders a tree as "Section[item,group(child,child)]" strings for compact assertions.
func outline(nav view.Navigation) []string {
	var items func([]view.NavItem) string
	items = func(list []view.NavItem) string {
		parts := make([]string, 0, len(list))
		for _, it := range list {
			s := it.Title
			if it.Kind == view.NavKindGuide {
				s = it.Slug
			}
			if len(it.Children) > 0 {
				s += "(" + items(it.Children) + ")"
			}
			parts = append(parts, s)
		}
		return strings.Join(parts, ",")
	}
	out := make([]string, 0, len(nav.Sections))
	for _, sec := range nav.Sections {
		out = append(out, sec.Title+"["+items(sec.Items)+"]")
	}
	return out
}

func (s *testStack) createSection(t *testing.T, req view.NavSectionRequest) view.NavSection {
	t.Helper()
	w := s.do(t, "POST", "/api/v1/admin/navigation/sections", jsonBody(req), s.admin(t))
	if w.Code != 201 {
		t.Fatalf("create section: want 201, got %d: %s", w.Code, w.Body.String())
	}
	var out view.NavSection
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return out
}

func (s *testStack) createItem(t *testing.T, req view.NavItemRequest) view.NavItem {
	t.Helper()
	w := s.do(t, "POST", "/api/v1/admin/navigation/items", jsonBody(req), s.admin(t))
	if w.Code != 201 {
		t.Fatalf("create item: want 201, got %d: %s", w.Code, w.Body.String())
	}
	var out view.NavItem
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return out
}

func (s *testStack) itemFails(t *testing.T, req view.NavItemRequest, status int, code string) {
	t.Helper()
	w := s.do(t, "POST", "/api/v1/admin/navigation/items", jsonBody(req), s.admin(t))
	if w.Code != status || !strings.Contains(w.Body.String(), code) {
		t.Fatalf("want %d %s, got %d: %s", status, code, w.Code, w.Body.String())
	}
}

func TestNavigationVisibility(t *testing.T) {
	s := newTestStack(t)
	pubA := s.seedGeneric("pub-a", view.VisibilityPublic, true, 1)
	pubB := s.seedGeneric("pub-b", view.VisibilityPublic, true, 2)
	corp := s.seedGeneric("corp", view.VisibilityCorporate, true, 3)
	draft := s.seedGeneric("draft", view.VisibilityPublic, false, 4)
	s.seedGeneric("loose", view.VisibilityPublic, true, 5)

	// No sections yet: the tree is the flat list inside the synthetic section.
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=generic", nil))), []string{"Other[pub-a,pub-b,loose]"})

	start := s.createSection(t, view.NavSectionRequest{Scope: view.ScopeGeneric, Title: "Getting started", DisplayOrder: 1})
	internal := s.createSection(t, view.NavSectionRequest{Scope: view.ScopeGeneric, Title: "Internal", DisplayOrder: 2})
	s.createItem(t, view.NavItemRequest{SectionId: start.Id, Kind: view.NavKindGuide, ArticleId: pubB.Id, DisplayOrder: 2})
	s.createItem(t, view.NavItemRequest{SectionId: start.Id, Kind: view.NavKindGuide, ArticleId: pubA.Id, DisplayOrder: 1, Title: "Start here"})
	group := s.createItem(t, view.NavItemRequest{SectionId: start.Id, Kind: view.NavKindGroup, Title: "Drafts", DisplayOrder: 3})
	s.createItem(t, view.NavItemRequest{SectionId: start.Id, ParentId: group.Id, Kind: view.NavKindGuide, ArticleId: draft.Id})
	s.createItem(t, view.NavItemRequest{SectionId: internal.Id, Kind: view.NavKindGuide, ArticleId: corp.Id})

	anon := decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=generic", nil))
	eq(t, outline(anon), []string{"Getting started[pub-a,pub-b]", "Other[loose]"})
	if anon.Sections[0].Items[0].Title != "Start here" || anon.Sections[0].Items[1].Title != "PUB-B" {
		t.Fatalf("effective titles: %+v", anon.Sections[0].Items)
	}
	if !anon.Sections[1].Synthetic || anon.Sections[1].Id != "" || anon.Sections[1].DisplayOrder != 3 {
		t.Fatalf("synthetic section: %+v", anon.Sections[1])
	}
	if anon.Sections[0].Items[0].ArticleId != "" || anon.Sections[0].Items[0].Published != nil || anon.Sections[0].CreatedBy != "" {
		t.Fatalf("admin fields leaked: %s", anon.Sections[0].Items[0].ArticleId)
	}
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=generic", nil, s.user(t)))), []string{"Getting started[pub-a,pub-b]", "Internal[corp]", "Other[loose]"})
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=generic", nil, s.admin(t)))), []string{"Getting started[pub-a,pub-b]", "Internal[corp]", "Other[loose]"})

	// Publishing the draft fills the group; unpublishing pub-a drops it from the tree.
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+draft.Id+"/publish", nil, s.admin(t)); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+pubA.Id+"/unpublish", nil, s.admin(t)); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=generic", nil))), []string{"Getting started[pub-b,Drafts(draft)]", "Other[loose]"})

	// Admin tree: nothing dropped, raw fields present.
	admin := decodeNav(t, s.do(t, "GET", "/api/v1/admin/navigation?scope=generic", nil, s.admin(t)))
	eq(t, outline(admin), []string{"Getting started[pub-a,pub-b,Drafts(draft)]", "Internal[corp]"})
	first := admin.Sections[0].Items[0]
	if first.ArticleId != pubA.Id || first.TitleOverride != "Start here" || first.Published == nil || *first.Published || admin.Sections[0].CreatedBy != "root" {
		t.Fatalf("admin item: %+v", first)
	}
	if w := s.do(t, "GET", "/api/v1/admin/navigation?scope=generic", nil); w.Code != 401 {
		t.Fatalf("anonymous admin: %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/admin/navigation?scope=generic", nil, s.user(t)); w.Code != 403 {
		t.Fatalf("user admin: %d", w.Code)
	}

	// Deleting the article cascades to its item; the dangling flag covers a missing row.
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+corp.Id, nil, s.admin(t)); w.Code != 204 {
		t.Fatal(w.Body.String())
	}
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/admin/navigation?scope=generic", nil, s.admin(t)))), []string{"Getting started[pub-a,pub-b,Drafts(draft)]", "Internal[]"})

	// Deleting the section leaves the synthetic section with every public article.
	if w := s.do(t, "DELETE", "/api/v1/admin/navigation/sections/"+start.Id, nil, s.admin(t)); w.Code != 204 {
		t.Fatal(w.Body.String())
	}
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=generic", nil))), []string{"Other[pub-b,draft,loose]"})
	if s.nav.CountItems() != 0 {
		t.Fatalf("items not cascaded: %d", s.nav.CountItems())
	}
}

func TestNavigationPackageFilteredByVersion(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# 1"}, "2.0": {"readme": "# 2", "changelog": "# c"}}
	s.fake.Packages["PRIV"] = map[string]map[string]string{"1.0": {"readme": "# p"}}
	s.fake.PrivatePackages["PRIV"] = true
	r2 := s.seedPackage("readme-2", "PKG", "2.0", "readme")
	r1 := s.seedPackage("readme-1", "PKG", "1.0", "readme")
	ch := s.seedPackage("changelog", "PKG", "", "changelog")
	s.seedPackage("priv", "PRIV", "1.0", "readme")

	sec := s.createSection(t, view.NavSectionRequest{Scope: view.ScopePackage, PackageId: "PKG", Title: "Package docs"})
	s.createItem(t, view.NavItemRequest{SectionId: sec.Id, Kind: view.NavKindGuide, ArticleId: r2.Id, DisplayOrder: 1})
	s.createItem(t, view.NavItemRequest{SectionId: sec.Id, Kind: view.NavKindGuide, ArticleId: r1.Id, DisplayOrder: 2})
	s.createItem(t, view.NavItemRequest{SectionId: sec.Id, Kind: view.NavKindGuide, ArticleId: ch.Id, DisplayOrder: 3})

	nav := decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=package&packageId=PKG&version=2.0", nil))
	eq(t, outline(nav), []string{"Package docs[readme-2,changelog]"})
	if nav.Sections[0].Items[1].Version != "2.0" || nav.Sections[0].Items[1].PackageId != "PKG" {
		t.Fatalf("effective version: %+v", nav.Sections[0].Items[1])
	}
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=package&packageId=PKG&version=1.0", nil))), []string{"Package docs[readme-1,changelog]"})

	// Missing parameters and inaccessible versions follow GET /articles.
	for _, q := range []string{"", "?scope=package", "?scope=package&packageId=PKG", "?scope=bogus", "?scope=generic&packageId=PKG"} {
		if w := s.do(t, "GET", "/api/v1/navigation"+q, nil); w.Code != 400 {
			t.Fatalf("%q: want 400, got %d %s", q, w.Code, w.Body.String())
		}
	}
	if w := s.do(t, "GET", "/api/v1/navigation?scope=package&packageId=PRIV&version=1.0", nil); w.Code != 404 || !strings.Contains(w.Body.String(), "DOCS-2004") {
		t.Fatalf("private package anonymous: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "GET", "/api/v1/navigation?scope=package&packageId=PRIV&version=1.0", nil, s.user(t)); w.Code != 200 {
		t.Fatalf("private package user: %d %s", w.Code, w.Body.String())
	}
	for _, q := range []string{"", "?scope=package", "?scope=generic&packageId=PKG"} {
		if w := s.do(t, "GET", "/api/v1/admin/navigation"+q, nil, s.admin(t)); w.Code != 400 {
			t.Fatalf("admin %q: want 400, got %d", q, w.Code)
		}
	}
}

func TestAdminNavigationCrud(t *testing.T) {
	s := newTestStack(t)
	a := s.seedGeneric("a", view.VisibilityPublic, true, 1)
	b := s.seedGeneric("b", view.VisibilityPublic, true, 2)
	c := s.seedGeneric("c", view.VisibilityPublic, true, 3)
	pkg := s.seedPackage("pkg", "PKG", "1.0", "readme")

	if w := s.do(t, "POST", "/api/v1/admin/navigation/sections", jsonBody(view.NavSectionRequest{Scope: "generic", Title: "x"})); w.Code != 401 {
		t.Fatalf("anonymous: %d", w.Code)
	}
	if w := s.do(t, "POST", "/api/v1/admin/navigation/sections", jsonBody(view.NavSectionRequest{Scope: "generic", Title: "x"}), s.user(t)); w.Code != 403 {
		t.Fatalf("user: %d", w.Code)
	}
	for _, bad := range []view.NavSectionRequest{{Scope: "generic"}, {Scope: "bogus", Title: "x"}, {Scope: "package", Title: "x"}, {Scope: "generic", PackageId: "P", Title: "x"}} {
		if w := s.do(t, "POST", "/api/v1/admin/navigation/sections", jsonBody(bad), s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3014") {
			t.Fatalf("%+v: %d %s", bad, w.Code, w.Body.String())
		}
	}
	if w := s.do(t, "POST", "/api/v1/admin/navigation/sections", strings.NewReader("{"), s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3004") {
		t.Fatalf("bad json: %d %s", w.Code, w.Body.String())
	}

	sec := s.createSection(t, view.NavSectionRequest{Scope: view.ScopeGeneric, Title: "Main", DisplayOrder: 1})
	if sec.Id == "" || sec.CreatedBy != "root" || sec.CreatedAt == nil || sec.Items == nil {
		t.Fatalf("section: %+v", sec)
	}
	other := s.createSection(t, view.NavSectionRequest{Scope: view.ScopeGeneric, Title: "Other section", DisplayOrder: 2})

	// Item validation.
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, Kind: "guide"}, 400, "DOCS-3014")
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, Kind: "group"}, 400, "DOCS-3014")
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, Kind: "group", Title: "g", ArticleId: a.Id}, 400, "DOCS-3014")
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, Kind: "bogus", Title: "g"}, 400, "DOCS-3014")
	s.itemFails(t, view.NavItemRequest{SectionId: "missing", Kind: "guide", ArticleId: a.Id}, 400, "DOCS-3014")
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, Kind: "guide", ArticleId: "missing"}, 400, "DOCS-3014")
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, Kind: "guide", ArticleId: pkg.Id}, 400, "DOCS-3014") // scope mismatch

	g1 := s.createItem(t, view.NavItemRequest{SectionId: sec.Id, Kind: "group", Title: "L1"})
	g2 := s.createItem(t, view.NavItemRequest{SectionId: sec.Id, ParentId: g1.Id, Kind: "group", Title: "L2"})
	ia := s.createItem(t, view.NavItemRequest{SectionId: sec.Id, ParentId: g2.Id, Kind: "guide", ArticleId: a.Id})
	if ia.Title != "A" || ia.ArticleId != a.Id || ia.Published == nil || !*ia.Published || ia.ParentId != g2.Id {
		t.Fatalf("item: %+v", ia)
	}
	l3 := s.createItem(t, view.NavItemRequest{SectionId: sec.Id, ParentId: g2.Id, Kind: "group", Title: "L3"})                  // depth 3 ok
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, ParentId: l3.Id, Kind: "guide", ArticleId: b.Id}, 400, "DOCS-3014")   // depth 4
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, ParentId: ia.Id, Kind: "guide", ArticleId: b.Id}, 400, "DOCS-3014")   // parent is a guide
	s.itemFails(t, view.NavItemRequest{SectionId: other.Id, ParentId: g1.Id, Kind: "guide", ArticleId: b.Id}, 400, "DOCS-3014") // parent in other section
	s.itemFails(t, view.NavItemRequest{SectionId: sec.Id, Kind: "guide", ArticleId: a.Id}, 409, "DOCS-3015")                    // already placed
	s.itemFails(t, view.NavItemRequest{SectionId: other.Id, Kind: "guide", ArticleId: a.Id}, 409, "DOCS-3015")

	// Update: cycle, depth with descendants, section change, kind change with children, rename override.
	put := func(id string, req view.NavItemRequest) *httptest.ResponseRecorder {
		return s.do(t, "PUT", "/api/v1/admin/navigation/items/"+id, jsonBody(req), s.admin(t))
	}
	if w := put(g1.Id, view.NavItemRequest{Kind: "group", Title: "L1", ParentId: g2.Id}); w.Code != 400 {
		t.Fatalf("cycle: %d %s", w.Code, w.Body.String())
	}
	if w := put(g1.Id, view.NavItemRequest{Kind: "group", Title: "L1", ParentId: g1.Id}); w.Code != 400 {
		t.Fatalf("self parent: %d %s", w.Code, w.Body.String())
	}
	top := s.createItem(t, view.NavItemRequest{SectionId: sec.Id, Kind: "group", Title: "Top"})
	if w := put(g1.Id, view.NavItemRequest{Kind: "group", Title: "L1", ParentId: top.Id}); w.Code != 400 { // L1 subtree is 3 deep
		t.Fatalf("depth on move: %d %s", w.Code, w.Body.String())
	}
	if w := put(g1.Id, view.NavItemRequest{SectionId: other.Id, Kind: "group", Title: "L1"}); w.Code != 400 {
		t.Fatalf("section move: %d %s", w.Code, w.Body.String())
	}
	if w := put(g1.Id, view.NavItemRequest{Kind: "guide", ArticleId: c.Id}); w.Code != 400 {
		t.Fatalf("guide with children: %d %s", w.Code, w.Body.String())
	}
	if w := put(ia.Id, view.NavItemRequest{Kind: "guide", ArticleId: a.Id, ParentId: g2.Id, Title: "Renamed", DisplayOrder: 5}); w.Code != 200 || !strings.Contains(w.Body.String(), `"titleOverride":"Renamed"`) {
		t.Fatalf("rename: %d %s", w.Code, w.Body.String())
	}
	if w := put(ia.Id, view.NavItemRequest{Kind: "guide", ArticleId: a.Id, Title: ""}); w.Code != 200 || !strings.Contains(w.Body.String(), `"title":"A"`) || strings.Contains(w.Body.String(), "titleOverride") {
		t.Fatalf("move to top and clear override: %d %s", w.Code, w.Body.String())
	}
	if w := put("missing", view.NavItemRequest{Kind: "group", Title: "x"}); w.Code != 404 || !strings.Contains(w.Body.String(), "DOCS-2007") {
		t.Fatalf("missing item: %d %s", w.Code, w.Body.String())
	}

	// Section update: scope change with items is rejected; empty section may change; unknown id 404.
	if w := s.do(t, "PUT", "/api/v1/admin/navigation/sections/"+sec.Id, jsonBody(view.NavSectionRequest{Scope: "package", PackageId: "PKG", Title: "Main"}), s.admin(t)); w.Code != 400 {
		t.Fatalf("scope change: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "PUT", "/api/v1/admin/navigation/sections/"+sec.Id, jsonBody(view.NavSectionRequest{Scope: "generic", Title: "Main renamed", DisplayOrder: 9}), s.admin(t)); w.Code != 200 || !strings.Contains(w.Body.String(), "Main renamed") || !strings.Contains(w.Body.String(), "L1") {
		t.Fatalf("rename section: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "PUT", "/api/v1/admin/navigation/sections/"+other.Id, jsonBody(view.NavSectionRequest{Scope: "package", PackageId: "PKG", Title: "Pkg"}), s.admin(t)); w.Code != 200 {
		t.Fatalf("empty section scope change: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "PUT", "/api/v1/admin/navigation/sections/missing", jsonBody(view.NavSectionRequest{Scope: "generic", Title: "x"}), s.admin(t)); w.Code != 404 || !strings.Contains(w.Body.String(), "DOCS-2006") {
		t.Fatalf("missing section: %d %s", w.Code, w.Body.String())
	}

	// Delete item cascades to descendants; delete of unknown ids is 404.
	if w := s.do(t, "DELETE", "/api/v1/admin/navigation/items/"+g1.Id, nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete item: %d", w.Code)
	}
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/admin/navigation?scope=generic", nil, s.admin(t)))), []string{"Main renamed[a,Top]"})
	if w := s.do(t, "DELETE", "/api/v1/admin/navigation/items/"+g2.Id, nil, s.admin(t)); w.Code != 404 {
		t.Fatalf("deleted child: %d", w.Code)
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/navigation/sections/missing", nil, s.admin(t)); w.Code != 404 {
		t.Fatalf("missing section delete: %d", w.Code)
	}
}

const navManifest = manifest + `navigation:
  - scope: generic
    title: Getting started
    order: 1
    items:
      - kind: guide
        article: intro
        title: Start here
        order: 1
      - kind: group
        title: Reference
        order: 2
        items:
          - kind: guide
            article: internal
  - scope: package
    packageId: PKG
    title: Package
    order: 1
    items:
      - kind: guide
        article: pkg-readme
`

func TestImportExportNavigation(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# r"}}
	files := map[string][]byte{"articles.yaml": []byte(navManifest), "intro.md": []byte("# Intro"), "internal.md": []byte("# Internal"), "articles/intro/logo.png": []byte("png")}
	w := s.do(t, "POST", "/api/v1/admin/import", strings.NewReader(string(buildZip(t, files))), s.admin(t), contentType("application/zip"))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"sections":2`) || !strings.Contains(w.Body.String(), `"items":4`) {
		t.Fatalf("import: %d %s", w.Code, w.Body.String())
	}
	// internal is unpublished + corporate: the group is dropped for everyone on the public tree.
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=generic", nil))), []string{"Getting started[intro]"})
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/admin/navigation?scope=generic", nil, s.admin(t)))), []string{"Getting started[intro,Reference(internal)]"})
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/navigation?scope=package&packageId=PKG&version=1.0", nil))), []string{"Package[pkg-readme]"})

	// Re-import replaces (not duplicates) the sections.
	s.do(t, "POST", "/api/v1/admin/import", strings.NewReader(string(buildZip(t, files))), s.admin(t), contentType("application/zip"))
	if s.nav.CountSections() != 2 || s.nav.CountItems() != 4 {
		t.Fatalf("re-import: %d sections, %d items", s.nav.CountSections(), s.nav.CountItems())
	}

	// Export carries the block; importing the export reproduces the same tree and is byte-stable.
	export1 := s.do(t, "GET", "/api/v1/admin/export", nil, s.admin(t)).Body.Bytes()
	var m service.Manifest
	if err := yaml.Unmarshal(readZip(t, export1)["articles.yaml"], &m); err != nil {
		t.Fatal(err)
	}
	if len(m.Navigation) != 2 || m.Navigation[0].Title != "Getting started" || m.Navigation[0].Items[0].Article != "intro" || m.Navigation[0].Items[0].Title != "Start here" ||
		m.Navigation[0].Items[1].Items[0].Article != "internal" || m.Navigation[1].PackageId != "PKG" {
		t.Fatalf("exported navigation: %+v", m.Navigation)
	}
	if w := s.do(t, "POST", "/api/v1/admin/import", strings.NewReader(string(export1)), s.admin(t), contentType("application/zip")); w.Code != 200 {
		t.Fatalf("re-import export: %d %s", w.Code, w.Body.String())
	}
	eq(t, outline(decodeNav(t, s.do(t, "GET", "/api/v1/admin/navigation?scope=generic", nil, s.admin(t)))), []string{"Getting started[intro,Reference(internal)]"})
	export2 := s.do(t, "GET", "/api/v1/admin/export", nil, s.admin(t)).Body.Bytes()
	if string(export1) != string(export2) {
		t.Fatal("export is not stable")
	}

	// Invalid navigation blocks are rejected before anything is written.
	for _, bad := range []string{
		"navigation:\n  - scope: generic\n    title: X\n    items:\n      - kind: guide\n        article: nope\n",
		"navigation:\n  - scope: generic\n    title: X\n    items:\n      - kind: guide\n        article: intro\n      - kind: guide\n        article: intro\n",
		"navigation:\n  - scope: generic\n    title: X\n    items:\n      - kind: guide\n        article: pkg-readme\n",
		"navigation:\n  - scope: generic\n    title: X\n    items:\n      - kind: group\n        title: a\n        items:\n          - kind: group\n            title: b\n            items:\n              - kind: group\n                title: c\n                items:\n                  - kind: guide\n                    article: intro\n",
		"navigation:\n  - scope: package\n    title: X\n    items: []\n",
	} {
		files["articles.yaml"] = []byte(manifest + bad)
		if w := s.do(t, "POST", "/api/v1/admin/import", strings.NewReader(string(buildZip(t, files))), s.admin(t), contentType("application/zip")); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3011") {
			t.Fatalf("%s: %d %s", bad, w.Code, w.Body.String())
		}
	}
	if s.nav.CountSections() != 2 {
		t.Fatal("failed import touched navigation")
	}
}
