import type { OperationViewMode } from '../../entities/operation-view-mode'
import {
  DOC_OPERATION_VIEW_MODE,
  GRAPH_VIEW_MODE,
  RAW_OPERATION_VIEW_MODE,
  SIMPLE_OPERATION_VIEW_MODE,
} from '../../entities/operation-view-mode'

export function useIsDocOperationViewMode(mode: OperationViewMode): boolean {
  return mode === DOC_OPERATION_VIEW_MODE || mode === SIMPLE_OPERATION_VIEW_MODE
}

export function useIsRawOperationViewMode(mode: OperationViewMode): boolean {
  return mode === RAW_OPERATION_VIEW_MODE
}

export function useIsGraphOperationViewMode(mode: OperationViewMode): boolean {
  return mode === GRAPH_VIEW_MODE
}
