// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io/ioutil"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PortalService interface {
	GenerateInteractivePageForPublishedFile(packageId string, versionName string, fileId string) ([]byte, string, error)
	GenerateInteractivePageForPublishedVersion(packageId string, versionName string) ([]byte, string, error)
	GenerateInteractivePageForTransformedDocuments(packageId, version string, transformedDocuments entity.TransformedContentDataEntity) ([]byte, error)
}

func NewPortalService(basePath string, publishedService PublishedService, publishedRepository repository.PublishedRepository, prjGrpIntRepo repository.PrjGrpIntRepository) PortalService {
	return &portalServiceImpl{basePath: basePath, publishedService: publishedService, publishedRepository: publishedRepository, prjGrpIntRepo: prjGrpIntRepo}
}

type portalServiceImpl struct {
	basePath            string
	publishedService    PublishedService
	publishedRepository repository.PublishedRepository
	prjGrpIntRepo       repository.PrjGrpIntRepository
}

const singlePageAssetPath = "/static/templates/single_page.html"

const scriptAssetPath = "/static/templates/scripts/apispec-view.js"
const indexAssetPath = "/static/templates/index.html"
const pageAssetPath = "/static/templates/page.html"
const lsAssetPath = "/static/templates/ls.html"
const logoAssetPath = "/static/templates/resources/corporatelogo.png"
const stylesAssetPath = "/static/templates/resources/styles.css"
const mdLibPath = "/static/templates/scripts/markdown-it.min.js"

func (p portalServiceImpl) GenerateInteractivePageForPublishedFile(packageId string, versionName string, slug string) ([]byte, string, error) {
	packageEnt, err := p.publishedRepository.GetPackage(packageId)
	if err != nil {
		return nil, "", err
	}

	file, data, err := p.publishedService.GetLatestContentDataBySlug(packageId, versionName, slug)
	if err != nil {
		return nil, "", err
	}
	if !isProcessable(file) {
		return nil, "", &exception.CustomError{
			Status:  http.StatusGone,
			Code:    exception.UnableToGenerateInteractiveDoc,
			Message: exception.UnableToGenerateInteractiveDocMsg,
			Params:  map[string]interface{}{"$file": file.Slug},
		}
	}

	if !isProcessable(file) {
		return nil, "", fmt.Errorf("file type is not supperted for export")
	}

	zipBuf := bytes.Buffer{}

	zw := zip.NewWriter(&zipBuf)

	scriptAssetFile, err := ioutil.ReadFile(p.basePath + scriptAssetPath)
	if err != nil {
		return nil, "", err
	}

	singlePageAssetFile, err := ioutil.ReadFile(p.basePath + singlePageAssetPath)
	if err != nil {
		return nil, "", err
	}

	lsAssetFile, err := ioutil.ReadFile(p.basePath + lsAssetPath)
	if err != nil {
		return nil, "", err
	}

	logoAssetFile, err := ioutil.ReadFile(p.basePath + logoAssetPath)
	if err != nil {
		return nil, "", err
	}
	stylesAssetFile, err := ioutil.ReadFile(p.basePath + stylesAssetPath)
	if err != nil {
		return nil, "", err
	}

	result := generateLs(string(lsAssetFile), packageEnt.Name, file.Version)
	err = addFileToZip(zw, "ls.html", []byte(result))
	if err != nil {
		return nil, "", err
	}

	// add static resources
	err = addFileToZip(zw, "resources/corporatelogo.png", logoAssetFile)
	if err != nil {
		return nil, "", err
	}
	err = addFileToZip(zw, "resources/styles.css", stylesAssetFile)
	if err != nil {
		return nil, "", err
	}

	spec := string(data.Data)
	spec = html.EscapeString(spec)

	result = generateSinglePage(string(singlePageAssetFile), packageEnt.Name, file.Version, file.Title, string(scriptAssetFile), spec)

	err = addFileToZip(zw, "index.html", []byte(result))
	if err != nil {
		return nil, "", err
	}

	err = zw.Close()
	if err != nil {
		return nil, "", err
	}

	return zipBuf.Bytes(), slug + ".zip", nil
}

func (p portalServiceImpl) GenerateInteractivePageForPublishedVersion(packageId string, versionName string) ([]byte, string, error) {
	packageEnt, err := p.publishedRepository.GetPackage(packageId)
	if err != nil {
		return nil, "", err
	}
	if packageEnt == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	if packageEnt.Kind == entity.KIND_GROUP {
		return nil, "", &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GroupDocGenerationUnsupported,
			Message: exception.GroupDocGenerationUnsupportedMsg,
		}
	}

	repoUrl := ""
	projectEnt, err := p.prjGrpIntRepo.GetById(packageId)
	if err != nil {
		return nil, "", err
	}
	if projectEnt != nil {
		repoUrl = projectEnt.RepositoryUrl
	}

	version, err := p.publishedRepository.GetVersion(packageId, versionName)
	if err != nil {
		return nil, "", err
	}
	if version == nil {
		return nil, "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}

	versionFiles, err := p.publishedRepository.GetRevisionContent(packageId, version.Version, version.Revision)
	if err != nil {
		return nil, "", err
	}

	scriptAssetFile, err := ioutil.ReadFile(p.basePath + scriptAssetPath)
	if err != nil {
		return nil, "", err
	}
	scriptAsset := string(scriptAssetFile)

	indexAssetFile, err := ioutil.ReadFile(p.basePath + indexAssetPath)
	if err != nil {
		return nil, "", err
	}
	indexAsset := string(indexAssetFile)

	pageAssetFile, err := ioutil.ReadFile(p.basePath + pageAssetPath)
	if err != nil {
		return nil, "", err
	}
	pageAsset := string(pageAssetFile)

	lsAssetFile, err := ioutil.ReadFile(p.basePath + lsAssetPath)
	if err != nil {
		return nil, "", err
	}

	logoAssetFile, err := ioutil.ReadFile(p.basePath + logoAssetPath)
	if err != nil {
		return nil, "", err
	}

	stylesAssetFile, err := ioutil.ReadFile(p.basePath + stylesAssetPath)
	if err != nil {
		return nil, "", err
	}

	mdLibFile, err := ioutil.ReadFile(p.basePath + mdLibPath)
	if err != nil {
		return nil, "", err
	}

	zipBuf := bytes.Buffer{}

	zw := zip.NewWriter(&zipBuf)

	sort.Slice(versionFiles, func(i, j int) bool {
		return versionFiles[i].Title < versionFiles[j].Title
	})

	var readmeHtml string
	var mdLibHtml string
	var fileList []view.FileMetadata
	generatedHtmls := map[string]bool{}
	for _, file := range versionFiles {
		cd, err := p.publishedRepository.GetContentData(packageId, file.Checksum)
		if err != nil {
			return nil, "", err
		}

		if !isProcessable(entity.MakePublishedContentView(&file)) {
			// include file to result plain list as is
			err = addFileToZip(zw, generateFlatName(file.Name, file.Slug), cd.Data) //TODO: need to use title here?
			if err != nil {
				return nil, "", err
			}
			if strings.HasSuffix(strings.ToLower(file.FileId), "readme.md") { // include readme as special chapter
				readmeHtml = fmt.Sprintf("    <div id=\"readmeMdDiv\" class=\"card content\">\n        <div class=\"card content\"></div>\n    </div>\n    <br>\n    <script>\n        var md = window.markdownit();\n        let temp=md.render(`%s`);\n        const readmeMdDiv = document.getElementById('readmeMdDiv');\n        readmeMdDiv.innerHTML=temp;\n    </script>",
					html.EscapeString(string(cd.Data)))
				mdLibHtml = fmt.Sprintf("<script>%s</script>", string(mdLibFile))
			}
		} else {
			spec := string(cd.Data)
			spec = html.EscapeString(spec)

			result := generatePage(pageAsset, packageEnt.Name, version.Version, file.Title, scriptAsset, spec)

			err = addFileToZip(zw, file.Slug+".html", []byte(result)) //TODO: need to use title here?
			if err != nil {
				return nil, "", err
			}

			generatedHtmls[file.Slug] = true
		}

		fileList = append(fileList, view.FileMetadata{
			Type:   file.DataType,
			Name:   file.Title,
			Format: file.Format,
			Slug:   file.Slug,
			Labels: file.Metadata.GetLabels(),
		})
	}

	result := generateIndex(indexAsset, packageEnt.Name, version.Version, mdLibHtml, readmeHtml, fileList, generatedHtmls)
	err = addFileToZip(zw, "index.html", []byte(result))

	if err != nil {
		return nil, "", err
	}

	result = generateLs(string(lsAssetFile), packageEnt.Name, version.Version)
	err = addFileToZip(zw, "ls.html", []byte(result))
	if err != nil {
		return nil, "", err
	}

	// add static resources
	err = addFileToZip(zw, "resources/corporatelogo.png", logoAssetFile)

	if err != nil {
		return nil, "", err
	}
	err = addFileToZip(zw, "resources/styles.css", stylesAssetFile)
	if err != nil {
		return nil, "", err
	}

	mdBytes, err := generateMetadata(repoUrl, version, fileList)
	if err != nil {
		return nil, "", err
	}
	err = addFileToZip(zw, "metadata.json", mdBytes)
	if err != nil {
		return nil, "", err
	}

	err = zw.Close()
	if err != nil {
		return nil, "", err
	}

	attachmentVersionName, err := p.getVersionNameForAttachmentName(packageId, versionName)
	if err != nil {
		return nil, "", err
	}
	filename := packageEnt.Name + "_" + attachmentVersionName + ".zip"

	return zipBuf.Bytes(), filename, nil
}

func (p portalServiceImpl) GenerateInteractivePageForTransformedDocuments(packageId, version string, transformedDocuments entity.TransformedContentDataEntity) ([]byte, error) {
	packageEnt, err := p.publishedRepository.GetPackage(packageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	if packageEnt.Kind == entity.KIND_GROUP {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GroupDocGenerationUnsupported,
			Message: exception.GroupDocGenerationUnsupportedMsg,
		}
	}
	zipReader, err := zip.NewReader(bytes.NewReader(transformedDocuments.Data), int64(len(transformedDocuments.Data)))
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidPackageArchive,
			Message: exception.InvalidPackageArchiveMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}
	scriptAssetFile, err := ioutil.ReadFile(p.basePath + scriptAssetPath)
	if err != nil {
		return nil, err
	}
	scriptAsset := string(scriptAssetFile)

	indexAssetFile, err := ioutil.ReadFile(p.basePath + indexAssetPath)
	if err != nil {
		return nil, err
	}
	indexAsset := string(indexAssetFile)

	pageAssetFile, err := ioutil.ReadFile(p.basePath + pageAssetPath)
	if err != nil {
		return nil, err
	}
	pageAsset := string(pageAssetFile)

	lsAssetFile, err := ioutil.ReadFile(p.basePath + lsAssetPath)
	if err != nil {
		return nil, err
	}

	logoAssetFile, err := ioutil.ReadFile(p.basePath + logoAssetPath)
	if err != nil {
		return nil, err
	}

	stylesAssetFile, err := ioutil.ReadFile(p.basePath + stylesAssetPath)
	if err != nil {
		return nil, err
	}

	mdLibFile, err := ioutil.ReadFile(p.basePath + mdLibPath)
	if err != nil {
		return nil, err
	}

	zipBuf := bytes.Buffer{}

	zw := zip.NewWriter(&zipBuf)

	var readmeHtml string
	var mdLibHtml string
	var fileList []view.FileMetadata
	generatedHtmls := map[string]bool{}
	for _, file := range zipReader.File {
		zipFile, err := readZipFile(file)
		if err != nil {
			return nil, err
		}
		documentInfo := getDocumentByName(file.Name, transformedDocuments.DocumentsInfo)
		if documentInfo == nil {
			return nil, nil // todo return error
		}
		if !isProcessableFileName(file.Name) {
			// include file to result plain list as is
			err = addFileToZip(zw, generateFlatName(file.Name, documentInfo.Slug), zipFile) //TODO: need to use title here?
			if err != nil {
				return nil, err
			}
			if strings.HasSuffix(strings.ToLower(documentInfo.FileId), "readme.md") { // include readme as special chapter
				readmeHtml = fmt.Sprintf("    <div id=\"readmeMdDiv\" class=\"card content\">\n        <div class=\"card content\"></div>\n    </div>\n    <br>\n    <script>\n        var md = window.markdownit();\n        let temp=md.render(`%s`);\n        const readmeMdDiv = document.getElementById('readmeMdDiv');\n        readmeMdDiv.innerHTML=temp;\n    </script>",
					html.EscapeString(string(zipFile)))
				mdLibHtml = fmt.Sprintf("<script>%s</script>", string(mdLibFile))
			}
		} else {
			spec := string(zipFile)
			spec = html.EscapeString(spec)

			result := generatePage(pageAsset, packageEnt.Name, version, documentInfo.Title, scriptAsset, spec)

			err = addFileToZip(zw, documentInfo.Slug+".html", []byte(result)) //TODO: need to use title here?
			if err != nil {
				return nil, err
			}

			generatedHtmls[documentInfo.Slug] = true
		}
		fileList = append(fileList, view.FileMetadata{
			//Type:   documentInfo.DataType, //todo
			Name:   documentInfo.Title,
			Format: documentInfo.Format,
			Slug:   documentInfo.Slug,
			//Labels: documentInfo.Metadata.GetLabels(), //todo
		})
	}

	result := generateIndex(indexAsset, packageEnt.Name, version, mdLibHtml, readmeHtml, fileList, generatedHtmls)
	err = addFileToZip(zw, "index.html", []byte(result))

	if err != nil {
		return nil, err
	}

	result = generateLs(string(lsAssetFile), packageEnt.Name, version)
	err = addFileToZip(zw, "ls.html", []byte(result))
	if err != nil {
		return nil, err
	}

	// add static resources
	err = addFileToZip(zw, "resources/corporatelogo.png", logoAssetFile)

	if err != nil {
		return nil, err
	}
	err = addFileToZip(zw, "resources/styles.css", stylesAssetFile)
	if err != nil {
		return nil, err
	}

	err = zw.Close()
	if err != nil {
		return nil, err
	}

	return zipBuf.Bytes(), nil
}

func getDocumentByName(name string, documents []view.PackageDocument) *view.PackageDocument {
	for _, document := range documents {
		if document.Filename == name {
			return &document
		}
	}
	return nil
}

func isProcessable(file *view.PublishedContent) bool {
	return isProcessableFileName(file.Name)
}
func isProcessableFileName(fileName string) bool {
	if !(strings.HasSuffix(fileName, ".json") || strings.HasSuffix(fileName, ".yaml") || strings.HasSuffix(fileName, ".yml")) {
		return false
	}
	// TODO: check content type or not?
	return true
}

func generateFlatName(name string, slug string) string {
	parts := strings.Split(name, ".")
	if len(parts) > 0 {
		ext := parts[len(parts)-1]
		return strings.TrimSuffix(slug, "-"+ext) + "." + ext
	} else {
		return slug
	}
}

func generateSinglePage(template string, projectName string, version string, fileTitle string, script string, spec string) string {
	return fmt.Sprintf(template, fileTitle, script, projectName, version, spec, makeProjectTitle(projectName, version))
}

func generatePage(template string, projectName string, version string, fileTitle string, script string, spec string) string {
	return fmt.Sprintf(template, fileTitle, script, projectName, version, fileTitle, spec, makeProjectTitle(projectName, version))
}

func generateIndex(template string, projectName string, version string, mdJs string, readmeHtml string, fileList []view.FileMetadata, generatedHtmls map[string]bool) string {
	htmlList := ""
	for _, file := range fileList {
		exists, _ := generatedHtmls[file.Slug]
		if exists {
			htmlList += fmt.Sprintf("  <li><a href=\"%s\">%s</a></li>\n", file.Slug+".html", file.Name)
		}
	}

	return fmt.Sprintf(template, projectName, mdJs, projectName, version, readmeHtml, htmlList, makeProjectTitle(projectName, version))
}

func generateLs(template string, projectName string, version string) string {
	return fmt.Sprintf(template, projectName, version, makeProjectTitle(projectName, version))
}

func generateMetadata(repositoryUrl string, version *entity.PublishedVersionEntity, fileList []view.FileMetadata) ([]byte, error) {
	metadataObj := view.VersionDocMetadata{
		GitLink:           repositoryUrl,
		Branch:            version.Metadata.GetBranchName(),
		DateOfPublication: version.PublishedAt.Format(time.RFC3339),
		CommitId:          version.Metadata.GetCommitId(),
		Version:           version.Version,
		Revision:          version.Revision,
		User:              "", // TODO add user to version
		Labels:            version.Metadata.GetLabels(),
		Files:             fileList,
	}

	mdBytes, err := json.MarshalIndent(metadataObj, "", "    ")
	if err != nil {
		return nil, err
	}
	return mdBytes, err
}

func addFileToZip(zw *zip.Writer, name string, content []byte) error {
	mdFw, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = mdFw.Write(content)
	if err != nil {
		return err
	}
	return nil
}

func makeProjectTitle(projectName string, version string) string {
	return projectName + " " + version
}

func (p portalServiceImpl) getVersionNameForAttachmentName(packageId, version string) (string, error) {
	latestRevision, err := p.publishedRepository.GetLatestRevision(packageId, version)
	if err != nil {
		return "", err
	}
	versionName, versionRevision, err := SplitVersionRevision(version)
	if err != nil {
		return "", err
	}
	if latestRevision == versionRevision {
		return versionName, nil
	}
	return version, nil
}
