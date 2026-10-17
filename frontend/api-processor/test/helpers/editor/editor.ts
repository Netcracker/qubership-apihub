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

import { stringifyYaml } from '../../../src/processor'

import {
  BuildConfig,
  BuildConfigAggregator,
  BuildConfigFile,
  BuilderConfiguration,
  BuilderRunOptions,
  BuildResult,
  PackageVersionBuilder,
} from '../../../src/processor'
import { assertFixtureFilesExist, loadConfig, loadFile } from '../files'
import { LocalRegistry } from '../registry'
import { IRegistry } from '../registry/types'
import fs from 'fs/promises'
import path from 'path'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

export class Editor {
  protected state: Map<string, Blob | null> = new Map()
  builder: PackageVersionBuilder
  private registry: IRegistry
  private projectsDir: string

  // A fixture folder need not carry a config.json, and most do not. The caller passes what the missing
  // file would have named to `publish` or `run` — `files` above all.
  static async openProject(projectId: string, registry?: IRegistry, configuration?: BuilderConfiguration, projectsDir: string = 'test/projects'): Promise<Editor> {
    const config = await loadConfig(projectsDir, projectId)
    const defaults: Pick<BuildConfig, 'packageId' | 'version' | 'files'> = { packageId: projectId, version: 'v100', files: [] }
    // No config.json carries `status` or `buildType`; `run` supplies them.
    return new Editor(projectId, { ...defaults, ...config } as BuildConfig, configuration ?? {}, registry, projectsDir)
  }

  constructor(
    private projectId: string,
    public config: BuildConfig,
    configuration?: BuilderConfiguration,
    registry?: IRegistry,
    projectsDir: string = 'test/projects',
  ) {
    this.registry = registry || LocalRegistry.openPackage(config.packageId, {}, projectsDir)
    this.projectsDir = projectsDir
    this.builder = new PackageVersionBuilder(config, {
      resolvers: {
        fileResolver: this.fileResolver.bind(this),
        templateResolver: this.templateResolver.bind(this),
        ...this.registry.versionResolvers,
      },
      configuration: {
        ...configuration,
      },
    })
  }

  protected async fileResolver(fileId: string, force = false): Promise<Blob | null> {
    let data = this.state.get(fileId)
    if (!data) {
      const fileExistInConfig = force || this.config.files?.find(file => file.fileId === fileId)
      try {
        data = fileExistInConfig && await loadFile(this.projectsDir, this.projectId, fileId)
      } catch (e) {
        throw new Error(`Error while resolving: ${e}`)
      }
      data && this.state.set(fileId, data)
    }

    return data || null
  }

  private async templateResolver(templatePath: string): Promise<Blob | null> {
    const template = await fs.readFile(path.join(__dirname, '..', '..', 'templates', templatePath))
    if (!template) {
      throw new Error(`Error during reading file ${templatePath} from templates`)
    }

    return new Blob([template])
  }

  private async updateTextFile(fileId: string, modifier: (data: string) => string): Promise<void> {
    const data = await this.fileResolver(fileId, true)
    if (!data) {
      throw new Error(`Cannot resolve file with fileId = ${fileId}`)
    }
    this.state.set(fileId, new Blob([modifier(await data.text())], { type: data.type }))
  }

  // `any` in both modifiers: callers edit a spec by path (`config.test.ts`, `builders.test.ts`), which a narrower
  // type would make them cast first
  async updateJsonFile(fileId: string, modifier: (obj: any) => any): Promise<void> {
    return this.updateTextFile(fileId, (data: string) => {
      const parsedData = JSON.parse(data)
      return JSON.stringify(modifier(parsedData), null, 2)
    })
  }

  async updateYamlFile(fileId: string, modifier: (obj: any) => any): Promise<void> {
    return this.updateTextFile(fileId, (data: string) => {
      const parsedData = loadYaml(data)
      return stringifyYaml(modifier(parsedData))
    })
  }

  async run(config: Partial<BuildConfigAggregator> = {}): Promise<BuildResult> {
    const merged = { ...this.builder.config, ...config }
    await this.assertListedFilesExist(merged.files ?? [])
    this.builder.config = merged
    this.config = merged
    return await this.builder.run()
  }

  async createVersionPackage(): Promise<Buffer> {
    return this.builder.createVersionPackage()
  }

  async createNodeVersionPackage(): Promise<{ packageVersion: Buffer; exportFileName?: string }> {
    return this.builder.createNodeVersionPackage()
  }

  async update(update: Partial<BuildConfig>, changedFiles: string | string[], options?: BuilderRunOptions | undefined): Promise<BuildResult> {
    const config = { ...this.builder.config, ...update }
    await this.assertListedFilesExist(config.files ?? [])
    // `fileResolver` reads only what `this.config` lists, so a file the update adds must be listed there too
    this.config = config
    return this.builder.update(config, Array.isArray(changedFiles) ? changedFiles : [changedFiles], options)
  }

  protected async assertListedFilesExist(files: BuildConfigFile[]): Promise<void> {
    await assertFixtureFilesExist(this.projectsDir, this.projectId, files.map(({ fileId }) => fileId))
  }
}
