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
	"bytes"
	"context"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	log "github.com/sirupsen/logrus"
)

type MinioStorageService interface {
	UploadFilesToBucket() error
	GetFile(ctx context.Context, tableName, entityId string) ([]byte, error)
	UploadFile(ctx context.Context, tableName, entityId string, content []byte) error
	RemoveFile(ctx context.Context, tableName, entityId string) error
	RemoveFiles(ctx context.Context, tableName string, entityIds []string) error
	DownloadFilesFromBucketToDatabase() error
}

func NewMinioStorageService(buildRepository repository.BuildResultRepository, publishRepo repository.PublishedRepository, creds *view.MinioStorageCreds) MinioStorageService {
	return &minioStorageServiceImpl{
		buildRepository: buildRepository,
		minioClient:     createMinioClient(creds),
		publishRepo:     publishRepo,
		creds:           creds,
	}
}

type minioStorageServiceImpl struct {
	buildRepository repository.BuildResultRepository
	minioClient     *minioClient
	publishRepo     repository.PublishedRepository
	creds           *view.MinioStorageCreds
}

type minioClient struct {
	client *minio.Client
	error  error
}

// todo add more logs for ex - [15 / 100] entities were stored to database....
func (m minioStorageServiceImpl) DownloadFilesFromBucketToDatabase() error {
	ctx := context.Background()
	buildResultFileKeys := make([]string, 0)
	publishedSourceArchiveFileKeys := make([]string, 0)
	foldersChan := m.minioClient.client.ListObjects(ctx, m.creds.BucketName, minio.ListObjectsOptions{})
	for folder := range foldersChan {
		objectsChan := m.minioClient.client.ListObjects(ctx, m.creds.BucketName, minio.ListObjectsOptions{Prefix: folder.Key})
		switch folder.Key {
		case fmt.Sprintf("%s/", view.BUILD_RESULT_TABLE):
			for buildResult := range objectsChan {
				buildResultFileKeys = append(buildResultFileKeys, buildResult.Key)
			}
		case fmt.Sprintf("%s/", view.PUBLISHED_SOURCES_ARCHIVES_TABLE):
			for publishedSourceArchive := range objectsChan {
				publishedSourceArchiveFileKeys = append(publishedSourceArchiveFileKeys, publishedSourceArchive.Key)
			}
		}
	}

	log.Infof("MINIO. %d files were found", len(buildResultFileKeys)+len(publishedSourceArchiveFileKeys))

	if len(buildResultFileKeys) > 0 {
		utils.SafeAsync(func() {
			entitiesCount := 0
			for _, key := range buildResultFileKeys {
				buildId := getEntityId(fmt.Sprintf("%s/", view.BUILD_RESULT_TABLE), key)
				if buildId == "" {
					log.Errorf("unsupported file key format. folder - '%s', file - '%s'", fmt.Sprintf("%s/", view.BUILD_RESULT_TABLE), key)
					continue
				}
				data, err := m.getFile(ctx, key)
				if err != nil {
					log.Errorf("failed to get file from minio by key -%s. Error - %s", key, err.Error())
					continue
				}
				err = m.buildRepository.StoreBuildResult(entity.BuildResultEntity{BuildId: buildId, Data: data})
				if err != nil {
					log.Infof("%d build_result entities were stored from minio to database", entitiesCount)
					log.Errorf("StoreBuildResults() produce error -%s", err.Error())
					return
				}
				entitiesCount++
			}
			log.Infof("%d build_result entities were stored from minio to database", entitiesCount)
		})
	}

	if len(publishedSourceArchiveFileKeys) > 0 {
		utils.SafeAsync(func() {
			entitiesCount := 0
			for _, key := range publishedSourceArchiveFileKeys {
				checksum := getEntityId(fmt.Sprintf("%s/", view.PUBLISHED_SOURCES_ARCHIVES_TABLE), key)
				if checksum == "" {
					log.Errorf("unsupported file key format. folder - '%s', file - '%s'", fmt.Sprintf("%s/", view.PUBLISHED_SOURCES_ARCHIVES_TABLE), key)
					continue
				}
				data, err := m.getFile(ctx, key)
				if err != nil {
					log.Errorf("failed to get file from minio by key -%s. Error - %s", key, err.Error())
					continue
				}
				err = m.publishRepo.SavePublishedSourcesArchive(&entity.PublishedSrcArchiveEntity{Checksum: checksum, Data: data})
				if err != nil {
					log.Infof("%d published_sources_archives entities were stored from minio to database", entitiesCount)
					log.Infof("SavePublishedSourcesArchives() produce error -%s", err.Error())
					return
				}
				entitiesCount++
			}
			log.Infof("%d published_sources_archives entities were stored from minio to database", entitiesCount)
		})
	}

	return nil
}

func (m minioStorageServiceImpl) UploadFilesToBucket() error {
	ctx := context.Background()
	err := m.createBucketIfNotExists(ctx)
	if err != nil {
		return err
	}

	log.Info("Uploading files to MINIO")
	utils.SafeAsync(func() {
		uploadedIds, err := m.uploadBuildResults(ctx)
		if err != nil {
			log.Errorf("uploadBuildResults produces an error - %s", err.Error())
		}
		log.Info("Build results were uploaded to MINIO")

		if len(uploadedIds) > 0 {
			err = m.buildRepository.DeleteBuildResults(uploadedIds)
			if err != nil {
				log.Errorf("DeleteBuildResults produces an error - %s", err.Error())
			}
			log.Info("Build results were deleted from database")
		}
	})
	if !m.creds.IsOnlyForBuildResult {
		utils.SafeAsync(func() {
			uploadedChecksums, err := m.uploadPublishedSourcesArchives(ctx)
			if err != nil {
				log.Errorf("uploadPublishedSourcesArchives produces an error - %s", err.Error())
			}
			log.Info("Published source archives were uploaded to MINIO")

			if len(uploadedChecksums) > 0 {
				err = m.publishRepo.DeletePublishedSourcesArchives(uploadedChecksums)
				if err != nil {
					log.Errorf("DeletePublishedSourcesArchives produces an error - %s", err.Error())
				}
				log.Info("Published source archives were deleted from database")
			}
		})
	}

	return nil
}

func (m minioStorageServiceImpl) createBucketIfNotExists(ctx context.Context) error {
	exists, err := bucketExists(ctx, m.minioClient.client, m.creds.BucketName)
	if err != nil {
		return err
	}
	if exists {
		log.Infof(fmt.Sprintf("Minio bucket - %s exists", m.creds.BucketName))
	} else {
		err = m.minioClient.client.MakeBucket(ctx, m.creds.BucketName, minio.MakeBucketOptions{})
		if err != nil {
			return err
		}
		exists, err = bucketExists(ctx, m.minioClient.client, m.creds.BucketName)
		if err != nil {
			return err
		}
		if exists {
			log.Infof(fmt.Sprintf("Minio bucket - %s was created", m.creds.BucketName))
		}
	}
	return nil
}

func createMinioClient(creds *view.MinioStorageCreds) *minioClient {
	client := new(minioClient)
	var err error
	tr, err := minio.DefaultTransport(true)
	if err != nil {
		log.Warnf("error creating the minio connection: error creating the default transport layer: %v", err)
		client.error = err
		return client
	}
	crt, err := os.CreateTemp("", "minio.cert")
	if err != nil {
		log.Warn(err.Error())
		client.error = err
		return client
	}
	decodeSamlCert, err := base64.StdEncoding.DecodeString(creds.Crt)
	if err != nil {
		log.Warn(err.Error())
		client.error = err
		return client
	}

	_, err = crt.WriteString(string(decodeSamlCert))
	rootCAs := mustGetSystemCertPool()
	data, err := os.ReadFile(crt.Name())
	if err == nil {
		rootCAs.AppendCertsFromPEM(data)
	}
	tr.TLSClientConfig.RootCAs = rootCAs

	minioClient, err := minio.New(creds.Endpoint, &minio.Options{
		Creds:     credentials.NewStaticV4(creds.AccessKeyId, creds.SecretAccessKey, ""),
		Secure:    true,
		Transport: tr,
	})
	if err != nil {
		if strings.Contains(err.Error(), "endpoint") {
			err = errors.New("invalid storage URL")
		}
		log.Warn(err.Error())
		client.error = err
		return client
	}
	log.Infof("MINIO instance initialized")
	client.client = minioClient
	return client
}

func (m minioStorageServiceImpl) uploadBuildResults(ctx context.Context) ([]string, error) {
	offset := 0
	ids := make([]string, 0)
	var buildResult *entity.BuildResultEntity
	var err error
	for {
		buildResult, err = m.buildRepository.GetBuildResultWithOffset(offset)
		if err != nil {
			log.Infof("%d build_results were ulpoaded to minio storage, until got error", offset)
			break
		}
		if buildResult == nil {
			log.Infof("%d build_results were ulpoaded to minio storage, until buildResult is null", offset)
			break
		}
		err = m.putObject(ctx, buildFileName(view.BUILD_RESULT_TABLE, buildResult.BuildId), buildResult.Data)
		if err != nil {
			log.Infof("%d build_results were ulpoaded to minio storage, until got error", offset)
			break
		}
		ids = append(ids, buildResult.BuildId)
		offset++
	}
	return ids, err
}

// file name table_name + checksum
func (m minioStorageServiceImpl) uploadPublishedSourcesArchives(ctx context.Context) ([]string, error) {
	offset := 0
	checksums := make([]string, 0)
	for {
		publishedSourceArchive, err := m.publishRepo.GetPublishedSourcesArchives(offset)
		if err != nil {
			log.Infof("%d published_sources_archives were uploaded to minio storage, before error was received", offset)
			break
		}
		if publishedSourceArchive == nil {
			log.Infof("%d published_sources_archives were uploaded to minio storage, before publishedSourceArchive became null", offset)
			break
		}
		err = m.putObject(ctx, buildFileName(view.PUBLISHED_SOURCES_ARCHIVES_TABLE, publishedSourceArchive.Checksum), publishedSourceArchive.Data)
		if err != nil {
			log.Infof("%d published_sources_archives were uploaded to minio storage, before error was received", offset)
			break
		}
		checksums = append(checksums, publishedSourceArchive.Checksum)
		offset++
	}
	return checksums, nil
}

func (m minioStorageServiceImpl) UploadFile(ctx context.Context, tableName, entityId string, content []byte) error {
	start := time.Now()
	err := m.putObject(ctx, buildFileName(tableName, entityId), content)
	utils.PerfLog(time.Since(start).Milliseconds(), 500, "UploadFile: upload file to Minio")
	if err != nil {
		return err
	}
	return nil
}

func (m minioStorageServiceImpl) putObject(ctx context.Context, fileName string, content []byte) error {
	_, err := m.minioClient.client.PutObject(ctx, m.creds.BucketName, fileName, bytes.NewReader(content), int64(len(content)), minio.PutObjectOptions{})
	if err != nil {
		return err
	}
	return nil
}

func (m minioStorageServiceImpl) GetFile(ctx context.Context, tableName, entityId string) ([]byte, error) {
	return m.getFile(ctx, buildFileName(tableName, entityId))
}

// fullFileName - tableName/entity_id.zip
func (m minioStorageServiceImpl) getFile(ctx context.Context, fullFileName string) ([]byte, error) {
	minioObject, err := m.minioClient.client.GetObject(ctx, m.creds.BucketName, fullFileName, minio.GetObjectOptions{})
	if err != nil {
		log.Warn(err)
		return nil, err
	}
	minioObjectContent, err := io.ReadAll(minioObject)
	return minioObjectContent, err
}

func (m minioStorageServiceImpl) RemoveFile(ctx context.Context, tableName, entityId string) error {
	return m.removeFile(ctx, buildFileName(tableName, entityId))
}

func (m minioStorageServiceImpl) RemoveFiles(ctx context.Context, tableName string, entityIds []string) error {
	minioObjectsChan := make(chan minio.ObjectInfo, len(entityIds))
	utils.SafeAsync(func() {
		for _, id := range entityIds {
			minioObjectsChan <- minio.ObjectInfo{Key: buildFileName(tableName, id)}
		}
		defer close(minioObjectsChan)
	})
	errMsg := make([]string, 0)
	errChan := m.minioClient.client.RemoveObjects(ctx, m.creds.BucketName, minioObjectsChan, minio.RemoveObjectsOptions{})
	for removeError := range errChan {
		errMsg = append(errMsg, removeError.Err.Error())
	}
	if len(errMsg) > 0 {
		return errors.New(strings.Join(errMsg, ". "))
	}
	return nil
}

func (m minioStorageServiceImpl) removeFile(ctx context.Context, fileName string) error {
	err := m.minioClient.client.RemoveObject(ctx, m.creds.BucketName, fileName, minio.RemoveObjectOptions{})
	if err != nil {
		return err
	}
	return nil
}

func bucketExists(ctx context.Context, minioClient *minio.Client, bucketName string) (bool, error) {
	exists, err := minioClient.BucketExists(ctx, bucketName)
	if err != nil {
		return false, err
	}
	return exists, nil
}
func mustGetSystemCertPool() *x509.CertPool {
	pool, err := x509.SystemCertPool()
	if err != nil {
		return x509.NewCertPool()
	}
	return pool
}

func buildFileName(tableName, entityId string) string {
	return fmt.Sprintf("%s/%s.zip", tableName, entityId)
}

func getEntityId(folderName string, fileName string) string {
	if strings.Contains(fileName, folderName) && strings.Contains(fileName, ".zip") {
		entityIdDotZip := strings.ReplaceAll(fileName, folderName, "")
		return strings.ReplaceAll(entityIdDotZip, ".zip", "")
	}
	return ""
}
