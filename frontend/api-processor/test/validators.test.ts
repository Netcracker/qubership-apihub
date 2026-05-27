import { applyBuilderVersionInfo, validateApiProcessorVersion } from '../src/validators'
import {
  PackageConfig,
  VERSION_VALIDATION_LEVEL,
  VersionCache,
  VersionValidationLevel,
} from '../src'
import { buildChangelogWithVersionOverrides } from './helpers'

let mockVersion = '1.0.0'
jest.mock('../package.json', () => ({
  get version() { return mockVersion },
}))

function createVersionCache(overrides: Partial<VersionCache> = {}): VersionCache {
  return {
    packageId: 'test-package',
    version: 'v1',
    apiProcessorVersion: '1.0.0',
    ...overrides,
  }
}

type ValidationCase = [
  expectation: 'throw' | 'pass',
  description: string,
  level: VersionValidationLevel,
  current: string,
  resolved: string | null,
]

// null resolved = resolvedVersion is null (no version data)
const validationCases: ValidationCase[] = [
  // strict mode — exact string match required
  ['pass',  'exact match',                  VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', '1.0.0'],
  ['throw', 'different major',              VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', '2.0.0'],
  ['throw', 'different minor',              VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', '1.1.0'],
  ['throw', 'different patch',              VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', '1.0.1'],
  ['throw', 'completely different',         VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', '9.9.9'],
  ['throw', 'unparseable resolved',         VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', 'invalid'],
  ['throw', 'resolved has prerelease',      VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', '1.0.0-feature-branch.202605'],
  ['throw', 'current has prerelease',       VERSION_VALIDATION_LEVEL.STRICT, '1.0.0-feature-branch.202605', '1.0.0'],
  ['throw', 'both have different suffixes', VERSION_VALIDATION_LEVEL.STRICT, '1.0.0-bugfix.1', '1.0.0-bugfix.2'],
  ['pass',  'null version',                 VERSION_VALIDATION_LEVEL.STRICT, '1.0.0', null],

  // major mode — only major part compared
  ['pass',  'exact match',                  VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', '1.0.0'],
  ['pass',  'different minor',              VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', '1.1.0'],
  ['pass',  'different patch',              VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', '1.0.1'],
  ['pass',  'same major, max minor/patch',  VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', '1.999.999'],
  ['pass',  'resolved has prerelease',      VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', '1.0.0-feature-branch.202605'],
  ['pass',  'current has prerelease',       VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0-feature-branch.202605', '1.0.0'],
  ['pass',  'both have different suffixes', VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0-bugfix.1', '1.0.0-bugfix.2'],
  ['pass',  'unparseable resolved',         VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', 'invalid'],
  ['pass',  'unparseable current',          VERSION_VALIDATION_LEVEL.MAJOR, 'garbage', '1.0.0'],
  ['pass',  'current without dot',          VERSION_VALIDATION_LEVEL.MAJOR, '1', '1.2.3'],
  ['pass',  'null version',                 VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', null],
  ['throw', 'higher major',                 VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', '2.0.0'],
  ['throw', 'lower major',                  VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0', '0.0.0'],
  ['throw', 'both have suffixes, different major', VERSION_VALIDATION_LEVEL.MAJOR, '1.0.0-bugfix.1', '2.0.0-bugfix.2'],
]

describe('validateApiProcessorVersion', () => {
  afterEach(() => {
    mockVersion = '1.0.0'
  })

  it.each(validationCases)(
    'should %s for %s (%s, current=%s resolved=%s)',
    (expectation, _desc, level, current, resolved) => {
      mockVersion = current
      const cache = resolved !== null ? createVersionCache({ apiProcessorVersion: resolved }) : null
      if (expectation === 'throw') {
        expect(() => validateApiProcessorVersion(cache, level)).toThrow()
      } else {
        expect(() => validateApiProcessorVersion(cache, level)).not.toThrow()
      }
    },
  )

  it('should include error prefix in strict mode', () => {
    const cache = createVersionCache({ apiProcessorVersion: '0.0.1' })
    expect(() => validateApiProcessorVersion(cache, VERSION_VALIDATION_LEVEL.STRICT, 'Prefix.')).toThrow(/^Prefix\./)
  })

  it('should include error prefix in major mode', () => {
    const cache = createVersionCache({ apiProcessorVersion: '2.0.0' })
    expect(() => validateApiProcessorVersion(cache, VERSION_VALIDATION_LEVEL.MAJOR, 'Prefix.')).toThrow(/^Prefix\./)
  })
})

describe('validateApiProcessorVersion e2e through builder', () => {
  const packageId = 'test-version-validation-e2e'

  it('should pass in strict mode when versions match', async () => {
    await expect(buildChangelogWithVersionOverrides(packageId, {}, VERSION_VALIDATION_LEVEL.STRICT)).resolves.toBeDefined()
  })

  it('should throw in strict mode when previous version has different minor', async () => {
    await expect(buildChangelogWithVersionOverrides(packageId, { v1: '1.1.0' }, VERSION_VALIDATION_LEVEL.STRICT))
      .rejects.toThrow(/previous version was built using an outdated api-processor/)
  })

  it('should throw in strict mode when current version has different patch', async () => {
    await expect(buildChangelogWithVersionOverrides(packageId, { v2: '1.0.1' }, VERSION_VALIDATION_LEVEL.STRICT))
      .rejects.toThrow(/current version was built using an outdated api-processor/)
  })

  it('should pass in major mode when only minor differs', async () => {
    await expect(buildChangelogWithVersionOverrides(packageId, { v1: '1.1.0' }, VERSION_VALIDATION_LEVEL.MAJOR)).resolves.toBeDefined()
  })

  it('should throw in major mode when previous version has different major', async () => {
    await expect(buildChangelogWithVersionOverrides(packageId, { v1: '2.0.0' }, VERSION_VALIDATION_LEVEL.MAJOR))
      .rejects.toThrow(/previous version was built using an outdated api-processor/)
  })

  it('should throw in major mode when current version has different major', async () => {
    await expect(buildChangelogWithVersionOverrides(packageId, { v2: '2.0.0' }, VERSION_VALIDATION_LEVEL.MAJOR))
      .rejects.toThrow(/current version was built using an outdated api-processor/)
  })
})

describe('Builder version info in changelog result', () => {
  const packageId = 'test-builder-version-info'

  it('should set previousVersionBuilderVersion when previous version has different apiProcessorVersion', async () => {
    const result = await buildChangelogWithVersionOverrides(packageId, { v1: '1.1.0' })
    expect(result.config.previousVersionBuilderVersion).toBe('1.1.0')
    expect(result.config).not.toHaveProperty('currentVersionBuilderVersion')
  })

  it('should set currentVersionBuilderVersion when current version has different apiProcessorVersion', async () => {
    const result = await buildChangelogWithVersionOverrides(packageId, { v2: '1.1.0' })
    expect(result.config).not.toHaveProperty('previousVersionBuilderVersion')
    expect(result.config.currentVersionBuilderVersion).toBe('1.1.0')
  })

  it('should set both when both versions differ from current', async () => {
    const result = await buildChangelogWithVersionOverrides(packageId, {
      v1: '1.1.0',
      v2: '1.0.1',
    })
    expect(result.config.previousVersionBuilderVersion).toBe('1.1.0')
    expect(result.config.currentVersionBuilderVersion).toBe('1.0.1')
  })

  it('should not set either when both versions match current apiProcessorVersion', async () => {
    const result = await buildChangelogWithVersionOverrides(packageId, {})
    expect(result.config).not.toHaveProperty('previousVersionBuilderVersion')
    expect(result.config).not.toHaveProperty('currentVersionBuilderVersion')
  })

  it('should clear stale builder version fields from previous build when rebuild has no mismatch', () => {
    const config = { previousVersionBuilderVersion: '0.9.0', currentVersionBuilderVersion: '0.8.0' } as PackageConfig
    applyBuilderVersionInfo(config, {})
    expect(config).not.toHaveProperty('previousVersionBuilderVersion')
    expect(config).not.toHaveProperty('currentVersionBuilderVersion')
  })
})
