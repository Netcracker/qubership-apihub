/*
 * Copyright 2024-2026 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReadVersions(t *testing.T) {
	path := filepath.Join(t.TempDir(), "versions.env")
	content := "# pinned tools\nSPECTRAL_VERSION=6.15.0\nVACUUM_VERSION=0.11.1\n"
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	versions, err := readVersions(path)
	if err != nil {
		t.Fatalf("readVersions() error = %v", err)
	}
	if versions.spectral != "6.15.0" || versions.vacuum != "0.11.1" {
		t.Fatalf("readVersions() = %+v", versions)
	}
}

func TestReadVersionsRejectsUnknownKey(t *testing.T) {
	path := filepath.Join(t.TempDir(), "versions.env")
	content := "SPECTRAL_VERSION=6.15.0\nVACUUM_VERSION=0.11.1\nOTHER_VERSION=1.0.0\n"
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := readVersions(path)
	if err == nil || !strings.Contains(err.Error(), "unknown key") {
		t.Fatalf("readVersions() error = %v, want unknown key error", err)
	}
}

func TestResolveAssets(t *testing.T) {
	sources := releaseSources{
		spectral: "https://spectral.example/releases",
		vacuum:   "https://vacuum.example/releases",
	}
	versions := toolVersions{spectral: "6.15.0", vacuum: "0.11.1"}
	tests := []struct {
		name             string
		targetOS         string
		targetArch       string
		spectralAsset    string
		vacuumAsset      string
		spectralFileName string
	}{
		{
			name:             "Linux AMD64",
			targetOS:         "linux",
			targetArch:       "amd64",
			spectralAsset:    "spectral-alpine-x64",
			vacuumAsset:      "vacuum_0.11.1_linux_x86_64.tar.gz",
			spectralFileName: "spectral",
		},
		{
			name:             "Linux ARM64",
			targetOS:         "linux",
			targetArch:       "arm64",
			spectralAsset:    "spectral-alpine-arm64",
			vacuumAsset:      "vacuum_0.11.1_linux_arm64.tar.gz",
			spectralFileName: "spectral",
		},
		{
			name:             "Windows AMD64",
			targetOS:         "windows",
			targetArch:       "amd64",
			spectralAsset:    "spectral.exe",
			vacuumAsset:      "vacuum_0.11.1_windows_x86_64.tar.gz",
			spectralFileName: "spectral.exe",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			spectral, vacuum, err := resolveAssets(sources, versions, "resources", test.targetOS, test.targetArch)
			if err != nil {
				t.Fatalf("resolveAssets() error = %v", err)
			}
			if !strings.HasSuffix(spectral.url, "/v6.15.0/"+test.spectralAsset) {
				t.Errorf("Spectral URL = %q", spectral.url)
			}
			if !strings.HasSuffix(vacuum.url, "/v0.11.1/"+test.vacuumAsset) {
				t.Errorf("Vacuum URL = %q", vacuum.url)
			}
			if filepath.Base(spectral.outputPath) != test.spectralFileName {
				t.Errorf("Spectral output = %q", spectral.outputPath)
			}
		})
	}
}

func TestResolveAssetsRejectsUnsupportedPlatform(t *testing.T) {
	_, _, err := resolveAssets(defaultReleaseSources, toolVersions{spectral: "6.15.0", vacuum: "0.11.1"}, "resources", "windows", "arm64")
	if err == nil || !strings.Contains(err.Error(), "unsupported target platform") {
		t.Fatalf("resolveAssets() error = %v, want unsupported platform error", err)
	}
}

func TestProxyForRequestCorrectsDuplicatedScheme(t *testing.T) {
	proxyURL, err := url.Parse("http://http://proxy.example:8080")
	if err != nil {
		t.Fatal(err)
	}
	if proxyURL.Host != "http:" || proxyURL.Path != "//proxy.example:8080" {
		t.Fatalf("test proxy URL parsed unexpectedly: host=%q path=%q", proxyURL.Host, proxyURL.Path)
	}

	correctedURL, err := normaliseProxyURL(proxyURL)
	if err != nil {
		t.Fatalf("normaliseProxyURL() error = %v", err)
	}
	if correctedURL.String() != "http://proxy.example:8080" {
		t.Fatalf("normaliseProxyURL() = %q", correctedURL)
	}
}

func TestProxyForRequestIgnoresDuplicatedLoopbackProxy(t *testing.T) {
	proxyURL, err := url.Parse("http://http://127.0.0.1:12334")
	if err != nil {
		t.Fatal(err)
	}

	correctedURL, err := normaliseProxyURL(proxyURL)
	if err != nil {
		t.Fatalf("normaliseProxyURL() error = %v", err)
	}
	if correctedURL != nil {
		t.Fatalf("normaliseProxyURL() = %q", correctedURL)
	}
}

func TestRunDownloadsTools(t *testing.T) {
	spectralExecutable := append([]byte("\x7fELF"), []byte("spectral")...)
	vacuumExecutable := append([]byte("\x7fELF"), []byte("vacuum")...)
	vacuumArchive := makeTarGzip(t, "vacuum", vacuumExecutable)
	vacuumArchiveName := "vacuum_0.11.1_linux_x86_64.tar.gz"
	vacuumChecksum := fmt.Sprintf("%x  %s\n", sha256.Sum256(vacuumArchive), vacuumArchiveName)

	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/spectral/v6.15.0/spectral-alpine-x64":
			response.Write(spectralExecutable)
		case "/vacuum/v0.11.1/" + vacuumArchiveName:
			response.Write(vacuumArchive)
		case "/vacuum/v0.11.1/checksums.txt":
			response.Write([]byte(vacuumChecksum))
		default:
			http.NotFound(response, request)
		}
	}))
	defer server.Close()

	tempDirectory := t.TempDir()
	versionsPath := filepath.Join(tempDirectory, "versions.env")
	if err := os.WriteFile(versionsPath, []byte("SPECTRAL_VERSION=6.15.0\nVACUUM_VERSION=0.11.1\n"), 0644); err != nil {
		t.Fatal(err)
	}
	outputRoot := filepath.Join(tempDirectory, "resources")
	sources := releaseSources{
		spectral: server.URL + "/spectral",
		vacuum:   server.URL + "/vacuum",
	}

	if err := run(context.Background(), server.Client(), sources, versionsPath, outputRoot, "linux", "amd64"); err != nil {
		t.Fatalf("run() error = %v", err)
	}
	assertFileContent(t, filepath.Join(outputRoot, "spectral", "linux", "spectral"), spectralExecutable)
	assertFileContent(t, filepath.Join(outputRoot, "vacuum", "linux", "vacuum"), vacuumExecutable)
}

func TestVerifyChecksumRejectsMismatch(t *testing.T) {
	path := filepath.Join(t.TempDir(), "archive.tar.gz")
	if err := os.WriteFile(path, []byte("archive"), 0644); err != nil {
		t.Fatal(err)
	}

	err := verifyChecksum(path, "archive.tar.gz", []byte(strings.Repeat("0", sha256.Size*2)+"  archive.tar.gz\n"))
	if err == nil || !strings.Contains(err.Error(), "checksum mismatch") {
		t.Fatalf("verifyChecksum() error = %v, want checksum mismatch", err)
	}
}

func makeTarGzip(t *testing.T, name string, content []byte) []byte {
	t.Helper()
	var buffer bytes.Buffer
	compressed := gzip.NewWriter(&buffer)
	archive := tar.NewWriter(compressed)
	if err := archive.WriteHeader(&tar.Header{
		Name: name,
		Mode: 0755,
		Size: int64(len(content)),
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := archive.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := archive.Close(); err != nil {
		t.Fatal(err)
	}
	if err := compressed.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func assertFileContent(t *testing.T, path string, expected []byte) {
	t.Helper()
	actual, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(actual, expected) {
		t.Fatalf("file %q content = %q, want %q", path, actual, expected)
	}
}
