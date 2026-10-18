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
	"bufio"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
)

const (
	defaultVersionsPath = "third-party-tools.env"
	defaultOutputRoot   = "resources"
	spectralVersionKey  = "SPECTRAL_VERSION"
	vacuumVersionKey    = "VACUUM_VERSION"
)

var versionPattern = regexp.MustCompile(`^\d+\.\d+\.\d+$`)

type toolVersions struct {
	spectral string
	vacuum   string
}

type releaseSources struct {
	spectral string
	vacuum   string
}

type toolAsset struct {
	url         string
	checksumURL string
	archiveName string
	outputPath  string
}

var defaultReleaseSources = releaseSources{
	spectral: "https://github.com/stoplightio/spectral/releases/download",
	vacuum:   "https://github.com/daveshanley/vacuum/releases/download",
}

func main() {
	targetOS := flag.String("os", runtime.GOOS, "target operating system")
	targetArch := flag.String("arch", runtime.GOARCH, "target architecture")
	versionsPath := flag.String("versions", defaultVersionsPath, "path to the tool versions file")
	outputRoot := flag.String("output", defaultOutputRoot, "directory for downloaded tools")
	flag.Parse()

	if err := run(context.Background(), newHTTPClient(), defaultReleaseSources, *versionsPath, *outputRoot, *targetOS, *targetArch); err != nil {
		fmt.Fprintf(os.Stderr, "Cannot download linter tools: %v\n", err)
		os.Exit(1)
	}
}

func newHTTPClient() *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = proxyForRequest
	return &http.Client{Transport: transport}
}

func proxyForRequest(request *http.Request) (*url.URL, error) {
	proxyURL, err := http.ProxyFromEnvironment(request)
	if err != nil || proxyURL == nil {
		return proxyURL, err
	}
	return normaliseProxyURL(proxyURL)
}

func normaliseProxyURL(proxyURL *url.URL) (*url.URL, error) {
	proxyScheme := strings.TrimSuffix(proxyURL.Host, ":")
	if (proxyScheme == "http" || proxyScheme == "https") && strings.HasPrefix(proxyURL.Path, "//") {
		correctedURL, err := url.Parse(proxyScheme + ":" + proxyURL.Path)
		if err != nil {
			return nil, fmt.Errorf("correct duplicated proxy scheme in %q: %w", proxyURL.String(), err)
		}
		if correctedURL.Hostname() == "127.0.0.1" || correctedURL.Hostname() == "localhost" || correctedURL.Hostname() == "::1" {
			return nil, nil
		}
		return correctedURL, nil
	}
	return proxyURL, nil
}

func run(ctx context.Context, client *http.Client, sources releaseSources, versionsPath, outputRoot, targetOS, targetArch string) error {
	versions, err := readVersions(versionsPath)
	if err != nil {
		return err
	}
	spectral, vacuum, err := resolveAssets(sources, versions, outputRoot, targetOS, targetArch)
	if err != nil {
		return err
	}
	if err := installExecutable(ctx, client, spectral, targetOS); err != nil {
		return fmt.Errorf("download Spectral %s: %w", versions.spectral, err)
	}
	if err := installVacuum(ctx, client, vacuum, targetOS); err != nil {
		return fmt.Errorf("download Vacuum %s: %w", versions.vacuum, err)
	}
	return nil
}

func readVersions(path string) (toolVersions, error) {
	file, err := os.Open(path)
	if err != nil {
		return toolVersions{}, fmt.Errorf("open versions file %q: %w", path, err)
	}
	defer file.Close()

	values := make(map[string]string)
	scanner := bufio.NewScanner(file)
	for lineNumber := 1; scanner.Scan(); lineNumber++ {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, found := strings.Cut(line, "=")
		if !found || strings.TrimSpace(key) == "" || strings.TrimSpace(value) == "" {
			return toolVersions{}, fmt.Errorf("invalid entry at %s:%d", path, lineNumber)
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key != spectralVersionKey && key != vacuumVersionKey {
			return toolVersions{}, fmt.Errorf("unknown key %q at %s:%d", key, path, lineNumber)
		}
		if _, exists := values[key]; exists {
			return toolVersions{}, fmt.Errorf("duplicate key %q at %s:%d", key, path, lineNumber)
		}
		if !versionPattern.MatchString(value) {
			return toolVersions{}, fmt.Errorf("invalid version %q for %s", value, key)
		}
		values[key] = value
	}
	if err := scanner.Err(); err != nil {
		return toolVersions{}, fmt.Errorf("read versions file %q: %w", path, err)
	}
	if values[spectralVersionKey] == "" || values[vacuumVersionKey] == "" {
		return toolVersions{}, fmt.Errorf("versions file %q must define %s and %s", path, spectralVersionKey, vacuumVersionKey)
	}
	return toolVersions{
		spectral: values[spectralVersionKey],
		vacuum:   values[vacuumVersionKey],
	}, nil
}

func resolveAssets(sources releaseSources, versions toolVersions, outputRoot, targetOS, targetArch string) (toolAsset, toolAsset, error) {
	var spectralName string
	switch targetOS + "/" + targetArch {
	case "linux/amd64":
		spectralName = "spectral-alpine-x64"
	case "linux/arm64":
		spectralName = "spectral-alpine-arm64"
	case "windows/amd64":
		spectralName = "spectral.exe"
	default:
		return toolAsset{}, toolAsset{}, fmt.Errorf("unsupported target platform %s/%s; supported platforms are linux/amd64, linux/arm64, and windows/amd64", targetOS, targetArch)
	}

	vacuumArch := map[string]string{
		"amd64": "x86_64",
		"arm64": "arm64",
	}[targetArch]
	executableName := "vacuum"
	spectralOutputName := "spectral"
	if targetOS == "windows" {
		executableName += ".exe"
		spectralOutputName += ".exe"
	}
	vacuumArchive := fmt.Sprintf("vacuum_%s_%s_%s.tar.gz", versions.vacuum, targetOS, vacuumArch)

	return toolAsset{
			url:        fmt.Sprintf("%s/v%s/%s", strings.TrimRight(sources.spectral, "/"), versions.spectral, spectralName),
			outputPath: filepath.Join(outputRoot, "spectral", targetOS, spectralOutputName),
		}, toolAsset{
			url:         fmt.Sprintf("%s/v%s/%s", strings.TrimRight(sources.vacuum, "/"), versions.vacuum, vacuumArchive),
			checksumURL: fmt.Sprintf("%s/v%s/checksums.txt", strings.TrimRight(sources.vacuum, "/"), versions.vacuum),
			archiveName: vacuumArchive,
			outputPath:  filepath.Join(outputRoot, "vacuum", targetOS, executableName),
		}, nil
}

func installExecutable(ctx context.Context, client *http.Client, asset toolAsset, targetOS string) error {
	tempPath, err := downloadToTemp(ctx, client, asset.url, filepath.Dir(asset.outputPath))
	if err != nil {
		return err
	}
	defer os.Remove(tempPath)

	if err := validateExecutable(tempPath, targetOS); err != nil {
		return err
	}
	return replaceExecutable(tempPath, asset.outputPath)
}

func installVacuum(ctx context.Context, client *http.Client, asset toolAsset, targetOS string) error {
	archivePath, err := downloadToTemp(ctx, client, asset.url, filepath.Dir(asset.outputPath))
	if err != nil {
		return err
	}
	defer os.Remove(archivePath)

	checksums, err := downloadBytes(ctx, client, asset.checksumURL)
	if err != nil {
		return fmt.Errorf("download checksums: %w", err)
	}
	if err := verifyChecksum(archivePath, asset.archiveName, checksums); err != nil {
		return err
	}

	tempExecutable, err := extractExecutable(archivePath, filepath.Dir(asset.outputPath), filepath.Base(asset.outputPath))
	if err != nil {
		return err
	}
	defer os.Remove(tempExecutable)
	if err := validateExecutable(tempExecutable, targetOS); err != nil {
		return err
	}
	return replaceExecutable(tempExecutable, asset.outputPath)
}

func downloadToTemp(ctx context.Context, client *http.Client, url, destinationDirectory string) (string, error) {
	if err := os.MkdirAll(destinationDirectory, 0755); err != nil {
		return "", fmt.Errorf("create output directory %q: %w", destinationDirectory, err)
	}
	tempFile, err := os.CreateTemp(destinationDirectory, ".download-*")
	if err != nil {
		return "", fmt.Errorf("create temporary file: %w", err)
	}
	tempPath := tempFile.Name()
	defer func() {
		if tempFile != nil {
			tempFile.Close()
		}
	}()

	response, err := get(ctx, client, url)
	if err != nil {
		os.Remove(tempPath)
		return "", err
	}
	defer response.Body.Close()
	if _, err := io.Copy(tempFile, response.Body); err != nil {
		os.Remove(tempPath)
		return "", fmt.Errorf("write download from %q: %w", url, err)
	}
	if err := tempFile.Close(); err != nil {
		os.Remove(tempPath)
		return "", fmt.Errorf("close download from %q: %w", url, err)
	}
	tempFile = nil
	return tempPath, nil
}

func downloadBytes(ctx context.Context, client *http.Client, url string) ([]byte, error) {
	response, err := get(ctx, client, url)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	data, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("read download from %q: %w", url, err)
	}
	return data, nil
}

func get(ctx context.Context, client *http.Client, url string) (*http.Response, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request for %q: %w", url, err)
	}
	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("request %q: %w", url, err)
	}
	if response.StatusCode != http.StatusOK {
		response.Body.Close()
		return nil, fmt.Errorf("request %q returned %s", url, response.Status)
	}
	return response, nil
}

func verifyChecksum(path, archiveName string, checksums []byte) error {
	expected := ""
	scanner := bufio.NewScanner(strings.NewReader(string(checksums)))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) >= 2 && strings.TrimPrefix(fields[len(fields)-1], "*") == archiveName {
			expected = fields[0]
			break
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read checksums: %w", err)
	}
	if expected == "" {
		return fmt.Errorf("checksum for %q is missing", archiveName)
	}

	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open downloaded archive: %w", err)
	}
	defer file.Close()
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return fmt.Errorf("hash downloaded archive: %w", err)
	}
	actual := hex.EncodeToString(hash.Sum(nil))
	if !strings.EqualFold(actual, expected) {
		return fmt.Errorf("checksum mismatch for %q: expected %s, got %s", archiveName, expected, actual)
	}
	return nil
}

func extractExecutable(archivePath, destinationDirectory, executableName string) (string, error) {
	archive, err := os.Open(archivePath)
	if err != nil {
		return "", fmt.Errorf("open Vacuum archive: %w", err)
	}
	defer archive.Close()
	compressed, err := gzip.NewReader(archive)
	if err != nil {
		return "", fmt.Errorf("open Vacuum gzip stream: %w", err)
	}
	defer compressed.Close()

	reader := tar.NewReader(compressed)
	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return "", fmt.Errorf("read Vacuum archive: %w", err)
		}
		if header.Typeflag != tar.TypeReg || filepath.Base(header.Name) != executableName {
			continue
		}
		tempFile, err := os.CreateTemp(destinationDirectory, ".vacuum-*")
		if err != nil {
			return "", fmt.Errorf("create temporary Vacuum executable: %w", err)
		}
		tempPath := tempFile.Name()
		if _, err := io.Copy(tempFile, reader); err != nil {
			tempFile.Close()
			os.Remove(tempPath)
			return "", fmt.Errorf("extract Vacuum executable: %w", err)
		}
		if err := tempFile.Close(); err != nil {
			os.Remove(tempPath)
			return "", fmt.Errorf("close Vacuum executable: %w", err)
		}
		return tempPath, nil
	}
	return "", fmt.Errorf("Vacuum archive does not contain %q", executableName)
}

func validateExecutable(path, targetOS string) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open executable: %w", err)
	}
	defer file.Close()
	magic := make([]byte, 4)
	if _, err := io.ReadFull(file, magic); err != nil {
		return fmt.Errorf("read executable header: %w", err)
	}
	if targetOS == "windows" {
		if string(magic[:2]) != "MZ" {
			return fmt.Errorf("downloaded file is not a Windows executable")
		}
		return nil
	}
	if string(magic) != "\x7fELF" {
		return fmt.Errorf("downloaded file is not an ELF executable")
	}
	return nil
}

func replaceExecutable(source, destination string) error {
	if err := os.Chmod(source, 0755); err != nil {
		return fmt.Errorf("make executable: %w", err)
	}
	if err := os.Remove(destination); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("replace %q: %w", destination, err)
	}
	if err := os.Rename(source, destination); err != nil {
		return fmt.Errorf("move executable to %q: %w", destination, err)
	}
	return nil
}
