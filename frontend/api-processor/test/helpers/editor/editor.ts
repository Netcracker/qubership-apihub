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

import * as YAML from 'js-yaml'

import {
  BuildConfig,
  BuildConfigAggregator,
  BuilderConfiguration,
  BuilderRunOptions,
  BuildResult,
  PackageVersionBuilder,
} from '../../../src'
import { loadConfig, loadFile } from '../utils'
import { LocalRegistry } from '../registry'
import { IRegistry } from '../registry/types'
import fs from 'fs/promises'
import path from 'path'

export class Editor {
  state: Map<string, Blob | null> = new Map()
  builder: PackageVersionBuilder
  registry: IRegistry
  projectsDir: string

  static async openProject(projectId: string, registry?: IRegistry, configuration?: BuilderConfiguration, projectsDir: string = 'test/projects'): Promise<Editor> {
    const config = await loadConfig(projectsDir, projectId) as BuildConfig
    config.version = config?.version ?? 'v100'
    config.files = config?.files ?? []
    return new Editor(projectId, config, configuration ?? {}, registry)
  }

  static async createProject(projectId: string, config: BuildConfig, registry?: IRegistry): Promise<Editor> {
    config.files = config.files ?? []
    return new Editor(projectId, config, registry)
  }

  constructor(
    public projectId: string,
    public config: BuildConfig,
    configuration?: any,
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

  async fileResolver(fileId: string, force = false): Promise<Blob | null> {
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

  async templateResolver(templatePath: string): Promise<Blob | null> {
    const template = await fs.readFile(path.join(__dirname, '..', '..', '..', 'templates', templatePath))
    if (!template) {
      throw new Error(`Error during reading file ${templatePath} from templates`)
    }

    return new Blob([template])
  }

  async updateTextFile(fileId: string, modifier: (data: string) => string): Promise<void> {
    const data = await this.fileResolver(fileId, true)
    if (!data) {
      throw new Error(`Cannot resolve file with fileId = ${fileId}`)
    }
    this.state.set(fileId, new Blob([modifier(await data.text())], { type: data.type }))
  }

  async updateJsonFile(fileId: string, modifier: (obj: any) => any): Promise<void> {
    return this.updateTextFile(fileId, (data: string) => {
      const parsedData = JSON.parse(data)
      return JSON.stringify(modifier(parsedData), null, 2)
    })
  }

  async updateYamlFile(fileId: string, modifier: (obj: any) => any): Promise<void> {
    return this.updateTextFile(fileId, (data: string) => {
      const parsedData = YAML.load(data)
      return YAML.dump(modifier(parsedData))
    })
  }

  async run(config: Partial<BuildConfigAggregator> = {}): Promise<BuildResult> {
    this.builder.config = { ...this.builder.config, ...config }
    this.config = this.builder.config
    return this.builder.run()
  }

  async createVersionPackage(): Promise<any> {
    return this.builder.createVersionPackage()
  }

  async createNodeVersionPackage(): Promise<{ packageVersion: any; exportFileName?: string }> {
    return this.builder.createNodeVersionPackage()
  }

  async update(update: Partial<BuildConfig>, changedFiles: string | string[], options?: BuilderRunOptions | undefined): Promise<BuildResult> {
    return this.builder.update({ ...this.builder.config, ...update }, Array.isArray(changedFiles) ? changedFiles : [changedFiles], options)
  }
}
