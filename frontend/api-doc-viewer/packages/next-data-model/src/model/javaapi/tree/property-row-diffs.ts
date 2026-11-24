import { type Diff, DiffAction, type DiffType } from '@netcracker/qubership-apihub-api-diff'

import { JdiffStatuses } from '../../../shared/javaapi/types/jdiff-status'
import {
  type ChangedPropertyMetaData,
  DIFF_HIGHLIGHTING_MODES_TITLE_ROW,
  type DiffStyles,
  HighlightVariant,
} from '../../abstract/tree-with-diffs/tree-node.interface'
import type { JavaApiTreeNode } from '../types/aliases'

export type JavaApiRowDiff = {
  diff: ChangedPropertyMetaData
  diffType: DiffType
}

type DiffActionValue = typeof DiffAction[keyof typeof DiffAction]

const STATUS_ACTIONS: Readonly<Record<string, DiffActionValue>> = {
  [JdiffStatuses.NEW]: DiffAction.add,
  [JdiffStatuses.REMOVED]: DiffAction.remove,
  [JdiffStatuses.MODIFIED]: DiffAction.replace,
  [JdiffStatuses.UNCHANGED]: DiffAction.replace,
}

const ACTION_BACKGROUNDS: Readonly<Record<DiffActionValue, HighlightVariant>> = {
  [DiffAction.add]: HighlightVariant.Green,
  [DiffAction.remove]: HighlightVariant.Red,
  [DiffAction.replace]: HighlightVariant.Yellow,
  [DiffAction.rename]: HighlightVariant.Yellow,
}

export class JavaApiRowDiffs {
  public static takeRowDiff(node: JavaApiTreeNode): JavaApiRowDiff | undefined {
    const value = node.value()
    const compatibility = value && 'compatibility' in value ? value.compatibility : undefined
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
        // jdiff has no before/after values or declaration paths, which Diff requires: only action and severity.
        data: { action, type: diffType } as Diff<DiffType>,
        styles: { before: styles, after: styles },
        flags: { before: { increaseLevel: false }, after: { increaseLevel: false } },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_TITLE_ROW,
      },
      diffType,
    }
  }
}
