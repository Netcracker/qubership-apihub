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

import { useEffect, useMemo, useState } from 'react'
import type { ColumnSizingInfoState } from '@tanstack/react-table'

export type ColumnModel = {
  name: string
  fixedWidth?: number
  width?: number
  percentage?: number
  minWidth?: number
  loadable?: boolean
}

export const DEFAULT_CONTAINER_WIDTH = 800

const DEFAULT_MIN_COLUMN_SIZE = 100
let MIN_COLUMN_SIZE: number

function pixelColumnWidth(model: ColumnModel): number {
  return model.fixedWidth ?? model.width ?? 0
}

function minColumnSize(model: ColumnModel): number {
  return model.minWidth ?? MIN_COLUMN_SIZE
}

function reservedColumnWidth(model: ColumnModel, availableWidth: number): number | undefined {
  if (model.fixedWidth !== undefined) {
    return model.fixedWidth
  }
  if (model.percentage !== undefined) {
    return Math.max(Math.floor(availableWidth * model.percentage), model.minWidth ?? 0)
  }
  return model.width
}

function useDefaultColumnsSizing(containerWidth: number, columnModels: ColumnModel[]): Record<string, number> {
  return useMemo(() => {
    const pixelWidth = columnModels.reduce((result, current) => result + pixelColumnWidth(current), 0)
    const availableWidth = Math.max(containerWidth - pixelWidth, 0)

    const reservedWidths = columnModels.map(model => reservedColumnWidth(model, availableWidth))
    const flexibleColumnCount = reservedWidths.filter(width => width === undefined).length
    const reservedWidth = reservedWidths.reduce<number>((result, current) => result + (current ?? 0), 0)
    const columnWidth = flexibleColumnCount
      ? Math.floor((containerWidth - reservedWidth) / flexibleColumnCount)
      : 0
    return columnModels.reduce<Record<string, number>>((result, current, index) => {
      result[current.name] = reservedWidths[index] ?? columnWidth
      return result
    }, {})
  }, [containerWidth, columnModels])
}

function calculateColumnLength(
  models: ColumnModel[],
  columns: Set<string>,
  selectedColumn: string,
  values: Record<string, number>,
  delta: number,
  negativeDelta: number,
): Record<string, number> {
  return models.reduce<Record<string, number>>((result, current) => {
    if (current.name === selectedColumn) {
      result[current.name] = Math.floor(values[current.name] + delta)
    } else if (columns.has(current.name)) {
      result[current.name] = Math.floor(values[current.name] + negativeDelta)
    } else {
      result[current.name] = Math.floor(values[current.name])
    }
    return result
  }, {})
}

function handleIncreaseColumn(
  selectedColumn: string,
  delta: number,
  models: ColumnModel[],
  values: Record<string, number>,
  containerWidth: number,
): Record<string, number> | null {
  const unselectedColumns = models.filter(model => model.name !== selectedColumn && !model.fixedWidth)
  //TODO research this case
  const shrinkableColumns = unselectedColumns.filter(model => Math.floor(values[model.name] - (delta / unselectedColumns.length)) > minColumnSize(model))
  const fixedColumnsWidth = models.reduce((result, current) => result + pixelColumnWidth(current), 0)
  const unselectedMinWidth = unselectedColumns.reduce((result, current) => result + minColumnSize(current), 0)
  const maxNotReached = values[selectedColumn] + delta < (containerWidth - unselectedMinWidth - fixedColumnsWidth)
  if (shrinkableColumns.length && maxNotReached) {
    const negativeDelta = -delta / shrinkableColumns.length
    const shrinkableColumnsNames = new Set(shrinkableColumns.map(model => model.name))
    return calculateColumnLength(models, shrinkableColumnsNames, selectedColumn, values, delta, negativeDelta)
  }
  return null
}

function handleDecreaseColumn(
  selectedColumn: string,
  delta: number,
  models: ColumnModel[],
  values: Record<string, number>,
): Record<string, number> | null {
  const growColumns = models.filter(model => model.name !== selectedColumn && !model.fixedWidth)
  const selectedModel = models.find(model => model.name === selectedColumn)
  const minNotReached = values[selectedColumn] + delta > (selectedModel ? minColumnSize(selectedModel) : MIN_COLUMN_SIZE)
  if (growColumns.length && minNotReached) {
    const negativeDelta = -delta / growColumns.length
    const growColumnsNames = new Set(growColumns.map(model => model.name))
    return calculateColumnLength(models, growColumnsNames, selectedColumn, values, delta, negativeDelta)
  }
  return null
}

export function useColumnsSizing(options: {
  containerWidth: number
  columnModels: ColumnModel[]
  columnSizingInfo: ColumnSizingInfoState | undefined
  defaultMinColumnSize?: number
}): Record<string, number> {
  const {
    containerWidth,
    columnModels,
    columnSizingInfo,
    defaultMinColumnSize = DEFAULT_MIN_COLUMN_SIZE,
  } = options
  MIN_COLUMN_SIZE = defaultMinColumnSize // TODO 26.07.23 // Try to do it in better way
  const defaultColumnsSizing = useDefaultColumnsSizing(containerWidth, columnModels)
  const currentColumnSizingInfo = useMemo<{ name: string; delta: number; isResizing: boolean }>(() => {
    return {
      name: columnSizingInfo?.isResizingColumn || '',
      delta: columnSizingInfo?.deltaOffset || 0,
      isResizing: !!columnSizingInfo?.isResizingColumn,
    }
  }, [columnSizingInfo])

  const [baseColumnSizing, setBaseColumnSizing] = useState(defaultColumnsSizing)
  const [actualColumnSizing, setActualColumnSizing] = useState(defaultColumnsSizing)

  useEffect(() => {
    setBaseColumnSizing(defaultColumnsSizing)
    setActualColumnSizing(defaultColumnsSizing)
  }, [defaultColumnsSizing])

  useEffect(() => {
    if (currentColumnSizingInfo.isResizing) {
      const { delta, name } = currentColumnSizingInfo
      const selectedColumn = columnModels.find(model => model.name === name)
      if (!selectedColumn?.fixedWidth) {
        const handlingResult = delta >= 0
          ? handleIncreaseColumn(name, delta, columnModels, baseColumnSizing, containerWidth)
          : handleDecreaseColumn(name, delta, columnModels, baseColumnSizing)
        if (handlingResult) {
          setActualColumnSizing(handlingResult)
        }
      }
    }
  }, [containerWidth, columnModels, currentColumnSizingInfo, baseColumnSizing, setActualColumnSizing])

  useEffect(() => {
    if (!currentColumnSizingInfo.isResizing) {
      setBaseColumnSizing(actualColumnSizing)
    }
  }, [currentColumnSizingInfo, actualColumnSizing, setBaseColumnSizing])

  return actualColumnSizing
}
