import { BASELINE_VERSIONS_PAGE_SIZE, type BaselineVersion, type Service } from '@agents/entities/services'
import { NO_PREVIOUS_VERSION_OPTION } from '@agents/entities/snapshots'
import {
  getBaselineSearchesForText,
  getBaselineSearchesForVersion,
  getServicesWithFoundVersions,
  getSnapshotVersionError,
  SNAPSHOT_VERSION_EQUALS_BASELINE_ERROR,
  splitByBaselineVersion,
} from './snapshotForm'

describe('snapshotForm', () => {
  it('accepts a snapshot version with a dot that differs from the baseline version', () => {
    expect(getSnapshotVersionError('2025.4', '2025.3')).toBeUndefined()
  })

  it('rejects a snapshot version with a restricted symbol', () => {
    expect(getSnapshotVersionError('2025#4', '2025.3')).toBe('Only \'A-Za-z0-9_.~-\' characters are allowed')
  })

  it('rejects a snapshot version equal to the baseline version', () => {
    expect(getSnapshotVersionError('2025.3', '2025.3')).toBe(SNAPSHOT_VERSION_EQUALS_BASELINE_ERROR)
  })

  it('accepts an empty snapshot version while no baseline version is selected', () => {
    expect(getSnapshotVersionError('', '')).toBeUndefined()
  })

  it('accepts "No previous version" as a snapshot version while "No previous version" is the baseline', () => {
    expect(getSnapshotVersionError(NO_PREVIOUS_VERSION_OPTION, NO_PREVIOUS_VERSION_OPTION)).toBeUndefined()
  })

  it('matches only the services whose baseline package holds the baseline version', () => {
    const holding = createService('service-a', 'PKG-A', ['2025.3'])
    const lacking = createService('service-b', 'PKG-B', ['2025.2'])
    const withoutPackage = createService('service-c')

    expect(splitByBaselineVersion([holding, lacking, withoutPackage], '2025.3')).toEqual({
      matching: [holding],
      notMatching: [lacking, withoutPackage],
    })
  })

  it('matches every service with "No previous version"', () => {
    const withPackage = createService('service-a', 'PKG-A', ['2025.3'])
    const withoutPackage = createService('service-b')

    expect(splitByBaselineVersion([withPackage, withoutPackage], NO_PREVIOUS_VERSION_OPTION)).toEqual({
      matching: [withPackage, withoutPackage],
      notMatching: [],
    })
  })

  it('searches a text once in each baseline package with a full page of versions', () => {
    const services = [
      createService('service-a', 'PKG-A', createFullPage()),
      createService('service-b', 'PKG-A', createFullPage()),
      createService('service-c', 'PKG-C', ['2025.3']),
      createService('service-d'),
    ]

    expect(getBaselineSearchesForText(services, '2021')).toEqual([{ packageKey: 'PKG-A', textFilter: '2021' }])
  })

  it('searches nothing for an empty text', () => {
    expect(getBaselineSearchesForText([createService('service-a', 'PKG-A', createFullPage())], '')).toEqual([])
  })

  it('searches a version in the full packages that do not list it', () => {
    const services = [
      createService('service-a', 'PKG-A', createFullPage()),
      createService('service-b', 'PKG-B', createFullPage('2021.1')),
      createService('service-c', 'PKG-C', ['1.0']),
    ]

    expect(getBaselineSearchesForVersion(services, '2021.1')).toEqual([{ packageKey: 'PKG-A', textFilter: '2021.1' }])
  })

  it('searches nothing without a version or with "No previous version"', () => {
    const services = [createService('service-a', 'PKG-A', createFullPage())]

    expect(getBaselineSearchesForVersion(services, '')).toEqual([])
    expect(getBaselineSearchesForVersion(services, NO_PREVIOUS_VERSION_OPTION)).toEqual([])
  })

  it('adds each found version once, after the versions of its package', () => {
    const services = [
      createService('service-a', 'PKG-A', ['2025.3']),
      createService('service-b', 'PKG-B', ['1.0']),
      createService('service-c'),
    ]

    const [serviceA, serviceB, serviceC] = getServicesWithFoundVersions(services, [
      { packageKey: 'PKG-A', versions: createVersions(['2025.3', '2021.1']) },
      { packageKey: 'PKG-A', versions: createVersions(['2021.1']) },
    ])

    expect(serviceA.baseline?.versions.map(({ versionKey }) => versionKey)).toEqual(['2025.3', '2021.1'])
    expect(serviceB).toBe(services[1])
    expect(serviceC).toBe(services[2])
    expect(getServicesWithFoundVersions(services, [])).toBe(services)
  })
})

function createService(key: string, packageKey?: string, versionKeys: ReadonlyArray<string> = []): Service {
  return {
    key: key,
    specs: [],
    baseline: packageKey === undefined
      ? undefined
      : { packageKey: packageKey, name: packageKey, versions: createVersions(versionKeys), url: '' },
  }
}

function createVersions(versionKeys: ReadonlyArray<string>): ReadonlyArray<BaselineVersion> {
  return versionKeys.map(versionKey => ({ versionKey: versionKey, hasErrors: false, changelogHasErrors: false }))
}

// A full page of versions; `versionKey` takes the place of the last one
function createFullPage(versionKey?: string): ReadonlyArray<string> {
  const page = Array.from({ length: BASELINE_VERSIONS_PAGE_SIZE }, (_, index) => `1.0.${index}`)
  return versionKey === undefined ? page : [...page.slice(1), versionKey]
}
