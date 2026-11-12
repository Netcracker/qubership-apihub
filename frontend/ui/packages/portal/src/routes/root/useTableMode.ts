import { useViewSearchParam } from './useViewSearchParam'

export function useTableMode(defaultMode: TableMode): [TableMode, SetTablePageMode] {
  const [view, setViewSearchParam] = useViewSearchParam()

  return [
    TABLE_MODES.includes(view as TableMode) ? view as TableMode : defaultMode,
    setViewSearchParam,
  ]
}

type SetTablePageMode = (mode: TableMode) => void

export const TREE_TABLE_MODE = 'tree'
export const FLAT_TABLE_MODE = 'flat'

export const TABLE_MODES = [TREE_TABLE_MODE, FLAT_TABLE_MODE] as const

export type TableMode = typeof TABLE_MODES[number]
