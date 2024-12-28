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

import { BuildConfig, BuilderStrategy, BuildResult, BuildTypeContexts } from './types'
import { DebugPerformanceContext } from './utils/logs'

export class BuilderStrategyContext {
  constructor(
    public strategy: BuilderStrategy,
    public config: BuildConfig,
    public buildResult: BuildResult,
    public contexts: BuildTypeContexts,
  ) {/* do nothing */}

  setStrategy(strategy: BuilderStrategy): void {
    this.strategy = strategy
  }

  async executeStrategy(debugContext?: DebugPerformanceContext): Promise<BuildResult> {
    return this.strategy.execute(this.config, this.buildResult, this.contexts, debugContext)
  }
}
