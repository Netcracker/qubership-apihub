/**
 * Copyright 2024-2025 NetCracker Technology Corporation
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

import {
  BUILD_TYPE,
  BuildConfig,
  BuildConfigFile,
  BuildResult,
  BuildType,
  Labels,
  VERSION_STATUS,
  VERSION_VALIDATION_LEVEL,
  PackageVersionBuilder,
  VersionId,
  VersionStatus,
  VersionValidationLevel,
} from '../../src/processor'
import { loadJsonFromRegistry, LocalRegistry, VERSIONS_PATH, VersionOverrideRegistry } from './registry'
import { Editor } from './editor'
import { ANY_REST_SPEC, DocumentChange } from './fixtures'
import { IRegistry } from './registry/types'
import { isString, takeIfDefined } from '../../src/utils'

export const BEFORE_VERSION_ID = 'v1'

export const AFTER_VERSION_ID = 'v2'

const DEFAULT_DASHBOARD_ID = 'dashboards/dashboard'

/** A bare `fileId`, or a whole entry when the call needs `publish`, `labels`, or `xApiKind` on it. */
type FileArg = string | BuildConfigFile

/**
 * Publish a version of a package from the files it contains: the sentence most call sites write by hand.
 *
 * One file or a list — a quarter of the call sites publish several, and some assemble the list at runtime.
 *
 * `extra` cannot restate `files`, `packageId`, or `version`: those are the arguments above, and a call that
 * set both would silently contradict itself.
 */
export const publishVersion = (
  packageId: string,
  version: VersionId,
  files: FileArg | readonly FileArg[],
  extra: Omit<Partial<BuildConfig>, 'files' | 'packageId' | 'version'> = {},
): Promise<BuildResult> =>
  LocalRegistry.openPackage(packageId).publish(packageId, {
    packageId,
    version,
    files: (Array.isArray(files) ? files : [files]).map(file => (isString(file) ? { fileId: file } : file)),
    ...extra,
  })

// Every changelog wrapper asks for the same thing: compare this package's `v2` against its own `v1`.
const changelogConfig = (packageId: string): BuildConfig => ({
  version: AFTER_VERSION_ID,
  packageId,
  previousVersionPackageId: packageId,
  previousVersion: BEFORE_VERSION_ID,
  buildType: BUILD_TYPE.CHANGELOG,
  status: VERSION_STATUS.RELEASE,
})

/**
 * An editor that builds this package's `v2` changelog against its own `v1`, for a test that needs the editor itself:
 * to spy on its builder or to pack the result. Pass the registry the versions were published through when the test
 * keeps using it, so the build reads the same instance.
 */
export const changelogEditor = (packageId: string, registry?: IRegistry): Editor =>
  new Editor(packageId, changelogConfig(packageId), {}, registry)

export async function buildChangelogPackage(
  packageId: string,
  filesBefore?: BuildConfigFile[],
  filesAfter?: BuildConfigFile[],
  status?: VersionStatus,
): Promise<BuildResult> {
  const editor = await prepareChangelogPackage(packageId, filesBefore, filesAfter, status)
  return editor.run()
}

/**
 * Publish the package's `v1` and `v2` and return the editor for their changelog without running it, for a test
 * that has to reach into the builder first.
 */
export async function prepareChangelogPackage(
  packageId: string,
  filesBefore: BuildConfigFile[] = [{ fileId: 'before.yaml' }],
  filesAfter: BuildConfigFile[] = [{ fileId: 'after.yaml' }],
  // the pair's own status: a fixture that carries an Error publishes as a draft, and the changelog over it
  // is what the test is about
  status: VersionStatus = VERSION_STATUS.RELEASE,
): Promise<Editor> {
  const registry = LocalRegistry.openPackage(packageId)

  await registry.publish(packageId, { packageId, version: BEFORE_VERSION_ID, files: filesBefore, status })
  await registry.publish(packageId, { packageId, version: AFTER_VERSION_ID, files: filesAfter, status })

  return changelogEditor(packageId)
}

export async function buildPrefixGroupChangelogPackage(options: {
  packageId: string
  config?: Partial<Pick<BuildConfig, 'files' | 'currentGroup' | 'previousGroup'>>
}): Promise<BuildResult> {
  const {
    packageId,
    config: {
      files = [{ fileId: 'spec.yaml' }],
      currentGroup = '/api/v2/',
      previousGroup = '/api/v1/',
    } = {},
  } = options

  const registry = LocalRegistry.openPackage(packageId)

  await registry.publish(packageId, {
    packageId,
    version: BEFORE_VERSION_ID,
    files,
  })

  const editor = new Editor(packageId, {
    version: BEFORE_VERSION_ID,
    packageId,
    currentGroup,
    previousGroup,
    buildType: BUILD_TYPE.PREFIX_GROUPS_CHANGELOG,
    status: VERSION_STATUS.RELEASE,
  })
  return await editor.run()
}

export async function buildGqlChangelogPackage(
  packageId: string,
): Promise<BuildResult> {
  return buildChangelogPackage(packageId, [{ fileId: 'before.gql' }], [{ fileId: 'after.gql' }])
}

export async function buildPackageFromConfigJson(
  packageId: string,
): Promise<BuildResult> {
  const registry = LocalRegistry.openPackage(packageId)
  const editor = await Editor.openProject(packageId, registry)
  await registry.publish(packageId, { packageId })
  return editor.run({
    version: BEFORE_VERSION_ID,
    status: VERSION_STATUS.RELEASE,
    buildType: BUILD_TYPE.BUILD,
  })
}

/**
 * Publish two packages at `v1` and `v2`, and a dashboard at both versions referencing both of them.
 *
 * Distinct from `prepareChangelogDashboard`, which gives each dashboard version a single reference: here every
 * version of the dashboard carries both, so a comparison of `v1` against `v2` produces a pair per reference.
 * That is what a test needs to fail one reference and watch what the aggregate does.
 */
export async function publishDashboardWithTwoRefs(
  packageId1: string,
  packageId2: string,
  dashboardPackageId: string = DEFAULT_DASHBOARD_ID,
): Promise<LocalRegistry> {
  for (const version of [BEFORE_VERSION_ID, AFTER_VERSION_ID]) {
    await publishVersion(packageId1, version, 'v1.yaml')
    await publishVersion(packageId2, version, 'v2.yaml')
  }

  const dashboard = LocalRegistry.openPackage(dashboardPackageId)
  for (const version of [BEFORE_VERSION_ID, AFTER_VERSION_ID]) {
    await dashboard.publish(dashboardPackageId, {
      packageId: dashboardPackageId,
      version,
      apiType: 'rest',
      refs: [{ refId: packageId1, version }, { refId: packageId2, version }],
    })
  }
  return dashboard
}

export async function buildChangelogDashboard(
  packageId1: string,
  packageId2: string,
): Promise<BuildResult> {
  const editor = await prepareChangelogDashboard(packageId1, packageId2)
  return editor.run()
}

export async function prepareChangelogDashboard(
  packageId1: string,
  packageId2: string,
): Promise<Editor> {
  await publishVersion(packageId1, BEFORE_VERSION_ID, 'v1.yaml')
  await publishVersion(packageId2, AFTER_VERSION_ID, 'v2.yaml')

  const dashboard = LocalRegistry.openPackage(DEFAULT_DASHBOARD_ID)
  await dashboard.publish(DEFAULT_DASHBOARD_ID, {
    packageId: DEFAULT_DASHBOARD_ID,
    version: BEFORE_VERSION_ID,
    apiType: 'rest',
    refs: [
      { refId: packageId1, version: BEFORE_VERSION_ID },
    ],
  })

  await dashboard.publish(DEFAULT_DASHBOARD_ID, {
    packageId: DEFAULT_DASHBOARD_ID,
    version: AFTER_VERSION_ID,
    apiType: 'rest',
    refs: [
      { refId: packageId2, version: AFTER_VERSION_ID },
    ],
  })

  return new Editor(DEFAULT_DASHBOARD_ID, changelogConfig(DEFAULT_DASHBOARD_ID))
}

export async function buildPackageFromSpecYaml(
  packageId: string,
  fileLabels?: Labels,
  versionLabels?: Labels,
  xApiKind?: string,
): Promise<BuildResult> {
  const registry = new LocalRegistry(packageId)
  const file = {
    fileId: 'spec.yaml',
    ...takeIfDefined({ labels: fileLabels }),
    ...takeIfDefined({ xApiKind: xApiKind }),
  }

  await registry.publish(packageId, {
    packageId: packageId,
    version: BEFORE_VERSION_ID,
    metadata: { ...takeIfDefined({ versionLabels: versionLabels }) },
    files: [{ ...file, publish: true }],
  })

  const editor = new Editor(packageId, {
    packageId: packageId,
    version: BEFORE_VERSION_ID,
    status: VERSION_STATUS.RELEASE,
    buildType: BUILD_TYPE.BUILD,
    metadata: { ...takeIfDefined({ versionLabels: versionLabels }) },
    files: [file],
  }, {}, registry)

  return editor.run()
}

export async function buildPackageFromContent(
  packageId: string,
  fileId: string,
  content: string,
  fileLabels?: Labels,
  versionLabels?: Labels,
  xApiKind?: string,
): Promise<BuildResult> {
  const registry = new LocalRegistry(packageId)
  return registry.publishFromContent(
    { [fileId]: content },
    {
      packageId,
      version: BEFORE_VERSION_ID,
      metadata: { ...takeIfDefined({ versionLabels: versionLabels }) },
      files: [{
        fileId,
        publish: true,
        ...takeIfDefined({ labels: fileLabels }),
        ...takeIfDefined({ xApiKind: xApiKind }),
      }],
    },
  )
}

/**
 * Publish `before` as `v1` and `after` as `v2` of the package, as the files `before.<extension>` and
 * `after.<extension>`, and return the registry they went into.
 */
export async function publishChangeFromContent(
  packageId: string,
  { before, after }: DocumentChange,
  { extension = 'yaml' }: { extension?: string } = {},
): Promise<LocalRegistry> {
  const registry = new LocalRegistry(packageId)
  await registry.publishFromContent({ [`before.${extension}`]: before }, {
    packageId,
    version: BEFORE_VERSION_ID,
    files: [{ fileId: `before.${extension}` }],
  })
  await registry.publishFromContent({ [`after.${extension}`]: after }, {
    packageId,
    version: AFTER_VERSION_ID,
    files: [{ fileId: `after.${extension}` }],
  })
  return registry
}

/**
 * Publish the pair as `v1` and `v2` and return the editor for their changelog without running it, for a test that
 * has to reach into the builder or change the run first.
 */
export async function prepareChangelogFromContent(
  packageId: string,
  change: DocumentChange,
  options: { extension?: string } = {},
): Promise<Editor> {
  return changelogEditor(packageId, await publishChangeFromContent(packageId, change, options))
}

/** Publish the pair as `v1` and `v2` and build their changelog. */
export async function buildChangelogFromContent(
  packageId: string,
  change: DocumentChange,
  options: { extension?: string } = {},
): Promise<BuildResult> {
  return (await prepareChangelogFromContent(packageId, change, options)).run()
}

// an editor over the contents it was given and nothing else: an edit made through `update*File` wins over the
// original, a listed or edited file id outside the contents throws, and any other lookup, such as a `$ref` to a
// file it was not given, resolves to nothing so the build reports it as it would a missing file
class ContentEditor extends Editor {
  constructor(config: BuildConfig, private readonly contents: Record<string, string>, registry?: IRegistry) {
    super(config.packageId, config, {}, registry)
  }

  protected override async assertListedFilesExist(files: BuildConfigFile[]): Promise<void> {
    for (const { fileId } of files) { this.contentOf(fileId) }
  }

  // `force` is how `update*File` asks: a file it cannot find is a mistake in the test, not a missing reference
  protected override async fileResolver(fileId: string, force = false): Promise<Blob | null> {
    const edited = this.state.get(fileId)
    if (edited) { return edited }
    if (!force && !(fileId in this.contents)) { return null }
    return new File([this.contentOf(fileId)], fileId, { type: 'application/yaml' })
  }

  private contentOf(fileId: string): string {
    if (!(fileId in this.contents)) {
      const given = Object.keys(this.contents)
      throw new Error(`The content editor has no file '${fileId}'; it has ${given.length ? given.join(', ') : 'none'}`)
    }
    return this.contents[fileId]
  }
}

/**
 * Create an editor that builds `contents` instead of a fixture folder. Its `files` are the keys of `contents`; a
 * file id outside them, listed for a run or an update or edited through `update*File`, throws instead of being read
 * from disk.
 * `status` and `buildType` may be left out and given to `run`, as the fixture-folder editors do.
 */
export const contentEditor = (
  config: Omit<Partial<BuildConfig>, 'files'> & Pick<BuildConfig, 'packageId' | 'version'>,
  contents: Record<string, string>,
  registry?: IRegistry,
): Editor => new ContentEditor(
  { ...config, files: Object.keys(contents).map(fileId => ({ fileId })) } as BuildConfig,
  contents,
  registry,
)

export async function buildWithApiProcessorVersionOverrides(
  packageId: string,
  overrides: Record<string, string>,
  {
    validationLevel = VERSION_VALIDATION_LEVEL.MAJOR,
    buildType = BUILD_TYPE.CHANGELOG,
    status = VERSION_STATUS.RELEASE,
  }: {
    validationLevel?: VersionValidationLevel
    buildType?: BuildType
    status?: VersionStatus
  } = {},
): Promise<BuildResult> {
  const registry = new VersionOverrideRegistry(packageId)
  for (const [version, value] of Object.entries(overrides)) {
    registry.overrideApiProcessorVersion(version, value)
  }

  await registry.publishFromContent(
    { 'spec.json': ANY_REST_SPEC },
    { packageId, version: BEFORE_VERSION_ID, files: [{ fileId: 'spec.json', publish: true }] },
  )
  await registry.publishFromContent(
    { 'spec.json': ANY_REST_SPEC },
    { packageId, version: AFTER_VERSION_ID, files: [{ fileId: 'spec.json' }] },
  )

  const config: BuildConfig = {
    version: AFTER_VERSION_ID,
    packageId,
    previousVersionPackageId: packageId,
    previousVersion: BEFORE_VERSION_ID,
    buildType,
    status,
    // a changelog config carries no files, a build config lists what it publishes
    ...buildType === BUILD_TYPE.BUILD ? { files: [{ fileId: 'spec.json' }] } : {},
  }

  const builder = new PackageVersionBuilder(config, {
    resolvers: {
      // a changelog reads no source files; a build reads the same spec the version was published from
      fileResolver: (fileId) => Promise.resolve(
        fileId === 'spec.json' ? new File([ANY_REST_SPEC], fileId, { type: 'application/json' }) : null,
      ),
      ...registry.versionResolvers,
    },
  })
  return builder.run({ apiProcessorVersionValidationLevel: validationLevel })
}

/** What a file is published as: the type of its document, and whether the document is flagged as errored. */
export interface PublishedDocumentType {
  type: string
  errored: boolean
}

/** One file and what it is expected to be published as. */
export interface DocumentTypeCase extends PublishedDocumentType {
  // unique within its test file: the package id is derived from it
  name: string
  fileId: string
  content: string
  // whatever the build config has to say about the file beyond its id
  fileConfig?: Record<string, unknown>
}

/**
 * Publish the file of a case alone, as a draft, and read its type and error flag from `documents.json` — the
 * entry the backend consumes.
 *
 * The type decides where a client shows the document and which API type the backend flags, so a broken file
 * published as `unknown` drops out of its own API.
 *
 * `subject` and the case name make the package id, so `subject` has to differ between test files.
 */
export async function publishDocumentTypeCase(
  subject: string,
  { name, fileId, content, fileConfig }: DocumentTypeCase,
): Promise<PublishedDocumentType> {
  const packageId = `document-type/${subject}/${name.replace(/\W+/g, '-')}`
  await new LocalRegistry(packageId).publishFromContent(
    { [fileId]: content },
    { packageId, version: BEFORE_VERSION_ID, status: VERSION_STATUS.DRAFT, files: [{ fileId, ...fileConfig }] },
  )

  const { documents } = await loadJsonFromRegistry<{ documents: Array<{ type: string; hasErrors?: boolean }> }>(
    VERSIONS_PATH, `${packageId}/${BEFORE_VERSION_ID}`, 'documents.json',
  )
  const [entry] = documents
  return { type: entry.type, errored: entry.hasErrors === true }
}
