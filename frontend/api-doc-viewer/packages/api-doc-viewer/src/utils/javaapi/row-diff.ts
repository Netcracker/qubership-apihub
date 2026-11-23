import { DiffsClassesBuilder } from '@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities'
import {
  type JavaApiRowDiff,
  JavaApiRowDiffs,
} from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/row-diffs'

export type { JavaApiRowDiff } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/row-diffs'

export const buildJavaApiRowDiff = JavaApiRowDiffs.takeRowDiff

// the row background class for a one-sided document layout, empty for an unchanged element
export function javaApiRowBackgroundClass(rowDiff: JavaApiRowDiff | undefined): string {
  return rowDiff ? DiffsClassesBuilder.background(rowDiff.diff.styles.after.backgroundColor) : ''
}
