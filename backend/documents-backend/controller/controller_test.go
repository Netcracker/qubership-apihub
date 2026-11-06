package controller_test

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/controller"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/internal/testsupport"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/security"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/gorilla/mux"
	"gopkg.in/yaml.v3"
)

const maxUpload = 1024

type testStack struct {
	fake     *testsupport.FakeApihub
	articles *testsupport.FakeArticleRepository
	files    *testsupport.FakeArticleFileRepository
	data     *testsupport.FakeFileDataRepository
	nav      *testsupport.FakeNavigationRepository
	home     *testsupport.FakeHomeArticleRepository
	router   *mux.Router
}

// newTestStack wires the real controllers/services over in-memory repositories and a fake APIHUB, registering the
// same route table as service.go.
func newTestStack(t *testing.T) *testStack {
	t.Helper()
	fake := testsupport.NewFakeApihub(t)
	fake.AnonymousAccess = true
	apihubClient := client.NewApihubClient(fake.URL(), 5*time.Second)
	articles := testsupport.NewFakeArticleRepository()
	files := testsupport.NewFakeArticleFileRepository()
	data := testsupport.NewFakeFileDataRepository(files)
	nav := testsupport.NewFakeNavigationRepository()
	home := testsupport.NewFakeHomeArticleRepository()
	articles.OnDelete = func(id string) {
		nav.OnArticleDeleted(id)
		home.OnArticleDeleted(id)
	}
	resp := responder.NewResponder(true)
	tx := testsupport.FakeTransactionRunner{}

	articleService := service.NewArticleService(tx, articles, files, data, apihubClient, time.Minute)
	articleFileService := service.NewArticleFileService(tx, articles, files, data, maxUpload)
	relayService := service.NewApihubRelayService(apihubClient)
	navigationService := service.NewNavigationService(nav, articles, articleService)
	packageAccessService := service.NewPackageAccessService(apihubClient, articles, nav)
	homeArticleService := service.NewHomeArticleService(tx, home, articles, articleService)
	importService := service.NewImportService(tx, articles, files, data, nav, home, articleService, maxUpload)
	exportService := service.NewExportService(articles, files, data, nav, home)
	authenticator := security.NewAuthenticator(apihubClient, security.NewPublicKeyProvider(apihubClient), security.NewAnonymousAccessProvider(apihubClient, time.Millisecond), resp)

	articleController := controller.NewArticleController(articleService, resp)
	adminArticleController := controller.NewAdminArticleController(articleService, articleFileService, relayService, packageAccessService, maxUpload, resp)
	adminArticleFileController := controller.NewAdminArticleFileController(articleFileService, packageAccessService, maxUpload, resp)
	articleFileController := controller.NewArticleFileController(articleFileService, resp)
	importExportController := controller.NewImportExportController(importService, exportService, resp)
	navigationController := controller.NewNavigationController(navigationService, resp)
	adminNavigationController := controller.NewAdminNavigationController(navigationService, packageAccessService, resp)
	homeArticleController := controller.NewHomeArticleController(homeArticleService, resp)
	adminHomeArticleController := controller.NewAdminHomeArticleController(homeArticleService, resp)
	readyChan := make(chan bool, 1)
	readyChan <- true
	healthController := controller.NewHealthController(readyChan)

	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/articles", authenticator.SecureOrAnonymous(articleController.GetArticles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/articles/{slug}", authenticator.SecureOrAnonymous(articleController.GetArticle)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/articles/{slug}/files/{path:.+}", authenticator.SecureOrAnonymous(articleFileController.GetArticleFile)).Methods(http.MethodGet, http.MethodHead)
	r.HandleFunc("/api/v1/admin/articles", authenticator.Secure(adminArticleController.GetAllArticles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/articles", authenticator.Secure(adminArticleController.CreateArticle)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}", authenticator.Secure(adminArticleController.UpdateArticle)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/admin/articles/{id}", authenticator.Secure(adminArticleController.DeleteArticle)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/admin/articles/{id}/publish", authenticator.Secure(adminArticleController.PublishArticle)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}/unpublish", authenticator.Secure(adminArticleController.UnpublishArticle)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}/files", authenticator.Secure(adminArticleFileController.GetArticleFiles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/articles/{id}/files", authenticator.Secure(adminArticleFileController.UploadArticleFiles)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}/files/{path:.+}", authenticator.Secure(adminArticleFileController.DeleteArticleFile)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/admin/apihub/packages/{packageId}/versions", authenticator.Secure(adminArticleController.GetApihubPackageVersions)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/apihub/packages/{packageId}/versions/{version}/documents", authenticator.Secure(adminArticleController.GetApihubVersionDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/import", authenticator.Secure(importExportController.Import)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/export", authenticator.Secure(importExportController.Export)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/navigation", authenticator.SecureOrAnonymous(navigationController.GetNavigation)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/navigation", authenticator.Secure(adminNavigationController.GetNavigation)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/navigation/sections", authenticator.Secure(adminNavigationController.CreateSection)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/navigation/sections/{id}", authenticator.Secure(adminNavigationController.UpdateSection)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/admin/navigation/sections/{id}", authenticator.Secure(adminNavigationController.DeleteSection)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/admin/navigation/items", authenticator.Secure(adminNavigationController.CreateItem)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/navigation/items/{id}", authenticator.Secure(adminNavigationController.UpdateItem)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/admin/navigation/items/{id}", authenticator.Secure(adminNavigationController.DeleteItem)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/home-articles", authenticator.SecureOrAnonymous(homeArticleController.GetHomeArticles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/home-articles", authenticator.Secure(adminHomeArticleController.GetHomeArticles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/home-articles", authenticator.Secure(adminHomeArticleController.SetHomeArticles)).Methods(http.MethodPut)
	return &testStack{fake: fake, articles: articles, files: files, data: data, nav: nav, home: home, router: r}
}

func str(s string) *string { return &s }

func (s *testStack) seedGeneric(slug, visibility string, published bool, order int) *entity.ArticleEntity {
	return s.articles.Add(entity.ArticleEntity{Slug: slug, Title: strings.ToUpper(slug), Scope: view.ScopeGeneric, BodyMd: str("# " + slug),
		Visibility: str(visibility), Labels: []string{}, DisplayOrder: order, Published: published, CreatedAt: time.Now(), UpdatedAt: time.Now()})
}

func (s *testStack) seedPackage(slug, pkg, version, doc string) *entity.ArticleEntity {
	var v *string
	if version != "" {
		v = str(version)
	}
	return s.articles.Add(entity.ArticleEntity{Slug: slug, Title: slug, Scope: view.ScopePackage, PackageId: str(pkg), Version: v, DocumentSlug: str(doc),
		Labels: []string{}, Published: true, CreatedAt: time.Now(), UpdatedAt: time.Now()})
}

type reqOpt func(r *http.Request)

func (s *testStack) do(t *testing.T, method, path string, body io.Reader, opts ...reqOpt) *httptest.ResponseRecorder {
	t.Helper()
	r := httptest.NewRequest(method, path, body)
	for _, o := range opts {
		o(r)
	}
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, r)
	return w
}

func (s *testStack) user(t *testing.T) reqOpt {
	tok := s.fake.Token(t, "alice", "", time.Hour)
	return func(r *http.Request) { r.AddCookie(&http.Cookie{Name: view.AccessTokenCookieName, Value: tok}) }
}

func (s *testStack) admin(t *testing.T) reqOpt {
	tok := s.fake.Token(t, "root", view.SysadmRole, time.Hour)
	return func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+tok) }
}

func contentType(ct string) reqOpt {
	return func(r *http.Request) { r.Header.Set("Content-Type", ct) }
}

func jsonBody(v interface{}) io.Reader {
	b, _ := json.Marshal(v)
	return bytes.NewReader(b)
}

func decodeSlugs(t *testing.T, w *httptest.ResponseRecorder) []string {
	t.Helper()
	if w.Code != 200 {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
	var out view.Articles
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	slugs := make([]string, 0, len(out.Articles))
	for _, a := range out.Articles {
		slugs = append(slugs, a.Slug)
	}
	return slugs
}

func eq(t *testing.T, got, want []string) {
	t.Helper()
	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf("got %v, want %v", got, want)
	}
}

// ---- generic articles ----

func TestGenericVisibilityMatrix(t *testing.T) {
	s := newTestStack(t)
	s.seedGeneric("pub-b", view.VisibilityPublic, true, 2)
	s.seedGeneric("pub-a", view.VisibilityPublic, true, 1)
	s.seedGeneric("corp", view.VisibilityCorporate, true, 3)
	s.seedGeneric("draft", view.VisibilityPublic, false, 0)

	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=generic", nil)), []string{"pub-a", "pub-b"})
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=generic", nil, s.user(t))), []string{"pub-a", "pub-b", "corp"})
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=generic", nil, s.admin(t))), []string{"pub-a", "pub-b", "corp"})
	// visibility filter narrows but never widens
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=generic&visibility=corporate", nil)), []string{})
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=generic&visibility=corporate", nil, s.user(t))), []string{"corp"})
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=generic&limit=1&page=1", nil)), []string{"pub-b"})
	if w := s.do(t, "GET", "/api/v1/articles?limit=abc", nil); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3001") {
		t.Fatalf("bad limit: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "GET", "/api/v1/articles", nil); strings.Contains(w.Body.String(), "bodyMd") {
		t.Fatalf("list must not include bodyMd: %s", w.Body.String())
	}
}

func TestGenericGet(t *testing.T) {
	s := newTestStack(t)
	s.seedGeneric("pub", view.VisibilityPublic, true, 1)
	s.seedGeneric("corp", view.VisibilityCorporate, true, 2)
	s.seedGeneric("draft", view.VisibilityPublic, false, 3)

	w := s.do(t, "GET", "/api/v1/articles/pub", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"bodyMd":"# pub"`) {
		t.Fatalf("public get: %d %s", w.Code, w.Body.String())
	}
	for _, c := range []struct {
		path string
		opt  []reqOpt
		want int
	}{
		{"/api/v1/articles/corp", nil, 404},
		{"/api/v1/articles/corp", []reqOpt{s.user(t)}, 200},
		{"/api/v1/articles/draft", nil, 404},
		{"/api/v1/articles/draft", []reqOpt{s.user(t)}, 404},
		{"/api/v1/articles/draft", []reqOpt{s.admin(t)}, 200},
		{"/api/v1/articles/missing", []reqOpt{s.admin(t)}, 404},
	} {
		if w := s.do(t, "GET", c.path, nil, c.opt...); w.Code != c.want {
			t.Fatalf("%s (%d opts): want %d, got %d %s", c.path, len(c.opt), c.want, w.Code, w.Body.String())
		}
	}
	var body map[string]interface{}
	_ = json.Unmarshal(s.do(t, "GET", "/api/v1/articles/corp", nil).Body.Bytes(), &body)
	if body["code"] != "DOCS-2001" || body["message"] != "Article 'corp' not found" {
		t.Fatalf("expected DOCS-2001 with resolved message, got %v", body)
	}
}

func TestAnonymousDisabledEverythingIs401(t *testing.T) {
	s := newTestStack(t)
	s.fake.AnonymousAccess = false
	time.Sleep(2 * time.Millisecond)
	s.seedGeneric("pub", view.VisibilityPublic, true, 1)
	for _, p := range []string{"/api/v1/articles?scope=generic", "/api/v1/articles/pub", "/api/v1/articles/pub/files/x.png", "/api/v1/admin/articles"} {
		if w := s.do(t, "GET", p, nil); w.Code != 401 {
			t.Fatalf("%s: want 401, got %d", p, w.Code)
		}
	}
	if w := s.do(t, "GET", "/api/v1/articles?scope=generic", nil, s.user(t)); w.Code != 200 {
		t.Fatalf("user with flag off: want 200, got %d", w.Code)
	}
}

// ---- package articles ----

func TestPackageArticles(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PUB.PKG"] = map[string]map[string]string{"1.0": {"readme": "# readme 1.0"}, "2.0": {"readme": "# readme 2.0", "changelog": "# changes"}}
	s.fake.Packages["PRIV.PKG"] = map[string]map[string]string{"1.0": {"readme": "# private"}}
	s.fake.PrivatePackages["PRIV.PKG"] = true
	s.seedPackage("pub-readme", "PUB.PKG", "2.0", "readme")
	s.seedPackage("pub-readme-old", "PUB.PKG", "1.0", "readme")
	s.seedPackage("pub-changelog", "PUB.PKG", "", "changelog") // every version
	s.seedPackage("priv-readme", "PRIV.PKG", "1.0", "readme")

	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=package&packageId=PUB.PKG&version=2.0", nil)), []string{"pub-changelog", "pub-readme"})
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=package&packageId=PUB.PKG&version=1.0", nil)), []string{"pub-changelog", "pub-readme-old"})
	var out view.Articles
	_ = json.Unmarshal(s.do(t, "GET", "/api/v1/articles?scope=package&packageId=PUB.PKG&version=1.0", nil).Body.Bytes(), &out)
	if out.Articles[0].Version != "1.0" || out.Articles[0].PackageId != "PUB.PKG" || out.Articles[0].DocumentSlug != "changelog" {
		t.Fatalf("effective version/packageId/documentSlug missing: %+v", out.Articles[0])
	}

	if w := s.do(t, "GET", "/api/v1/articles?scope=package&packageId=PUB.PKG&version=9.9", nil); w.Code != 404 {
		t.Fatalf("unknown version: want 404, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles?scope=package&packageId=PRIV.PKG&version=1.0", nil); w.Code != 404 {
		t.Fatalf("private package anonymous: want 404, got %d %s", w.Code, w.Body.String())
	}
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles?scope=package&packageId=PRIV.PKG&version=1.0", nil, s.user(t))), []string{"priv-readme"})
	if req := s.fake.LastRequestTo("/api/v3/packages/PRIV.PKG/versions/1.0"); req == nil || !strings.HasPrefix(req.Header.Get("Authorization"), "Bearer ") {
		t.Fatalf("caller credentials not forwarded to APIHUB")
	}
	if w := s.do(t, "GET", "/api/v1/articles?scope=package&packageId=PUB.PKG", nil); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3003") {
		t.Fatalf("missing version: %d %s", w.Code, w.Body.String())
	}

	// body fetched from APIHUB and cached per principal
	w := s.do(t, "GET", "/api/v1/articles/pub-readme", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"bodyMd":"# readme 2.0"`) || !strings.Contains(w.Body.String(), `"version":"2.0"`) {
		t.Fatalf("package body: %d %s", w.Code, w.Body.String())
	}
	before := s.fake.RawCalls
	s.do(t, "GET", "/api/v1/articles/pub-readme", nil)
	if s.fake.RawCalls != before {
		t.Fatalf("second read must hit the cache, raw calls %d -> %d", before, s.fake.RawCalls)
	}
	s.do(t, "GET", "/api/v1/articles/pub-readme", nil, s.user(t))
	if s.fake.RawCalls != before+1 {
		t.Fatalf("different principal must not share the cache entry")
	}

	if w := s.do(t, "GET", "/api/v1/articles/pub-changelog", nil); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3008") {
		t.Fatalf("null version without query: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "GET", "/api/v1/articles/pub-changelog?version=2.0", nil); w.Code != 200 || !strings.Contains(w.Body.String(), "# changes") {
		t.Fatalf("null version with query: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "GET", "/api/v1/articles/pub-changelog?version=1.0", nil); w.Code != 404 {
		t.Fatalf("document missing in that version: want 404, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/priv-readme", nil); w.Code != 404 {
		t.Fatalf("private body anonymous: want 404, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/priv-readme", nil, s.user(t)); w.Code != 200 || !strings.Contains(w.Body.String(), "# private") {
		t.Fatalf("private body user: %d %s", w.Code, w.Body.String())
	}
}

// ---- static files ----

func multipartUpload(t *testing.T, fields map[string]string, filename string, data []byte) (io.Reader, string) {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for k, v := range fields {
		_ = mw.WriteField(k, v)
	}
	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write(data)
	_ = mw.Close()
	return &buf, mw.FormDataContentType()
}

func TestArticleFileDownload(t *testing.T) {
	s := newTestStack(t)
	png := []byte("\x89PNG\r\n\x1a\nfake")
	pub := createArticle(t, s, view.ArticleRequest{Slug: "pub", Title: "Pub", Scope: "generic", Visibility: "public", BodyMd: str("# p"), Published: true})
	corp := createArticle(t, s, view.ArticleRequest{Slug: "corp", Title: "Corp", Scope: "generic", Visibility: "corporate", BodyMd: str("# c"), Published: true})

	body, ct := multipartUpload(t, map[string]string{"path": "images/a.png"}, "a.png", png)
	w := s.do(t, "POST", "/api/v1/admin/articles/"+pub.Id+"/files", body, s.admin(t), contentType(ct))
	if w.Code != 201 || !strings.Contains(w.Body.String(), `"path":"images/a.png"`) || !strings.Contains(w.Body.String(), `"checksum":"`) {
		t.Fatalf("upload: %d %s", w.Code, w.Body.String())
	}
	body, ct = multipartUpload(t, nil, "b.png", png)
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+pub.Id+"/files", body, s.user(t), contentType(ct)); w.Code != 403 || !strings.Contains(w.Body.String(), "DOCS-1002") {
		t.Fatalf("user upload: want 403, got %d %s", w.Code, w.Body.String())
	}
	body, ct = multipartUpload(t, map[string]string{"path": "docs/internal.pdf"}, "internal.pdf", []byte("%PDF-1.4"))
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+corp.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 201 {
		t.Fatalf("corporate upload: %d %s", w.Code, w.Body.String())
	}

	w = s.do(t, "GET", "/api/v1/articles/pub/files/images/a.png", nil)
	if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), png) || w.Header().Get("Content-Type") != "image/png" ||
		w.Header().Get("Cache-Control") != "public, max-age=3600" || w.Header().Get("ETag") == "" || w.Header().Get("Content-Length") != "12" {
		t.Fatalf("download: %d headers=%v", w.Code, w.Header())
	}
	etag := w.Header().Get("ETag")
	if w := s.do(t, "GET", "/api/v1/articles/pub/files/images/a.png", nil, func(r *http.Request) { r.Header.Set("If-None-Match", etag) }); w.Code != 304 {
		t.Fatalf("If-None-Match: want 304, got %d", w.Code)
	}
	if w := s.do(t, "HEAD", "/api/v1/articles/pub/files/images/a.png", nil); w.Code != 200 || w.Body.Len() != 0 || w.Header().Get("Content-Length") != "12" {
		t.Fatalf("HEAD: %d body=%d", w.Code, w.Body.Len())
	}
	if w := s.do(t, "GET", "/api/v1/articles/corp/files/docs/internal.pdf", nil); w.Code != 404 {
		t.Fatalf("corporate article file anonymous: want 404, got %d", w.Code)
	}
	w = s.do(t, "GET", "/api/v1/articles/corp/files/docs/internal.pdf", nil, s.user(t))
	if w.Code != 200 || !strings.HasPrefix(w.Header().Get("Cache-Control"), "private") {
		t.Fatalf("corporate article file user: %d %v", w.Code, w.Header())
	}
	if w := s.do(t, "GET", "/api/v1/articles/pub/files/../../etc/passwd", nil); w.Code != 404 {
		t.Fatalf("path traversal: want 404, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/missing/files/images/a.png", nil); w.Code != 404 {
		t.Fatalf("unknown article: want 404, got %d", w.Code)
	}
	// the same relative path on another article is a different file
	if w := s.do(t, "GET", "/api/v1/articles/corp/files/images/a.png", nil, s.user(t)); w.Code != 404 {
		t.Fatalf("path of another article: want 404, got %d", w.Code)
	}

	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+pub.Id+"/files/images/a.png", nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete: %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/pub/files/images/a.png", nil); w.Code != 404 {
		t.Fatalf("after delete: want 404, got %d", w.Code)
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+pub.Id+"/files/images/a.png", nil, s.admin(t)); w.Code != 404 {
		t.Fatalf("delete twice: want 404, got %d", w.Code)
	}
}

func TestArticleFileUploadSizeLimit(t *testing.T) {
	s := newTestStack(t)
	art := createArticle(t, s, view.ArticleRequest{Slug: "big", Title: "Big", Scope: "generic", Visibility: "public", BodyMd: str("# b"), Published: true})
	body, ct := multipartUpload(t, map[string]string{"path": "big.bin"}, "big.bin", bytes.Repeat([]byte("x"), maxUpload+1))
	w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct))
	if w.Code != 413 || !strings.Contains(w.Body.String(), "DOCS-3009") {
		t.Fatalf("oversize: %d %s", w.Code, w.Body.String())
	}
	body, ct = multipartUpload(t, map[string]string{"path": "ok.bin"}, "ok.bin", bytes.Repeat([]byte("x"), maxUpload))
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 201 {
		t.Fatalf("exact limit: %d %s", w.Code, w.Body.String())
	}
}

func TestAdminCrudAndPublish(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# r"}}

	if w := s.do(t, "GET", "/api/v1/admin/articles", nil); w.Code != 401 {
		t.Fatalf("admin list anonymous: want 401, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/admin/articles", nil, s.user(t)); w.Code != 403 {
		t.Fatalf("admin list user: want 403, got %d", w.Code)
	}

	w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "hello", Title: "Hello", Scope: "generic", Visibility: "public", BodyMd: str("# hello")}), s.admin(t))
	if w.Code != 201 {
		t.Fatalf("create: %d %s", w.Code, w.Body.String())
	}
	var created view.Article
	_ = json.Unmarshal(w.Body.Bytes(), &created)
	if created.Id == "" || created.CreatedBy != "root" || created.Published == nil || *created.Published {
		t.Fatalf("created: %+v", created)
	}
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles", nil)), []string{})
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/admin/articles", nil, s.admin(t))), []string{"hello"})
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+created.Id+"/publish", nil, s.admin(t)); w.Code != 200 {
		t.Fatalf("publish: %d", w.Code)
	}
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles", nil)), []string{"hello"})
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+created.Id+"/unpublish", nil, s.admin(t)); w.Code != 200 {
		t.Fatalf("unpublish: %d", w.Code)
	}
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles", nil)), []string{})

	if w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "hello", Title: "x", Scope: "generic", Visibility: "public", BodyMd: str("x")}), s.admin(t)); w.Code != 409 || !strings.Contains(w.Body.String(), "DOCS-3006") {
		t.Fatalf("duplicate slug: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "Bad Slug", Title: "x", Scope: "generic", Visibility: "public", BodyMd: str("x")}), s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3005") {
		t.Fatalf("bad slug: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "nobody", Title: "x", Scope: "generic", Visibility: "public"}), s.admin(t)); w.Code != 400 {
		t.Fatalf("generic without body: want 400, got %d", w.Code)
	}
	if w := s.do(t, "POST", "/api/v1/admin/articles", strings.NewReader("{not json"), s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3004") {
		t.Fatalf("bad json: %d %s", w.Code, w.Body.String())
	}

	// package article: validated against APIHUB with the admin's credentials
	w = s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "pkg-readme", Title: "Readme", Scope: "package", PackageId: "PKG", Version: "1.0", DocumentSlug: "readme", Published: true}), s.admin(t))
	if w.Code != 201 {
		t.Fatalf("create package article: %d %s", w.Code, w.Body.String())
	}
	if req := s.fake.LastRequestTo("/documents/readme"); req == nil || !strings.HasPrefix(req.Header.Get("Authorization"), "Bearer ") {
		t.Fatalf("admin credentials not forwarded for validation")
	}
	w = s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "pkg-missing", Title: "x", Scope: "package", PackageId: "PKG", Version: "1.0", DocumentSlug: "nope"}), s.admin(t))
	if w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3007") || !strings.Contains(w.Body.String(), "nope") {
		t.Fatalf("missing document must be 400 with a clear message: %d %s", w.Code, w.Body.String())
	}
	w = s.do(t, "POST", "/api/v1/admin/articles", jsonBody(view.ArticleRequest{Slug: "pkg-badver", Title: "x", Scope: "package", PackageId: "PKG", Version: "9.0", DocumentSlug: "readme"}), s.admin(t))
	if w.Code != 400 || !strings.Contains(w.Body.String(), "9.0") {
		t.Fatalf("missing version must be 400: %d %s", w.Code, w.Body.String())
	}

	w = s.do(t, "PUT", "/api/v1/admin/articles/"+created.Id, jsonBody(view.ArticleRequest{Slug: "hello", Title: "Hello 2", Scope: "generic", Visibility: "corporate", BodyMd: str("# updated"), Published: true}), s.admin(t))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"title":"Hello 2"`) {
		t.Fatalf("update: %d %s", w.Code, w.Body.String())
	}
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles", nil)), []string{})
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles", nil, s.user(t))), []string{"hello"})
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+created.Id, nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete: %d", w.Code)
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+created.Id, nil, s.admin(t)); w.Code != 404 || !strings.Contains(w.Body.String(), "DOCS-2002") {
		t.Fatalf("delete twice: %d %s", w.Code, w.Body.String())
	}

	// relays
	w = s.do(t, "GET", "/api/v1/admin/apihub/packages/PKG/versions", nil, s.admin(t))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"version":"1.0"`) {
		t.Fatalf("versions relay: %d %s", w.Code, w.Body.String())
	}
	w = s.do(t, "GET", "/api/v1/admin/apihub/packages/PKG/versions/1.0/documents", nil, s.admin(t))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"slug":"readme"`) || strings.Contains(w.Body.String(), "openapi") {
		t.Fatalf("documents relay must list markdown only: %d %s", w.Code, w.Body.String())
	}
}

// ---- import / export ----

func buildZip(t *testing.T, files map[string][]byte) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, data := range files {
		f, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = f.Write(data)
	}
	_ = zw.Close()
	return buf.Bytes()
}

func readZip(t *testing.T, data []byte) map[string][]byte {
	t.Helper()
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatal(err)
	}
	out := map[string][]byte{}
	for _, f := range zr.File {
		rc, _ := f.Open()
		out[f.Name], _ = io.ReadAll(rc)
		rc.Close()
	}
	return out
}

const manifest = `articles:
  - slug: intro
    title: Intro
    subtitle: Start here
    scope: generic
    visibility: public
    file: intro.md
    labels:
      - overview
    order: 1
    published: true
  - slug: internal
    title: Internal
    scope: generic
    visibility: corporate
    file: internal.md
    order: 2
    published: false
  - slug: pkg-readme
    title: Package readme
    scope: package
    packageId: PKG
    version: "1.0"
    documentSlug: readme
    order: 3
    published: true
`

func TestImportExportRoundTrip(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# r"}}
	archive := buildZip(t, map[string][]byte{
		"articles.yaml":           []byte(manifest),
		"intro.md":                []byte("# Intro\n\nhello"),
		"internal.md":             []byte("# Internal"),
		"articles/intro/logo.png": []byte("\x89PNG\r\n\x1a\nlogo"),
	})
	zipCt := contentType("application/zip")

	if w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(archive), s.user(t), zipCt); w.Code != 403 {
		t.Fatalf("import as user: want 403, got %d", w.Code)
	}
	w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(archive), s.admin(t), zipCt)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"articles":3`) || !strings.Contains(w.Body.String(), `"files":1`) {
		t.Fatalf("import: %d %s", w.Code, w.Body.String())
	}
	eq(t, decodeSlugs(t, s.do(t, "GET", "/api/v1/articles", nil)), []string{"intro"})
	if w := s.do(t, "GET", "/api/v1/articles/intro/files/logo.png", nil); w.Code != 200 || w.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("imported file: %d", w.Code)
	}

	// idempotent (upsert by slug / path)
	if w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(archive), s.admin(t), zipCt); w.Code != 200 || s.articles.Count() != 3 {
		t.Fatalf("re-import: %d, rows=%d", w.Code, s.articles.Count())
	}

	// export -> same layout; re-import of the export is a no-op and the export is stable
	w = s.do(t, "GET", "/api/v1/admin/export", nil, s.admin(t))
	if w.Code != 200 || w.Header().Get("Content-Type") != "application/zip" {
		t.Fatalf("export: %d", w.Code)
	}
	files := readZip(t, w.Body.Bytes())
	for _, name := range []string{"articles.yaml", "intro.md", "internal.md", "articles/intro/logo.png"} {
		if _, ok := files[name]; !ok {
			t.Fatalf("export missing %s", name)
		}
	}
	if string(files["intro.md"]) != "# Intro\n\nhello" {
		t.Fatalf("exported body differs: %q", files["intro.md"])
	}
	var m service.Manifest
	if err := yaml.Unmarshal(files["articles.yaml"], &m); err != nil {
		t.Fatal(err)
	}
	if len(m.Articles) != 3 {
		t.Fatalf("manifest: %+v", m)
	}
	var pkg *service.ManifestArticle
	for i := range m.Articles {
		if m.Articles[i].Slug == "pkg-readme" {
			pkg = &m.Articles[i]
		}
	}
	if pkg == nil || pkg.PackageId != "PKG" || pkg.Version != "1.0" || pkg.DocumentSlug != "readme" || pkg.File != "" {
		t.Fatalf("package article in export: %+v", pkg)
	}
	if w2 := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(w.Body.Bytes()), s.admin(t), zipCt); w2.Code != 200 || s.articles.Count() != 3 {
		t.Fatalf("re-import export: %d %s rows=%d", w2.Code, w2.Body.String(), s.articles.Count())
	}
	if w3 := s.do(t, "GET", "/api/v1/admin/export", nil, s.admin(t)); !bytes.Equal(w.Body.Bytes(), w3.Body.Bytes()) {
		t.Fatalf("export is not stable across import/export cycles")
	}

	// package ref validation on import, skippable with validate=false
	bad := buildZip(t, map[string][]byte{"articles.yaml": []byte("articles:\n  - slug: x\n    title: X\n    scope: package\n    packageId: PKG\n    version: '1.0'\n    documentSlug: missing\n")})
	if w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(bad), s.admin(t), zipCt); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3011") {
		t.Fatalf("bad package ref: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "POST", "/api/v1/admin/import?validate=false", bytes.NewReader(bad), s.admin(t), zipCt); w.Code != 200 {
		t.Fatalf("validate=false must skip APIHUB checks: %d %s", w.Code, w.Body.String())
	}
}

func TestImportViaMultipartAndBadArchive(t *testing.T) {
	s := newTestStack(t)
	archive := buildZip(t, map[string][]byte{"articles.yaml": []byte("articles:\n  - slug: a\n    title: A\n    scope: generic\n    visibility: public\n    file: a.md\n"), "a.md": []byte("# a")})
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, _ := mw.CreateFormFile("archive", "x.zip")
	_, _ = fw.Write(archive)
	_ = mw.Close()
	if w := s.do(t, "POST", "/api/v1/admin/import", &buf, s.admin(t), contentType(mw.FormDataContentType())); w.Code != 200 {
		t.Fatalf("multipart import: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "POST", "/api/v1/admin/import", strings.NewReader("not a zip"), s.admin(t), contentType("application/zip")); w.Code != 400 {
		t.Fatalf("bad archive: want 400, got %d", w.Code)
	}
	missing := buildZip(t, map[string][]byte{"articles.yaml": []byte("articles:\n  - slug: a\n    title: A\n    scope: generic\n    visibility: public\n    file: nope.md\n")})
	if w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(missing), s.admin(t), contentType("application/zip")); w.Code != 400 {
		t.Fatalf("missing md: want 400, got %d %s", w.Code, w.Body.String())
	}
}

func TestHealth(t *testing.T) {
	s := newTestStack(t)
	if w := s.do(t, "GET", "/live", nil); w.Code != 200 {
		t.Fatalf("live: %d", w.Code)
	}
	time.Sleep(5 * time.Millisecond) // readyChan is consumed asynchronously
	if w := s.do(t, "GET", "/ready", nil); w.Code != 200 {
		t.Fatalf("ready: %d", w.Code)
	}
}

// ---- article files ----

func multipartFiles(t *testing.T, fields map[string]string, files map[string][]byte, fileField string) (io.Reader, string) {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for k, v := range fields {
		_ = mw.WriteField(k, v)
	}
	for name, data := range files {
		fw, err := mw.CreateFormFile(fileField, name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = fw.Write(data)
	}
	_ = mw.Close()
	return &buf, mw.FormDataContentType()
}

func createArticle(t *testing.T, s *testStack, req view.ArticleRequest) view.Article {
	t.Helper()
	w := s.do(t, "POST", "/api/v1/admin/articles", jsonBody(req), s.admin(t))
	if w.Code != 201 {
		t.Fatalf("create %s: %d %s", req.Slug, w.Code, w.Body.String())
	}
	var created view.Article
	_ = json.Unmarshal(w.Body.Bytes(), &created)
	return created
}

func TestArticleFilesLifecycle(t *testing.T) {
	s := newTestStack(t)
	png := []byte("\x89PNG\r\n\x1a\nfake")
	art := createArticle(t, s, view.ArticleRequest{Slug: "guide", Title: "Guide", Scope: "generic", Visibility: "public", BodyMd: str("# g"), Published: true})

	// upload (repeatable "file" parts), default path = file name, paths are relative to the article
	body, ct := multipartFiles(t, nil, map[string][]byte{"diagram.png": png, "notes.txt": []byte("hi")}, "file")
	w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct))
	if w.Code != 201 || !strings.Contains(w.Body.String(), `"path":"diagram.png"`) || strings.Contains(w.Body.String(), "articles/guide") {
		t.Fatalf("upload: %d %s", w.Code, w.Body.String())
	}
	// explicit relative path
	body, ct = multipartFiles(t, map[string]string{"path": "img/logo.png"}, map[string][]byte{"x.png": png}, "file")
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 201 || !strings.Contains(w.Body.String(), `"path":"img/logo.png"`) {
		t.Fatalf("explicit path: %d %s", w.Code, w.Body.String())
	}
	// conflict within the article, size limit, auth
	body, ct = multipartFiles(t, nil, map[string][]byte{"diagram.png": png}, "file")
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 409 || !strings.Contains(w.Body.String(), "DOCS-3012") {
		t.Fatalf("conflict: %d %s", w.Code, w.Body.String())
	}
	body, ct = multipartFiles(t, nil, map[string][]byte{"big.bin": bytes.Repeat([]byte("x"), maxUpload+1)}, "file")
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 413 || !strings.Contains(w.Body.String(), "DOCS-3009") {
		t.Fatalf("too large: %d %s", w.Code, w.Body.String())
	}
	body, ct = multipartFiles(t, nil, map[string][]byte{"a.png": png}, "file")
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.user(t), contentType(ct)); w.Code != 403 {
		t.Fatalf("user upload: want 403, got %d", w.Code)
	}
	if w := s.do(t, "POST", "/api/v1/admin/articles/missing/files", body, s.admin(t), contentType(ct)); w.Code != 404 {
		t.Fatalf("unknown article: want 404, got %d", w.Code)
	}
	body, ct = multipartFiles(t, nil, map[string][]byte{"evil.png": png}, "other")
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 400 {
		t.Fatalf("no file part: want 400, got %d", w.Code)
	}

	// listing (admin, with checksum) and public projection on the article (without)
	w = s.do(t, "GET", "/api/v1/admin/articles/"+art.Id+"/files", nil, s.admin(t))
	var listed view.ArticleFiles
	_ = json.Unmarshal(w.Body.Bytes(), &listed)
	if w.Code != 200 || len(listed.Files) != 3 || listed.Files[0].Path != "diagram.png" || listed.Files[0].Checksum == "" || listed.Files[0].CreatedAt == nil {
		t.Fatalf("list: %d %+v", w.Code, listed)
	}
	var got view.Article
	_ = json.Unmarshal(s.do(t, "GET", "/api/v1/articles/guide", nil).Body.Bytes(), &got)
	if len(got.Files) != 3 || got.Files[0].Path != "diagram.png" || got.Files[0].ContentType != "image/png" || got.Files[0].Size != 12 || got.Files[0].Checksum != "" {
		t.Fatalf("public files projection: %+v", got.Files)
	}
	var list view.Articles
	_ = json.Unmarshal(s.do(t, "GET", "/api/v1/articles", nil).Body.Bytes(), &list)
	if len(list.Articles) != 1 || len(list.Articles[0].Files) != 3 {
		t.Fatalf("list projection: %+v", list.Articles)
	}
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/diagram.png", nil); w.Code != 200 || !bytes.Equal(w.Body.Bytes(), png) {
		t.Fatalf("anonymous fetch of public article file: %d", w.Code)
	}
	// diagram.png and img/logo.png share their bytes: one content row for three files
	if s.data.Count() != 2 {
		t.Fatalf("content rows: want 2, got %d", s.data.Count())
	}

	// audience follows the article at serve time: corporate article -> anonymous 404, user 200
	w = s.do(t, "PUT", "/api/v1/admin/articles/"+art.Id, jsonBody(view.ArticleRequest{Slug: "guide", Title: "Guide", Scope: "generic", Visibility: "corporate", BodyMd: str("# g"), Published: true}), s.admin(t))
	if w.Code != 200 {
		t.Fatalf("update: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/diagram.png", nil); w.Code != 404 {
		t.Fatalf("corporate article file for anonymous: want 404, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/diagram.png", nil, s.user(t)); w.Code != 200 || !strings.HasPrefix(w.Header().Get("Cache-Control"), "private") {
		t.Fatalf("corporate article file for user: want 200 private, got %d %v", w.Code, w.Header())
	}
	// unpublished article: files visible to admins only
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/unpublish", nil, s.admin(t)); w.Code != 200 {
		t.Fatalf("unpublish: %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/diagram.png", nil, s.user(t)); w.Code != 404 {
		t.Fatalf("unpublished article file for user: want 404, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/diagram.png", nil, s.admin(t)); w.Code != 200 {
		t.Fatalf("unpublished article file for admin: want 200, got %d", w.Code)
	}
	// slug is immutable
	if w := s.do(t, "PUT", "/api/v1/admin/articles/"+art.Id, jsonBody(view.ArticleRequest{Slug: "guide-2", Title: "Guide", Scope: "generic", Visibility: "corporate", BodyMd: str("# g")}), s.admin(t)); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3013") {
		t.Fatalf("slug change: %d %s", w.Code, w.Body.String())
	}

	// delete one file by relative path; shared content survives while another file references it
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+art.Id+"/files/notes.txt", nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete: %d %s", w.Code, w.Body.String())
	}
	if s.data.Count() != 1 {
		t.Fatalf("content of notes.txt must be gone, rows=%d", s.data.Count())
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+art.Id+"/files/img/logo.png", nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete nested: %d %s", w.Code, w.Body.String())
	}
	if s.data.Count() != 1 {
		t.Fatalf("shared content must survive while diagram.png exists, rows=%d", s.data.Count())
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+art.Id+"/files/notes.txt", nil, s.admin(t)); w.Code != 404 {
		t.Fatalf("delete twice: want 404, got %d", w.Code)
	}
	// a file of another article cannot be deleted through this article
	other := createArticle(t, s, view.ArticleRequest{Slug: "other", Title: "Other", Scope: "generic", Visibility: "public", BodyMd: str("# o")})
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+other.Id+"/files/diagram.png", nil, s.admin(t)); w.Code != 404 {
		t.Fatalf("cross-article delete: want 404, got %d", w.Code)
	}

	// cascade on article delete, including the now orphaned content
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+art.Id, nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete article: %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/diagram.png", nil, s.admin(t)); w.Code != 404 {
		t.Fatalf("file must be gone after article delete, got %d", w.Code)
	}
	if s.files.Count() != 0 || s.data.Count() != 0 {
		t.Fatalf("rows after article delete: files=%d data=%d", s.files.Count(), s.data.Count())
	}
}

func TestPackageArticleFilesAreCorporate(t *testing.T) {
	s := newTestStack(t)
	s.fake.Packages["PKG"] = map[string]map[string]string{"1.0": {"readme": "# r"}}
	art := createArticle(t, s, view.ArticleRequest{Slug: "pkg", Title: "Pkg", Scope: "package", PackageId: "PKG", Version: "1.0", DocumentSlug: "readme", Published: true})
	body, ct := multipartFiles(t, nil, map[string][]byte{"a.png": []byte("x")}, "file")
	if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 201 {
		t.Fatalf("package article file: %d %s", w.Code, w.Body.String())
	}
	if w := s.do(t, "GET", "/api/v1/articles/pkg/files/a.png", nil); w.Code != 404 {
		t.Fatalf("anonymous must not read package article files, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/pkg/files/a.png", nil, s.user(t)); w.Code != 200 || !strings.HasPrefix(w.Header().Get("Cache-Control"), "private") {
		t.Fatalf("user reads package article files: %d %v", w.Code, w.Header())
	}
}

func TestArticleFilePathsAreScopedPerArticle(t *testing.T) {
	s := newTestStack(t)
	png := []byte("\x89PNG\r\n\x1a\nshared")
	a := createArticle(t, s, view.ArticleRequest{Slug: "a", Title: "A", Scope: "generic", Visibility: "public", BodyMd: str("# a"), Published: true})
	b := createArticle(t, s, view.ArticleRequest{Slug: "b", Title: "B", Scope: "generic", Visibility: "public", BodyMd: str("# b"), Published: true})
	for _, art := range []view.Article{a, b} {
		body, ct := multipartFiles(t, nil, map[string][]byte{"diagram.png": png}, "file")
		if w := s.do(t, "POST", "/api/v1/admin/articles/"+art.Id+"/files", body, s.admin(t), contentType(ct)); w.Code != 201 {
			t.Fatalf("upload to %s: %d %s", art.Slug, w.Code, w.Body.String())
		}
	}
	// two metadata rows, one content row
	if s.files.Count() != 2 || s.data.Count() != 1 {
		t.Fatalf("rows: files=%d data=%d", s.files.Count(), s.data.Count())
	}
	for _, slug := range []string{"a", "b"} {
		if w := s.do(t, "GET", "/api/v1/articles/"+slug+"/files/diagram.png", nil); w.Code != 200 || !bytes.Equal(w.Body.Bytes(), png) {
			t.Fatalf("fetch %s: %d", slug, w.Code)
		}
	}
	// deleting one keeps the shared content; deleting the last reference removes it
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+a.Id+"/files/diagram.png", nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete a: %d", w.Code)
	}
	if s.data.Count() != 1 {
		t.Fatalf("content must survive: rows=%d", s.data.Count())
	}
	if w := s.do(t, "GET", "/api/v1/articles/b/files/diagram.png", nil); w.Code != 200 {
		t.Fatalf("b after deleting a: %d", w.Code)
	}
	if w := s.do(t, "DELETE", "/api/v1/admin/articles/"+b.Id, nil, s.admin(t)); w.Code != 204 {
		t.Fatalf("delete article b: %d", w.Code)
	}
	if s.files.Count() != 0 || s.data.Count() != 0 {
		t.Fatalf("rows after last reference: files=%d data=%d", s.files.Count(), s.data.Count())
	}
}

func TestCreateArticleMultipart(t *testing.T) {
	s := newTestStack(t)
	md := "# Crème brûlée guide\n\nHow to bake it\nproperly.\n\n## Steps\n"
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("article", `{"scope":"generic","visibility":"public","published":true,"labels":["food"]}`)
	fw, _ := mw.CreateFormFile("markdown", "guide.md")
	_, _ = fw.Write([]byte(md))
	fw, _ = mw.CreateFormFile("file", "photo.png")
	_, _ = fw.Write([]byte("\x89PNG\r\n\x1a\n1"))
	fw, _ = mw.CreateFormFile("file", "recipe.pdf")
	_, _ = fw.Write([]byte("%PDF-1.4"))
	_ = mw.Close()
	w := s.do(t, "POST", "/api/v1/admin/articles", &buf, s.admin(t), contentType(mw.FormDataContentType()))
	if w.Code != 201 {
		t.Fatalf("multipart create: %d %s", w.Code, w.Body.String())
	}
	var created view.Article
	_ = json.Unmarshal(w.Body.Bytes(), &created)
	if created.Slug != "creme-brulee-guide" || created.Title != "Crème brûlée guide" || created.Subtitle != "How to bake it properly." || created.BodyMd == nil || *created.BodyMd != md {
		t.Fatalf("derived fields: %+v", created)
	}
	if len(created.Files) != 2 || created.Files[0].Path != "photo.png" || created.Files[1].Path != "recipe.pdf" {
		t.Fatalf("attached files: %+v", created.Files)
	}
	if w := s.do(t, "GET", "/api/v1/articles/creme-brulee-guide/files/photo.png", nil); w.Code != 200 {
		t.Fatalf("attached file fetch: %d", w.Code)
	}
	// explicit JSON fields win over derived ones
	var buf2 bytes.Buffer
	mw = multipart.NewWriter(&buf2)
	_ = mw.WriteField("article", `{"slug":"custom","title":"Custom title","scope":"generic","visibility":"corporate"}`)
	fw, _ = mw.CreateFormFile("markdown", "x.md")
	_, _ = fw.Write([]byte("# Ignored\n\nsub"))
	_ = mw.Close()
	w = s.do(t, "POST", "/api/v1/admin/articles", &buf2, s.admin(t), contentType(mw.FormDataContentType()))
	if w.Code != 201 || !strings.Contains(w.Body.String(), `"slug":"custom"`) || !strings.Contains(w.Body.String(), `"title":"Custom title"`) || !strings.Contains(w.Body.String(), `"subtitle":"sub"`) {
		t.Fatalf("explicit fields: %d %s", w.Code, w.Body.String())
	}
}

func TestImportExportWithArticleFiles(t *testing.T) {
	s := newTestStack(t)
	archive := buildZip(t, map[string][]byte{
		"articles.yaml":            []byte("articles:\n  - slug: guide\n    title: Guide\n    scope: generic\n    visibility: public\n    file: guide.md\n    published: true\n  - slug: secret\n    title: Secret\n    scope: generic\n    visibility: corporate\n    file: secret.md\n    published: true\n"),
		"guide.md":                 []byte("# Guide"),
		"secret.md":                []byte("# Secret"),
		"articles/guide/a.png":     []byte("same"),
		"articles/guide/img/b.png": []byte("other"),
		"articles/secret/a.png":    []byte("same"),
	})
	zipCt := contentType("application/zip")
	w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(archive), s.admin(t), zipCt)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"files":3`) {
		t.Fatalf("import: %d %s", w.Code, w.Body.String())
	}
	var guide view.Article
	_ = json.Unmarshal(s.do(t, "GET", "/api/v1/articles/guide", nil).Body.Bytes(), &guide)
	if len(guide.Files) != 2 || guide.Files[0].Path != "a.png" || guide.Files[1].Path != "img/b.png" {
		t.Fatalf("imported files not linked: %+v", guide.Files)
	}
	// identical bytes in two articles are stored once
	if s.files.Count() != 3 || s.data.Count() != 2 {
		t.Fatalf("rows: files=%d data=%d", s.files.Count(), s.data.Count())
	}
	// the audience is the article's: guide is public, secret is corporate
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/a.png", nil); w.Code != 200 {
		t.Fatalf("public article file: %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/secret/files/a.png", nil); w.Code != 404 {
		t.Fatalf("corporate article file for anonymous: want 404, got %d", w.Code)
	}
	if w := s.do(t, "GET", "/api/v1/articles/secret/files/a.png", nil, s.user(t)); w.Code != 200 {
		t.Fatalf("corporate article file for user: %d", w.Code)
	}
	// files for an unknown article are rejected
	bad := buildZip(t, map[string][]byte{"articles.yaml": []byte("articles: []\n"), "articles/nope/x.png": []byte("x")})
	if w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(bad), s.admin(t), zipCt); w.Code != 400 || !strings.Contains(w.Body.String(), "DOCS-3011") {
		t.Fatalf("unknown article files: %d %s", w.Code, w.Body.String())
	}
	// files for a stored article may be imported without re-declaring it
	extra := buildZip(t, map[string][]byte{"articles.yaml": []byte("articles: []\n"), "articles/guide/c.png": []byte("c")})
	if w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(extra), s.admin(t), zipCt); w.Code != 200 || !strings.Contains(w.Body.String(), `"files":1`) {
		t.Fatalf("files of stored article: %d %s", w.Code, w.Body.String())
	}
	// re-import with changed bytes replaces the content and drops the orphan
	changed := buildZip(t, map[string][]byte{"articles.yaml": []byte("articles: []\n"), "articles/guide/c.png": []byte("c2")})
	if w := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(changed), s.admin(t), zipCt); w.Code != 200 {
		t.Fatalf("replace: %d %s", w.Code, w.Body.String())
	}
	if s.files.Count() != 4 || s.data.Count() != 3 {
		t.Fatalf("rows after replace: files=%d data=%d", s.files.Count(), s.data.Count())
	}
	if w := s.do(t, "GET", "/api/v1/articles/guide/files/c.png", nil); w.Code != 200 || w.Body.String() != "c2" {
		t.Fatalf("replaced content: %d %q", w.Code, w.Body.String())
	}

	// export keeps the layout and re-import keeps the links
	w = s.do(t, "GET", "/api/v1/admin/export", nil, s.admin(t))
	files := readZip(t, w.Body.Bytes())
	for _, name := range []string{"articles/guide/a.png", "articles/guide/img/b.png", "articles/guide/c.png", "articles/secret/a.png", "guide.md"} {
		if _, ok := files[name]; !ok {
			t.Fatalf("export missing %s", name)
		}
	}
	for name := range files {
		if strings.HasPrefix(name, "static/") {
			t.Fatalf("export must not contain %s", name)
		}
	}
	if w2 := s.do(t, "POST", "/api/v1/admin/import", bytes.NewReader(w.Body.Bytes()), s.admin(t), zipCt); w2.Code != 200 {
		t.Fatalf("re-import: %d %s", w2.Code, w2.Body.String())
	}
	_ = json.Unmarshal(s.do(t, "GET", "/api/v1/articles/guide", nil).Body.Bytes(), &guide)
	if len(guide.Files) != 3 || s.files.Count() != 4 || s.data.Count() != 3 {
		t.Fatalf("links lost on re-import: %+v files=%d data=%d", guide.Files, s.files.Count(), s.data.Count())
	}
}
