import { Diff, DiffAction, DiffType } from '@netcracker/qubership-apihub-api-diff'
import { DiffsClassesBuilder } from '@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities'
import {
  ChangedPropertyMetaData,
  DIFF_HIGHLIGHTING_MODES_DDL_TITLE_ROW,
  DiffStyles,
  HighlightVariant,
} from '@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import { JavaApiCompatibility } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/node-value'

export type JavaApiRowDiff = {
  // the row background: green for a new element, red for a removed one, yellow for a changed one
  diff: ChangedPropertyMetaData
  // the colored line on the left, by the severity of the change
  diffType: DiffType
}

type DiffActionValue = typeof DiffAction[keyof typeof DiffAction]

const STATUS_ACTIONS: Readonly<Record<string, DiffActionValue>> = {
  NEW: DiffAction.add,
  REMOVED: DiffAction.remove,
  MODIFIED: DiffAction.replace,
}

const ACTION_BACKGROUNDS: Readonly<Record<DiffActionValue, HighlightVariant>> = {
  [DiffAction.add]: HighlightVariant.Green,
  [DiffAction.remove]: HighlightVariant.Red,
  [DiffAction.replace]: HighlightVariant.Yellow,
  [DiffAction.rename]: HighlightVariant.Yellow,
}

/**
 * Builds the DDL-style highlighting of a changed jdiff element for a one-sided document layout.
 * jdiff carries no before and after values, so the diff holds only the action and the severity.
 *
 * @returns undefined for an unchanged element, including every element of an api-report
 */
export function buildJavaApiRowDiff(compatibility: JavaApiCompatibility | undefined): JavaApiRowDiff | undefined {
  if (!compatibility?.severity) {
    return undefined
  }
  const action = STATUS_ACTIONS[compatibility.status]
  if (!action) {
    return undefined
  }
  const diffType: DiffType = compatibility.severity
  const styles: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
    backgroundColor: ACTION_BACKGROUNDS[action],
  }
  return {
    diff: {
      // jdiff rows have no before/after values, so only action and severity are available.
      data: { action, type: diffType } as Diff<DiffType>,
      styles: { before: styles, after: styles },
      flags: { before: { increaseLevel: false }, after: { increaseLevel: false } },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DDL_TITLE_ROW,
    },
    diffType,
  }
}

// the row background class for a one-sided document layout, empty for an unchanged element
export function javaApiRowBackgroundClass(rowDiff: JavaApiRowDiff | undefined): string {
  return rowDiff ? DiffsClassesBuilder.background(rowDiff.diff.styles.after.backgroundColor) : ''
}
