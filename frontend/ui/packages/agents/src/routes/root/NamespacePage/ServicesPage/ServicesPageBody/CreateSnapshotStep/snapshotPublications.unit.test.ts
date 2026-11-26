import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  type PublishDetails,
  type PublishStatus,
  RUNNING_PUBLISH_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { ServiceConfig } from '@agents/entities/publish-config'
import type { Service } from '@agents/entities/services'
import type { SnapshotPublication } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  COMPLETE_STEP_STATUS,
  ERROR_STEP_STATUS,
  NONE_STEP_STATUS,
  RUNNING_STEP_STATUS,
} from '../../ServicesPageProvider/servicesSteps'
import {
  getCreateSnapshotStepStatus,
  getServicesOutsideSnapshots,
  getSnapshotPublishDetails,
  hasPromotableService,
  isSnapshotCreated,
} from './snapshotPublications'

describe('snapshotPublications', () => {
  test('leaves out the services of every snapshot, a failed one included', () => {
    const services = [createService('service-a'), createService('service-b'), createService('service-c')]
    const snapshotPublications = [
      createSnapshotPublication(1, ['service-a']),
      createSnapshotPublication(2, ['service-b']),
    ]

    expect(getServicesOutsideSnapshots(services, snapshotPublications)).toEqual([services[2]])
  })

  test('runs a snapshot until each of its publications is final', () => {
    const snapshotPublication = createSnapshotPublication(1, ['service-a'])

    expect(
      getSnapshotPublishDetails(snapshotPublication, [
        createPublishDetails('service-a-publish', COMPLETE_PUBLISH_STATUS),
      ]).status,
    ).toBe(RUNNING_PUBLISH_STATUS)
  })

  test('fails a snapshot when one of its services failed', () => {
    const snapshotPublication = createSnapshotPublication(1, ['service-a', 'service-b'])

    expect(
      getSnapshotPublishDetails(snapshotPublication, [
        createPublishDetails('service-a-publish', ERROR_PUBLISH_STATUS),
        createPublishDetails('service-b-publish', COMPLETE_PUBLISH_STATUS),
        createPublishDetails('snapshot-1-publish', COMPLETE_PUBLISH_STATUS),
      ]).status,
    ).toBe(ERROR_PUBLISH_STATUS)
  })

  test('carries the errors and the changelog errors of its services into the snapshot', () => {
    const snapshotPublication = createSnapshotPublication(1, ['service-a', 'service-b'])

    expect(getSnapshotPublishDetails(snapshotPublication, [
      createPublishDetails('service-a-publish', COMPLETE_PUBLISH_STATUS, { hasErrors: true }),
      createPublishDetails('service-b-publish', COMPLETE_PUBLISH_STATUS, { changelogHasErrors: true }),
      createPublishDetails('snapshot-1-publish', COMPLETE_PUBLISH_STATUS),
    ])).toMatchObject({ status: COMPLETE_PUBLISH_STATUS, hasErrors: true, changelogHasErrors: true })
  })

  test('runs the step while the create request runs, also after a failed one', () => {
    expect(getCreateSnapshotStepStatus({
      snapshotPublications: [],
      allPublishDetails: [],
      isCreating: true,
      isCreationFailed: true,
    })).toBe(RUNNING_STEP_STATUS)
  })

  test('fails the step while the last create request failed', () => {
    expect(getCreateSnapshotStepStatus({
      snapshotPublications: [createSnapshotPublication(1, ['service-a'])],
      allPublishDetails: [
        createPublishDetails('service-a-publish', COMPLETE_PUBLISH_STATUS),
        createPublishDetails('snapshot-1-publish', COMPLETE_PUBLISH_STATUS),
      ],
      isCreating: false,
      isCreationFailed: true,
    })).toBe(ERROR_STEP_STATUS)
  })

  test('has no status without a snapshot', () => {
    expect(getCreateSnapshotStepStatus({
      snapshotPublications: [],
      allPublishDetails: [],
      isCreating: false,
      isCreationFailed: false,
    })).toBe(NONE_STEP_STATUS)
  })

  test('runs the step while a publication of a snapshot runs', () => {
    expect(getCreateSnapshotStepStatus({
      snapshotPublications: [
        createSnapshotPublication(1, ['service-a']),
        createSnapshotPublication(2, ['service-b']),
      ],
      allPublishDetails: [
        createPublishDetails('service-a-publish', COMPLETE_PUBLISH_STATUS),
        createPublishDetails('snapshot-1-publish', COMPLETE_PUBLISH_STATUS),
        createPublishDetails('service-b-publish', RUNNING_PUBLISH_STATUS),
      ],
      isCreating: false,
      isCreationFailed: false,
    })).toBe(RUNNING_STEP_STATUS)
  })

  test('completes the step when a snapshot published one of its services', () => {
    expect(getCreateSnapshotStepStatus({
      snapshotPublications: [createSnapshotPublication(1, ['service-a', 'service-b'])],
      allPublishDetails: [
        createPublishDetails('service-a-publish', ERROR_PUBLISH_STATUS),
        createPublishDetails('service-b-publish', COMPLETE_PUBLISH_STATUS),
        createPublishDetails('snapshot-1-publish', COMPLETE_PUBLISH_STATUS),
      ],
      isCreating: false,
      isCreationFailed: false,
    })).toBe(COMPLETE_STEP_STATUS)
  })

  test('fails the step when no service of any snapshot was published', () => {
    expect(getCreateSnapshotStepStatus({
      snapshotPublications: [
        createSnapshotPublication(1, ['service-a']),
        createSnapshotPublication(2, ['service-b']),
      ],
      allPublishDetails: [
        createPublishDetails('service-a-publish', ERROR_PUBLISH_STATUS),
        createPublishDetails('snapshot-1-publish', COMPLETE_PUBLISH_STATUS),
        createPublishDetails('service-b-publish', ERROR_PUBLISH_STATUS),
        createPublishDetails('snapshot-2-publish', COMPLETE_PUBLISH_STATUS),
      ],
      isCreating: false,
      isCreationFailed: false,
    })).toBe(ERROR_STEP_STATUS)
  })

  test('creates a snapshot when one of its services was published', () => {
    expect(isSnapshotCreated(createSnapshotPublication(1, ['service-a', 'service-b']), [
      createPublishDetails('service-a-publish', ERROR_PUBLISH_STATUS),
      createPublishDetails('service-b-publish', COMPLETE_PUBLISH_STATUS),
    ])).toBe(true)
  })

  test('creates no snapshot when each of its services failed', () => {
    expect(isSnapshotCreated(createSnapshotPublication(1, ['service-a']), [
      createPublishDetails('service-a-publish', ERROR_PUBLISH_STATUS),
    ])).toBe(false)
  })

  test('finds a published service with a baseline package', () => {
    expect(hasPromotableService(
      [createSnapshotPublication(1, ['service-a'])],
      [createPublishDetails('service-a-publish', COMPLETE_PUBLISH_STATUS)],
      [createService('service-a', true)],
    )).toBe(true)
  })

  test('ignores a published service without a baseline package and a failed one with it', () => {
    expect(hasPromotableService(
      [createSnapshotPublication(1, ['service-a', 'service-b'])],
      [
        createPublishDetails('service-a-publish', COMPLETE_PUBLISH_STATUS),
        createPublishDetails('service-b-publish', ERROR_PUBLISH_STATUS),
      ],
      [createService('service-a', false), createService('service-b', true)],
    )).toBe(false)
  })
})

function createService(key: string, hasBaseline = false): Service {
  return {
    key: key,
    specs: [],
    baseline: hasBaseline
      ? { packageKey: `${key}-package`, name: key, versions: [], url: '' }
      : undefined,
  }
}

function createSnapshotPublication(snapshotNumber: number, serviceKeys: ReadonlyArray<string>): SnapshotPublication {
  return {
    name: `snapshot-${snapshotNumber}`,
    baseline: '',
    config: {
      snapshotConfig: { publishId: `snapshot-${snapshotNumber}-publish`, packageId: 'workspace-snapshots' },
      serviceConfigs: serviceKeys.map(createServiceConfig),
      builderId: 'builder',
    },
  }
}

function createServiceConfig(serviceKey: string): ServiceConfig {
  return {
    serviceId: serviceKey,
    publishId: `${serviceKey}-publish`,
    packageId: `${serviceKey}-package`,
    version: '',
    previousVersion: '',
    versionFolder: '',
    labels: [],
    status: 'draft',
    refs: [],
    files: [],
    operations: [],
  }
}

function createPublishDetails(
  publishId: string,
  status: PublishStatus,
  flags?: Pick<PublishDetails, 'hasErrors' | 'changelogHasErrors'>,
): PublishDetails {
  return { publishId: publishId, status: status, ...flags }
}
