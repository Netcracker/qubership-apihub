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

export function logLongBuild(build: () => void, prefix?: string): void {
  performance.measure(MEASURE_NAME_LONG_BUILD)
  performance.mark(START_MEASURE_MARK)
  build()

  performance.mark(END_MEASURE_MARK)
  const performanceResult = performance.measure(MEASURE_NAME_LONG_BUILD, START_MEASURE_MARK, END_MEASURE_MARK)
  if (performanceResult.duration > BAD_PERFORMANCE_POINT) {
    console.log(`[BUILDER LONG BUILD] ${prefix} ${performanceResult.duration} ms`)
  }
  performance.clearMeasures(MEASURE_NAME_LONG_BUILD)
}

const MEASURE_NAME_LONG_BUILD = 'long-build-measure'
const MEASURE_NAME_PERFORMANCE = 'performance-measure'
const START_MEASURE_MARK = 'start-mark'
const END_MEASURE_MARK = 'end-mark'
const BAD_PERFORMANCE_POINT = 10000

export interface DebugPerformanceContext {
  prefix: string
}

export async function asyncDebugPerformance<T>(
  id: string,
  execute: (context: DebugPerformanceContext) => Promise<T>,
  previousContext?: DebugPerformanceContext, // required because it's can run some promises under single context
  parameters?: string[],
): Promise<T> {
  const [measureId, startMark, endMark] = getMeasurePerformanceNames(id)
  const context = createDebugContext(id, parameters, previousContext)

  performance.measure(measureId)
  performance.mark(startMark)
  try {
    return await execute(context)
  } finally {
    performance.mark(endMark)
    const performanceResult = performance.measure(measureId, startMark, endMark)
    console.debug(context?.prefix + performanceResult.duration)
    performance.clearMeasures(measureId)
  }

}

export function syncDebugPerformance<T>(
  id: string,
  execute: (context: DebugPerformanceContext) => T,
  previousContext?: DebugPerformanceContext, // required because it's can run some promises under single context
  parameters?: string[],
): T {
  const [measureId, startMark, endMark] = getMeasurePerformanceNames(id)
  const context = createDebugContext(id, parameters, previousContext)

  performance.measure(measureId)
  performance.mark(startMark)
  try {
    return execute(context)
  } finally {
    performance.mark(endMark)
    const performanceResult = performance.measure(measureId, startMark, endMark)
    console.debug(context?.prefix + performanceResult.duration)
    performance.clearMeasures(measureId)
  }
}

function getMeasurePerformanceNames(id: string): [string, string, string] {
  return [
    `${id}-${MEASURE_NAME_PERFORMANCE}`,
    `${id}-${START_MEASURE_MARK}`,
    `${id}-${END_MEASURE_MARK}`,
  ]
}

function createDebugContext(id: string, parameters?: string[], previousContext?: DebugPerformanceContext): DebugPerformanceContext {
  const parametersString = parameters ? `${parameters.join('|')}|` : ''
  return {
    prefix: `${previousContext?.prefix ?? ''}${id}|${parametersString}`,
  }
}
