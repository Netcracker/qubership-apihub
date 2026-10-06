import { ShowUnchangedRow } from "@apihub/components/shared-components/ShowUnchangedRow/ShowUnchangedRow"
import { resolveJsonSchemaUnchangedBlocks } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree-with-diffs/changed-only"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { FC, Fragment, useMemo } from "react"
import { PrecededBy } from "../../shared-components/WithPrecededByProps"
import { JsonSchemaNodeViewerWithDiffs } from "../JsonSchemaNodeViewerWithDiffs"
import { useUnchangedBlocksContext } from "../UnchangedBlocksContext"

export type SchemaNodeChildrenListWithDiffsProps = {
  children: readonly JsonSchemaTreeNodeWithDiffs[]
}

export const SchemaNodeChildrenListWithDiffs: FC<SchemaNodeChildrenListWithDiffsProps> = (props) => {
  const { children } = props
  const { hideUnchangedNodes, revealedBlockIds, revealBlock } = useUnchangedBlocksContext()

  const { visibleSequence } = useMemo(
    () => resolveJsonSchemaUnchangedBlocks(children, { hideUnchangedNodes }),
    [children, hideUnchangedNodes],
  )

  return (
    <>
      {visibleSequence.map((item, visibleIndex) => {
        const isLastInList = visibleIndex === visibleSequence.length - 1
        if (item.kind === "placeholder") {
          if (revealedBlockIds.has(item.unchangedBlockId)) {
            return (
              <Fragment key={item.unchangedBlockId}>
                {children
                  .slice(item.sourceIndex, item.sourceIndex + item.blockSize)
                  .map((blockChild, blockChildIndex) => (
                    <JsonSchemaNodeViewerWithDiffs
                      key={blockChild.id}
                      data-precededby={PrecededBy.JSON_SCHEMA_PROPERTY}
                      node={blockChild}
                      isLastInList={isLastInList && blockChildIndex === item.blockSize - 1}
                    />
                  ))}
              </Fragment>
            )
          }

          return (
            <ShowUnchangedRow
              key={item.unchangedBlockId}
              unchangedBlockId={item.unchangedBlockId}
              count={item.blockSize}
              onReveal={revealBlock}
            />
          )
        }

        return (
          <JsonSchemaNodeViewerWithDiffs
            key={item.node.id}
            data-precededby={PrecededBy.JSON_SCHEMA_PROPERTY}
            node={item.node}
            isLastInList={isLastInList}
          />
        )
      })}
    </>
  )
}
