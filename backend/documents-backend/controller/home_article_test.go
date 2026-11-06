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

func decodeHomeSlugs(t *testing.T, w *httptest.ResponseRecorder) []string {
	t.Helper()
	if w.Code != 200 {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
	var out view.HomeArticles
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	slugs := make([]string, 0, len(out.Articles))
	for _, a := range out.Articles {
		slugs = append(slugs, a.Slug)
	}
	return slugs
}

func decodeAdminHome(t *testing.T, w *httptest.ResponseRecorder) view.AdminHomeArticles {
	t.Helper()
	if w.Code != 200 {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
	var out view.AdminHomeArticles
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func adminHomeSlugs(list view.AdminHomeArticles) []string {
	out := make([]string, 0, len(list.Articles))
	for _, a := range list.Articles {
		out = append(out, a.Slug)
	}
	return out
}

func (s *testStack) putHome(t *testing.T, ids []string, opts ...reqOpt) *httptest.ResponseRecorder {
	t.Helper()
	return s.do(t, "PUT", "/api/v1/admin/home-articles", jsonBody(view.HomeArticlesRequest{ArticleIds: ids}), opts...)
}

func TestHomeArticles(t *testing.T) {
	s := newTestStack(t)
	pubA := s.seedGeneric("pub-a", view.VisibilityPublic, true, 1)
	pubB := s.seedGeneric("pub-b", view.VisibilityPublic, true, 2)
	corp := s.seedGeneric("corp", view.VisibilityCorporate, true, 3)
	draft := s.seedGeneric("draft", view.VisibilityPublic, false, 4)
	pkg := s.seedPackage("pkg", "PKG", "1.0", "readme")

	// Empty by default, for everyone.
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil)), []string{})
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.admin(t)))), []string{})

	// Auth on the admin side.
	if w := s.do(t, "GET", "/api/v1/admin/home-articles", nil); w.Code != 401 {
		t.Fatalf("anonymous admin get: %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.user(t)); w.Code != 403 || !strings.Contains(w.Body.String(), "DOCS-1002") {
		t.Fatalf("user admin get: %d %s", w.Code, w.Body.String())
	}
	if w := s.putHome(t, []string{pubA.Id}); w.Code != 401 {
		t.Fatalf("anonymous put: %d", w.Code)
	}
	if w := s.putHome(t, []string{pubA.Id}, s.user(t)); w.Code != 403 {
		t.Fatalf("user put: %d", w.Code)
	}

	// Validation: unknown id, non-generic, duplicates, bad json. Nothing is written on failure.
	if w := s.putHome(t, []string{pubA.Id, "missing"}, s.admin(t)); w.Code != 404 || !strings.Contains(w.Body.String(), "DOCS-2002") {
		t.Fatalf("unknown id: %d %s", w.Code, w.Body.String())
	}
	if w := s.putHome(t, []string{pubA.Id, pkg.Id}, s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3016") {
		t.Fatalf("package article: %d %s", w.Code, w.Body.String())
	}
	if w := s.putHome(t, []string{pubA.Id, pubB.Id, pubA.Id}, s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3017") {
		t.Fatalf("duplicate: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "PUT", "/api/v1/admin/home-articles", strings.NewReader("{"), s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3004") {
		t.Fatalf("bad json: %d %s", w.Code, w.Body.String())
	}
	if s.home.Count() != 0 {
		t.Fatalf("failed PUT wrote %d rows", s.home.Count())
	}

	// Round trip: array position is the order, regardless of the articles' own displayOrder.
	set := decodeAdminHome(t, s.putHome(t, []string{draft.Id, corp.Id, pubB.Id, pubA.Id}, s.admin(t)))
	eq(t, adminHomeSlugs(set), []string{"draft", "corp", "pub-b", "pub-a"})
	if set.Articles[0].Published || !set.Articles[1].Published || set.Articles[2].DisplayOrder != 2 || set.Articles[3].ArticleId != pubA.Id || set.Articles[0].Title != "DRAFT" {
		t.Fatalf("admin view: %+v", set.Articles)
	}
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.admin(t)))), []string{"draft", "corp", "pub-b", "pub-a"})

	// Public list: configured order, filtered by the caller's visibility; unpublished never shown.
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil)), []string{"pub-b", "pub-a"})
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil, s.user(t))), []string{"corp", "pub-b", "pub-a"})
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil, s.admin(t))), []string{"corp", "pub-b", "pub-a"})
	if w := s.do(t, "GET", "/api/v1/home-articles", nil, s.admin(t)); strings.Contains(w.Body.String(), "bodyMd") || strings.Contains(w.Body.String(), `"published"`) {
		t.Fatalf("public view must not carry body or admin fields: %s", w.Body.String())
	}
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+draft.Id+"/publish", nil, s.admin(t)); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil)), []string{"draft", "pub-b", "pub-a"})

	// Replace reorders / shrinks; empty array clears.
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.putHome(t, []string{pubA.Id, pubB.Id}, s.admin(t)))), []string{"pub-a", "pub-b"})
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil)), []string{"pub-a", "pub-b"})
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.putHome(t, []string{}, s.admin(t)))), []string{})
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil)), []string{})

	// Deleting an article cascades out of the list.
	s.putHome(t, []string{pubA.Id, pubB.Id}, s.admin(t))
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+pubA.Id, nil, s.admin(t)); w.Code != 204 {
		t.Fatal(w.Body.String())
	}
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.admin(t)))), []string{"pub-b"})
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil)), []string{"pub-b"})
	if s.home.Count() != 1 {
		t.Fatalf("cascade: %d rows", s.home.Count())
	}
}

func TestHomeArticlesAnonymousDisabled(t *testing.T) {
	s := newTestStack(t)
	s.fake.AnonymousAccess = false
	if w := s.do(t, "GET", "/api/v1/home-articles", nil); w.Code != 401 {
		t.Fatalf("want 401, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/home-articles", nil, s.user(t)); w.Code != 200 {
		t.Fatalf("user with flag off: want 200, got %d", w.Code)
	}
}

func TestImportExportHomeArticles(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# r"}}
	zipCt := contentType("application/zip")
	files := map[string][]byte{"intro.md": []byte("# Intro"), "internal.md": []byte("# Internal")}
	importWith := func(extra string) *httptest.ResponseRecorder {
		files["articles.yaml"] = []byte(manifest + extra)
		return s.do(t, "POST", "/api/v1/admin/import", strings.NewReader(string(buildZip(t, files))), s.admin(t), zipCt)
	}

	// Key present: list replaced in manifest order (unpublished allowed).
	if w := importWith("home:\n  - internal\n  - intro\n"); w.Code != 200 {
		t.Fatalf("import: %d %s", w.Code, w.Body.String())
	}
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.admin(t)))), []string{"internal", "intro"})
	eq(t, decodeHomeSlugs(t, s.do(t, "GET", "/api/v1/home-articles", nil)), []string{"intro"})

	// Key absent: list untouched. Empty list: cleared.
	if w := importWith(""); w.Code != 200 {
		t.Fatalf("import without home: %d %s", w.Code, w.Body.String())
	}
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.admin(t)))), []string{"internal", "intro"})

	// Export carries the slugs in order; re-importing the export reproduces the list and is byte-stable.
	export1 := s.do(t, "GET", "/api/v1/admin/export", nil, s.admin(t)).Body.Bytes()
	var m service.Manifest
	if err := yaml.Unmarshal(readZip(t, export1)["articles.yaml"], &m); err != nil {
		t.Fatal(err)
	}
	eq(t, m.Home, []string{"internal", "intro"})
	if w := s.do(t, "POST", "/api/v1/admin/import", strings.NewReader(string(export1)), s.admin(t), zipCt); w.Code != 200 {
		t.Fatalf("re-import export: %d %s", w.Code, w.Body.String())
	}
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.admin(t)))), []string{"internal", "intro"})
	if export2 := s.do(t, "GET", "/api/v1/admin/export", nil, s.admin(t)).Body.Bytes(); string(export1) != string(export2) {
		t.Fatal("export is not stable")
	}

	// Invalid lists are rejected before anything is written.
	for _, bad := range []string{"home:\n  - nope\n", "home:\n  - intro\n  - intro\n", "home:\n  - pkg-readme\n"} {
		if w := importWith(bad); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3011") {
			t.Fatalf("%s: %d %s", bad, w.Code, w.Body.String())
		}
	}
	eq(t, adminHomeSlugs(decodeAdminHome(t, s.do(t, "GET", "/api/v1/admin/home-articles", nil, s.admin(t)))), []string{"internal", "intro"})

	if w := importWith("home: []\n"); w.Code != 200 {
		t.Fatalf("clear: %d %s", w.Code, w.Body.String())
	}
	if s.home.Count() != 0 {
		t.Fatalf("empty home list must clear, rows=%d", s.home.Count())
	}
}
