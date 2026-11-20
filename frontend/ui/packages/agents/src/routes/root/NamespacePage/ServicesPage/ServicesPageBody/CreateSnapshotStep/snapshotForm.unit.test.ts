import { BASELINE_VERSIONS_PAGE_SIZE, type BaselineVersion, type Service } from '@agents/entities/services'
import { NO_PREVIOUS_VERSION_OPTION } from '@agents/entities/snapshots'
import {
  baselineSearchesForText,
  baselineSearchesForVersion,
  SNAPSHOT_VERSION_EQUALS_BASELINE_ERROR,
  snapshotVersionErrorOf,
  splitByBaselineVersion,
  withFoundBaselineVersions,
} from './snapshotForm'

describe('snapshotForm', () => {
  test('accepts a snapshot version with a dot that differs from the baseline version', () => {
    expect(snapshotVersionErrorOf('2025.4', '2025.3')).toBeUndefined()
  })

  test('rejects a snapshot version with a restricted symbol', () => {
    expect(snapshotVersionErrorOf('2025#4', '2025.3')).toBe('Only \'A-Za-z0-9_.~-\' characters are allowed')
  })

  test('rejects a snapshot version equal to the baseline version', () => {
    expect(snapshotVersionErrorOf('2025.3', '2025.3')).toBe(SNAPSHOT_VERSION_EQUALS_BASELINE_ERROR)
  })

  test('accepts an empty snapshot version while no baseline version is selected', () => {
    expect(snapshotVersionErrorOf('', '')).toBeUndefined()
  })

  test('matches only the services whose baseline package holds the baseline version', () => {
    const holding = serviceOf('service-a', 'PKG-A', ['2025.3'])
    const lacking = serviceOf('service-b', 'PKG-B', ['2025.2'])
    const withoutPackage = serviceOf('service-c')

    expect(splitByBaselineVersion([holding, lacking, withoutPackage], '2025.3')).toEqual({
      matching: [holding],
      notMatching: [lacking, withoutPackage],
    })
  })

  test('matches every service with "No previous version"', () => {
    const withPackage = serviceOf('service-a', 'PKG-A', ['2025.3'])
    const withoutPackage = serviceOf('service-b')

    expect(splitByBaselineVersion([withPackage, withoutPackage], NO_PREVIOUS_VERSION_OPTION)).toEqual({
      matching: [withPackage, withoutPackage],
      notMatching: [],
    })
  })

  test('searches a text once in each baseline package with a full page of versions', () => {
    const services = [
      serviceOf('service-a', 'PKG-A', fullPageOf()),
      serviceOf('service-b', 'PKG-A', fullPageOf()),
      serviceOf('service-c', 'PKG-C', ['2025.3']),
      serviceOf('service-d'),
    ]

    expect(baselineSearchesForText(services, '2021')).toEqual([{ packageKey: 'PKG-A', textFilter: '2021' }])
  })

  test('searches nothing for an empty text', () => {
    expect(baselineSearchesForText([serviceOf('service-a', 'PKG-A', fullPageOf())], '')).toEqual([])
  })

  test('searches a version in the full packages that do not list it', () => {
    const services = [
      serviceOf('service-a', 'PKG-A', fullPageOf()),
      serviceOf('service-b', 'PKG-B', fullPageOf('2021.1')),
      serviceOf('service-c', 'PKG-C', ['1.0']),
    ]

    expect(baselineSearchesForVersion(services, '2021.1')).toEqual([{ packageKey: 'PKG-A', textFilter: '2021.1' }])
  })

  test('searches nothing without a version or with "No previous version"', () => {
    const services = [serviceOf('service-a', 'PKG-A', fullPageOf())]

    expect(baselineSearchesForVersion(services, '')).toEqual([])
    expect(baselineSearchesForVersion(services, NO_PREVIOUS_VERSION_OPTION)).toEqual([])
  })

  test('adds each found version once, after the versions of its package', () => {
    const services = [serviceOf('service-a', 'PKG-A', ['2025.3']), serviceOf('service-b', 'PKG-B', ['1.0'])]

    const [serviceA, serviceB] = withFoundBaselineVersions(services, [
      { packageKey: 'PKG-A', versions: versionsOf(['2025.3', '2021.1']) },
      { packageKey: 'PKG-A', versions: versionsOf(['2021.1']) },
    ])

    expect(serviceA.baseline?.versions.map(({ versionKey }) => versionKey)).toEqual(['2025.3', '2021.1'])
    expect(serviceB).toBe(services[1])
    expect(withFoundBaselineVersions(services, [])).toBe(services)
  })
})

function serviceOf(key: string, packageKey?: string, versionKeys: ReadonlyArray<string> = []): Service {
  return {
    key: key,
    specs: [],
    baseline: packageKey === undefined
      ? undefined
      : { packageKey: packageKey, name: packageKey, versions: versionsOf(versionKeys), url: '' },
  }
}

function versionsOf(versionKeys: ReadonlyArray<string>): ReadonlyArray<BaselineVersion> {
  return versionKeys.map(versionKey => ({ versionKey: versionKey, hasErrors: false, changelogHasErrors: false }))
}

// A full page of versions; `versionKey` takes the place of the last one
function fullPageOf(versionKey?: string): ReadonlyArray<string> {
  const page = Array.from({ length: BASELINE_VERSIONS_PAGE_SIZE }, (_, index) => `1.0.${index}`)
  return versionKey === undefined ? page : [...page.slice(1), versionKey]
}
