import { resolveJsoUnchangedBlocks } from "@netcracker/qubership-apihub-next-data-model/building-service/jso/tree-with-diffs/changed-only"
import { JsoTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/jso/types/aliases"
import { FC, Fragment, useMemo } from "react"
import { ShowUnchangedRow } from "../shared-components/ShowUnchangedRow/ShowUnchangedRow"
import { useUnchangedBlocksContext } from "../shared-components/ShowUnchangedRow/UnchangedBlocksContext"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { JsoPropertyNodeViewerWithDiffs } from "./JsoPropertyNodeViewerWithDiffs"

type JsoPropertyChildrenListWithDiffsProps = {
  properties: readonly JsoTreeNodeWithDiffs[]
  supportJsonSchema: boolean
  /** `data-precededby` of the first visible row (the viewer's own one at the top level); every
   * other row is preceded by a JSO property. */
  firstRowPrecededBy: PrecededBy | undefined
}

/**
 * One sibling list of JSO properties: with `hideUnchangedNodes`, each run of unchanged properties
 * is one `ShowUnchangedRow` until revealed (see docs/design/jso/features/hiding-unchanged-nodes.md).
 */
export const JsoPropertyChildrenListWithDiffs: FC<JsoPropertyChildrenListWithDiffsProps> = (props) => {
  const { properties, supportJsonSchema, firstRowPrecededBy } = props
  const { hideUnchangedNodes, revealedBlockIds, revealBlock } = useUnchangedBlocksContext()

  const { visibleSequence } = useMemo(
    () => resolveJsoUnchangedBlocks(properties, hideUnchangedNodes),
    [properties, hideUnchangedNodes],
  )

  const precededByAt = (visibleIndex: number): PrecededBy | undefined =>
    visibleIndex === 0 ? firstRowPrecededBy : PrecededBy.JSO_PROPERTY

  return (
    <>
      {visibleSequence.map((item, visibleIndex) => {
        if (item.kind === "node") {
          return (
            <JsoPropertyNodeViewerWithDiffs
              key={item.node.id}
              data-precededby={precededByAt(visibleIndex)}
              node={item.node}
              supportJsonSchema={supportJsonSchema}
            />
          )
        }

        if (revealedBlockIds.has(item.unchangedBlockId)) {
          return (
            <Fragment key={item.unchangedBlockId}>
              {properties
                .slice(item.sourceIndex, item.sourceIndex + item.blockSize)
                .map((property, blockIndex) => (
                  <JsoPropertyNodeViewerWithDiffs
                    key={property.id}
                    data-precededby={blockIndex === 0 ? precededByAt(visibleIndex) : PrecededBy.JSO_PROPERTY}
                    node={property}
                    supportJsonSchema={supportJsonSchema}
                  />
                ))}
            </Fragment>
          )
        }

        return (
          <ShowUnchangedRow
            key={item.unchangedBlockId}
            data-precededby={precededByAt(visibleIndex)}
            unchangedBlockId={item.unchangedBlockId}
            count={item.blockSize}
            onReveal={revealBlock}
          />
        )
      })}
    </>
  )
}
