import { BuildResult } from './builder'
import { BuildConfig, BuildConfigBase } from '../external'
import { BuilderContext } from './apiBuilder'
import { CompareContext } from './compare'

export type BuildTypeContexts = {
  builderContext: (config: BuildConfigBase) => BuilderContext
  compareContext: (config: BuildConfig) => CompareContext
}

export interface BuilderStrategy {
  execute(
    config: BuildConfigBase,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<BuildResult>
}
