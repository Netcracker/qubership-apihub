package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/config"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	log "github.com/sirupsen/logrus"
)

const removeObjectsBatchSize = 1000

type MinioStorageService interface {
	UploadFilesToBucket()
	GetFile(ctx context.Context, tableName, entityId string) ([]byte, error)
	UploadFile(ctx context.Context, tableName, entityId string, content []byte) error
	RemoveFiles(ctx context.Context, tableName string, entityIds []string) error
	DownloadFilesFromBucketToDatabase(ctx context.Context)
	RemoveObjectsOlderThan(ctx context.Context, tableName string, before time.Time) (int, error)
}

func NewMinioStorageService(buildRepository repository.BuildResultRepository, publishRepo repository.PublishedRepository, creds *view.MinioStorageCreds, timeouts config.S3MigrationTimeoutsConfig) MinioStorageService {
	return &minioStorageServiceImpl{
		buildRepository:          buildRepository,
		minioClient:              createMinioClient(creds),
		publishRepo:              publishRepo,
		creds:                    creds,
		s3OperationTimeout:       time.Duration(timeouts.S3OperationSec) * time.Second,
		databaseOperationTimeout: time.Duration(timeouts.DatabaseOperationSec) * time.Second,
		bulkDeleteTimeout:        time.Duration(timeouts.BulkDeleteMinutes) * time.Minute,
	}
}

type minioStorageServiceImpl struct {
	buildRepository          repository.BuildResultRepository
	minioClient              *minioClient
	publishRepo              repository.PublishedRepository
	creds                    *view.MinioStorageCreds
	s3OperationTimeout       time.Duration
	databaseOperationTimeout time.Duration
	bulkDeleteTimeout        time.Duration
}

type minioClient struct {
	client *minio.Client
	error  error
}

// todo add more logs for ex - [15 / 100] entities were stored to database....
func (m minioStorageServiceImpl) DownloadFilesFromBucketToDatabase(ctx context.Context) {
	bgCtx := secctx.Detach(ctx)
	utils.SafeAsync(func() {
		if err := m.migrateBucketToDatabase(bgCtx); err != nil {
			log.Errorf("MINIO. Migration from bucket to database failed: %s", err.Error())
		}
	})
}

func (m minioStorageServiceImpl) migrateBucketToDatabase(ctx context.Context) error {
	buildResultFileKeys := make([]string, 0)
	publishedSourceArchiveFileKeys := make([]string, 0)
	buildResultFolder := fmt.Sprintf("%s/", view.BUILD_RESULT_TABLE)
	publishedSourcesFolder := fmt.Sprintf("%s/", view.PUBLISHED_SOURCES_ARCHIVES_TABLE)

	folderKeys, err := m.listObjectKeys(ctx, "")
	if err != nil {
		return fmt.Errorf("failed to list minio folders: %w", err)
	}
	for _, folderKey := range folderKeys {
		switch folderKey {
		case buildResultFolder:
			buildResultFileKeys, err = m.listObjectKeys(ctx, folderKey)
			if err != nil {
				return fmt.Errorf("failed to list '%s' files: %w", folderKey, err)
			}
		case publishedSourcesFolder:
			publishedSourceArchiveFileKeys, err = m.listObjectKeys(ctx, folderKey)
			if err != nil {
				return fmt.Errorf("failed to list '%s' files: %w", folderKey, err)
			}
		}
	}

	log.Infof("MINIO. %d files were found", len(buildResultFileKeys)+len(publishedSourceArchiveFileKeys))

	if len(buildResultFileKeys) > 0 {
		utils.SafeAsync(func() {
			total := len(buildResultFileKeys)
			entitiesCount := 0
			for _, key := range buildResultFileKeys {
				buildId := getEntityId(buildResultFolder, key)
				if buildId == "" {
					log.Errorf("MINIO. Skipping '%s': unsupported file key format for folder '%s'", key, buildResultFolder)
					continue
				}
				data, err := m.downloadObject(ctx, key)
				if err != nil {
					log.Errorf("MINIO. Skipping '%s': failed to get file from minio: %s", key, err.Error())
					continue
				}
				if err := m.storeBuildResult(ctx, entity.BuildResultEntity{BuildId: buildId, Data: data}); err != nil {
					log.Errorf("MINIO. build_result migration stopped after %d of %d files, StoreBuildResult failed for '%s': %s", entitiesCount, total, key, err.Error())
					return
				}
				entitiesCount++
			}
			log.Infof("MINIO. %d of %d build_result entities were stored from minio to database", entitiesCount, total)
		})
	}

	if len(publishedSourceArchiveFileKeys) > 0 {
		utils.SafeAsync(func() {
			total := len(publishedSourceArchiveFileKeys)
			entitiesCount := 0
			for _, key := range publishedSourceArchiveFileKeys {
				checksum := getEntityId(publishedSourcesFolder, key)
				if checksum == "" {
					log.Errorf("MINIO. Skipping '%s': unsupported file key format for folder '%s'", key, publishedSourcesFolder)
					continue
				}
				data, err := m.downloadObject(ctx, key)
				if err != nil {
					log.Errorf("MINIO. Skipping '%s': failed to get file from minio: %s", key, err.Error())
					continue
				}
				if err := m.savePublishedSourcesArchive(ctx, &entity.PublishedSrcArchiveEntity{Checksum: checksum, Data: data}); err != nil {
					log.Errorf("MINIO. published_sources_archives migration stopped after %d of %d files, SavePublishedSourcesArchive failed for '%s': %s", entitiesCount, total, key, err.Error())
					return
				}
				entitiesCount++
			}
			log.Infof("MINIO. %d of %d published_sources_archives entities were stored from minio to database", entitiesCount, total)
		})
	}

	return nil
}

// listObjectKeys collects the keys under prefix. Listing takes as long as the bucket is large, so
// s3OperationTimeout bounds the wait for the next object instead of the call as a whole
func (m minioStorageServiceImpl) listObjectKeys(ctx context.Context, prefix string) ([]string, error) {
	listCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	objects := m.minioClient.client.ListObjects(listCtx, m.creds.BucketName, minio.ListObjectsOptions{Prefix: prefix})
	// minio-go requires the channel to be drained to closure, otherwise its producer goroutine leaks on the
	// final send. Cancelling alone is not enough.
	cancelAndDrain := func() {
		cancel()
		for range objects {
		}
	}

	nextObjectTimer := time.NewTimer(m.s3OperationTimeout)
	defer nextObjectTimer.Stop()

	keys := make([]string, 0)
	for {
		select {
		case object, ok := <-objects:
			if !ok {
				return keys, nil
			}
			if object.Err != nil {
				cancelAndDrain()
				return nil, object.Err
			}
			keys = append(keys, object.Key)
			nextObjectTimer.Reset(m.s3OperationTimeout)
		case <-nextObjectTimer.C:
			cancelAndDrain()
			return nil, fmt.Errorf("no object received for %v while listing prefix '%s'", m.s3OperationTimeout, prefix)
		}
	}
}

func (m minioStorageServiceImpl) UploadFilesToBucket() {
	ctx := context.Background()
	if err := m.createBucketIfNotExists(ctx); err != nil {
		log.Errorf("MINIO. Migration from database to bucket failed: %s", err.Error())
		return
	}

	log.Info("MINIO. Uploading files to bucket")
	utils.SafeAsync(func() {
		uploadedIds, err := m.uploadBuildResults(ctx)
		if err != nil {
			log.Errorf("MINIO. Failed to upload build results: %s", err.Error())
		} else {
			log.Infof("MINIO. %d build results were uploaded to MINIO", len(uploadedIds))
		}

		if len(uploadedIds) > 0 {
			if err := m.deleteBuildResults(ctx, uploadedIds); err != nil {
				log.Errorf("MINIO. Failed to delete %d uploaded build results from database: %s", len(uploadedIds), err.Error())
				return
			}
			log.Infof("MINIO. %d build results were deleted from database", len(uploadedIds))
		}
	})
	if !m.creds.IsOnlyForBuildResult {
		utils.SafeAsync(func() {
			uploadedChecksums, err := m.uploadPublishedSourcesArchives(ctx)
			if err != nil {
				log.Errorf("MINIO. Failed to upload published source archives: %s", err.Error())
			} else {
				log.Infof("MINIO. %d published source archives were uploaded to MINIO", len(uploadedChecksums))
			}

			if len(uploadedChecksums) > 0 {
				if err := m.deletePublishedSourcesArchives(ctx, uploadedChecksums); err != nil {
					log.Errorf("MINIO. Failed to delete %d uploaded published source archives from database: %s", len(uploadedChecksums), err.Error())
					return
				}
				log.Infof("MINIO. %d published source archives were deleted from database", len(uploadedChecksums))
			}
		})
	}
}

func (m minioStorageServiceImpl) createBucketIfNotExists(ctx context.Context) error {
	exists, err := m.bucketExists(ctx)
	if err != nil {
		return err
	}
	if exists {
		log.Infof("Minio bucket - %s exists", m.creds.BucketName)
	} else {
		err = m.makeBucket(ctx)
		if err != nil {
			return err
		}
		exists, err = m.bucketExists(ctx)
		if err != nil {
			return err
		}
		if exists {
			log.Infof("Minio bucket - %s was created", m.creds.BucketName)
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

	// Decode custom certificate if provided
	var decodedCert []byte
	if creds.Crt != "" {
		decodedCert, err = base64.StdEncoding.DecodeString(creds.Crt)
		if err != nil {
			log.Warn(err.Error())
			client.error = err
			return client
		}
	}

	tlsConfig, err := utils.BuildSecureTLSConfig(decodedCert)
	if err != nil {
		log.Warn(err.Error())
		client.error = err
		return client
	}
	tr.TLSClientConfig = tlsConfig

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
		buildResult, err = m.getBuildResultWithOffset(ctx, offset)
		if err != nil {
			log.Infof("%d build_results were ulpoaded to minio storage, until got error", offset)
			break
		}
		if buildResult == nil {
			log.Infof("%d build_results were ulpoaded to minio storage, until buildResult is null", offset)
			break
		}
		err = m.uploadObject(ctx, buildFileName(view.BUILD_RESULT_TABLE, buildResult.BuildId), buildResult.Data)
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
	var publishedSourceArchive *entity.PublishedSrcArchiveEntity
	var err error
	for {
		publishedSourceArchive, err = m.getPublishedSourcesArchives(ctx, offset)
		if err != nil {
			log.Infof("%d published_sources_archives were uploaded to minio storage, before error was received", offset)
			break
		}
		if publishedSourceArchive == nil {
			log.Infof("%d published_sources_archives were uploaded to minio storage, before publishedSourceArchive became null", offset)
			break
		}
		err = m.uploadObject(ctx, buildFileName(view.PUBLISHED_SOURCES_ARCHIVES_TABLE, publishedSourceArchive.Checksum), publishedSourceArchive.Data)
		if err != nil {
			log.Infof("%d published_sources_archives were uploaded to minio storage, before error was received", offset)
			break
		}
		checksums = append(checksums, publishedSourceArchive.Checksum)
		offset++
	}
	return checksums, err
}

// Migration operations: one deadline per call to S3 or the database, so a failure identifies the call that ran out of time

func (m minioStorageServiceImpl) downloadObject(ctx context.Context, fullFileName string) ([]byte, error) {
	opCtx, cancel := context.WithTimeout(ctx, m.s3OperationTimeout)
	defer cancel()
	data, err := m.getFile(opCtx, fullFileName)
	return data, utils.WrapContextError(opCtx, err)
}

func (m minioStorageServiceImpl) uploadObject(ctx context.Context, fileName string, content []byte) error {
	opCtx, cancel := context.WithTimeout(ctx, m.s3OperationTimeout)
	defer cancel()
	return utils.WrapContextError(opCtx, m.putObject(opCtx, fileName, content))
}

func (m minioStorageServiceImpl) bucketExists(ctx context.Context) (bool, error) {
	opCtx, cancel := context.WithTimeout(ctx, m.s3OperationTimeout)
	defer cancel()
	exists, err := m.minioClient.client.BucketExists(opCtx, m.creds.BucketName)
	return exists, utils.WrapContextError(opCtx, err)
}

func (m minioStorageServiceImpl) makeBucket(ctx context.Context) error {
	opCtx, cancel := context.WithTimeout(ctx, m.s3OperationTimeout)
	defer cancel()
	return utils.WrapContextError(opCtx, m.minioClient.client.MakeBucket(opCtx, m.creds.BucketName, minio.MakeBucketOptions{}))
}

func (m minioStorageServiceImpl) storeBuildResult(ctx context.Context, ent entity.BuildResultEntity) error {
	opCtx, cancel := context.WithTimeout(ctx, m.databaseOperationTimeout)
	defer cancel()
	return utils.WrapContextError(opCtx, m.buildRepository.StoreBuildResult(opCtx, ent))
}

func (m minioStorageServiceImpl) savePublishedSourcesArchive(ctx context.Context, ent *entity.PublishedSrcArchiveEntity) error {
	opCtx, cancel := context.WithTimeout(ctx, m.databaseOperationTimeout)
	defer cancel()
	return utils.WrapContextError(opCtx, m.publishRepo.SavePublishedSourcesArchive(opCtx, ent))
}

func (m minioStorageServiceImpl) getBuildResultWithOffset(ctx context.Context, offset int) (*entity.BuildResultEntity, error) {
	opCtx, cancel := context.WithTimeout(ctx, m.databaseOperationTimeout)
	defer cancel()
	ent, err := m.buildRepository.GetBuildResultWithOffset(opCtx, offset)
	return ent, utils.WrapContextError(opCtx, err)
}

func (m minioStorageServiceImpl) getPublishedSourcesArchives(ctx context.Context, offset int) (*entity.PublishedSrcArchiveEntity, error) {
	opCtx, cancel := context.WithTimeout(ctx, m.databaseOperationTimeout)
	defer cancel()
	ent, err := m.publishRepo.GetPublishedSourcesArchives(opCtx, offset)
	return ent, utils.WrapContextError(opCtx, err)
}

// The bulk deletes run VACUUM FULL on the affected table, which scales with the table size rather than with
// the number of deleted rows, so they use bulkDeleteTimeout instead of databaseOperationTimeout.

func (m minioStorageServiceImpl) deleteBuildResults(ctx context.Context, buildIds []string) error {
	opCtx, cancel := context.WithTimeout(ctx, m.bulkDeleteTimeout)
	defer cancel()
	return utils.WrapContextError(opCtx, m.buildRepository.DeleteBuildResults(opCtx, buildIds))
}

func (m minioStorageServiceImpl) deletePublishedSourcesArchives(ctx context.Context, checksums []string) error {
	opCtx, cancel := context.WithTimeout(ctx, m.bulkDeleteTimeout)
	defer cancel()
	return utils.WrapContextError(opCtx, m.publishRepo.DeletePublishedSourcesArchives(opCtx, checksums))
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
	// GetObject owns a goroutine that is released only by Close
	defer minioObject.Close()
	minioObjectContent, err := io.ReadAll(minioObject)
	return minioObjectContent, err
}

func (m minioStorageServiceImpl) RemoveFiles(ctx context.Context, tableName string, entityIds []string) error {
	keys := make([]string, 0, len(entityIds))
	for _, id := range entityIds {
		keys = append(keys, buildFileName(tableName, id))
	}
	return m.removeObjectsByKeys(ctx, keys)
}

func (m minioStorageServiceImpl) RemoveObjectsOlderThan(ctx context.Context, tableName string, before time.Time) (int, error) {
	prefix := fmt.Sprintf("%s/", tableName)
	objectsChan := m.minioClient.client.ListObjects(ctx, m.creds.BucketName, minio.ListObjectsOptions{Prefix: prefix, Recursive: true})

	deletedCount := 0
	batch := make([]string, 0, removeObjectsBatchSize)
	for object := range objectsChan {
		if object.Err != nil {
			return deletedCount, object.Err
		}
		if err := ctx.Err(); err != nil {
			return deletedCount, err
		}
		if !object.LastModified.Before(before) {
			continue
		}

		batch = append(batch, object.Key)
		if len(batch) < removeObjectsBatchSize {
			continue
		}
		if err := m.removeObjectsByKeys(ctx, batch); err != nil {
			return deletedCount, err
		}
		deletedCount += len(batch)
		batch = make([]string, 0, removeObjectsBatchSize)
	}

	if len(batch) > 0 {
		if err := m.removeObjectsByKeys(ctx, batch); err != nil {
			return deletedCount, err
		}
		deletedCount += len(batch)
	}
	return deletedCount, nil
}

func (m minioStorageServiceImpl) removeObjectsByKeys(ctx context.Context, keys []string) error {
	minioObjectsChan := make(chan minio.ObjectInfo, len(keys))
	utils.SafeAsync(func() {
		for _, key := range keys {
			minioObjectsChan <- minio.ObjectInfo{Key: key}
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
