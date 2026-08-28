import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { buildRowDiffProps, toNodeDiffState } from "@apihub/components/shared-components/diffs/node-diff-props"
import { getIndexChildNodes, isIndexNodeWithDiffs, isIndexesNodeWithDiffs } from "@apihub/utils/ddlapi/node-type-checkers"
import { DdlApiSectionHeaderRowValue } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value"
import { isDdlPropertyListSectionUniformWholeNodeChange } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiTreeNode, DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { FC, useMemo } from "react"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps, TitleRowUsage } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { IndexNodeViewer } from "./IndexNodeViewer"
import { IndexNodeViewerWithDiffs } from "./IndexNodeViewerWithDiffs"

type IndexesNodeViewerProps = WithPrecededByProps & {
  node:
    | DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEXES>
    | DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEXES>
}

type IndexViewerContext = {
  indexNode: ReturnType<typeof getIndexChildNodes>[number]
  titlePrecededBy: PrecededBy
  isLastInList: boolean
}

function buildIndexViewerContexts(
  indexNodes: ReturnType<typeof getIndexChildNodes>,
): IndexViewerContext[] {
  return indexNodes.map((indexNode, index) => ({
    indexNode,
    titlePrecededBy: PrecededBy.DDL_INDEX_ROW,
    isLastInList: index === indexNodes.length - 1,
  }))
}

export const IndexesNodeViewer: FC<IndexesNodeViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  if (isIndexesNodeWithDiffs(node)) {
    return (
      <IndexesNodeWithDiffsViewer
        data-precededby={precededBy}
        node={node}
      />
    )
  }

  return (
    <IndexesNodePlainViewer
      data-precededby={precededBy}
      node={node}
    />
  )
}

type IndexesNodePlainViewerProps = WithPrecededByProps & {
  node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEXES>
}

const IndexesNodePlainViewer: FC<IndexesNodePlainViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const level = useLevelContext()
  const value = node.value()
  const indexNodes = getIndexChildNodes(node.childrenNodes())

  const indexViewerContexts = useMemo(
    () => buildIndexViewerContexts(indexNodes),
    [indexNodes],
  )

  if (indexNodes.length === 0) {
    return null
  }

  return (
    <div data-testid="ddl-indexes-node-viewer" className="flex flex-col">
      <TitleRow
        data-precededby={precededBy}
        value={value?.title ?? 'Indexes'}
        expandable={false}
        expanded={true}
        variant={TextValueVariant.h2}
        usage={TitleRowUsage.DdlApiSection}
      />
      <LevelContext.Provider value={level + 1}>
        {indexViewerContexts.map(({ indexNode, titlePrecededBy, isLastInList }) => (
          <IndexNodeViewer
            key={indexNode.id}
            data-precededby={titlePrecededBy}
            isLastInList={isLastInList}
            node={indexNode}
          />
        ))}
      </LevelContext.Provider>
    </div>
  )
}

type IndexesNodeWithDiffsViewerProps = WithPrecededByProps & {
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEXES>
}

const IndexesNodeWithDiffsViewer: FC<IndexesNodeWithDiffsViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const level = useLevelContext()
  const value = node.value()
  const indexNodes = getIndexChildNodes(node.childrenNodes())

  const titleRowDiffProps: Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities"> = useMemo(
    () => buildRowDiffProps<DdlApiSectionHeaderRowValue>(toNodeDiffState(node)),
    [node],
  )

  const indexViewerContexts = useMemo(
    () => buildIndexViewerContexts(indexNodes),
    [indexNodes],
  )

  const hideLevelIndicatorWhenSideEmpty = useMemo(
    () => isDdlPropertyListSectionUniformWholeNodeChange(node),
    [node],
  )

  if (indexNodes.length === 0) {
    return null
  }

  return (
    <div data-testid="ddl-indexes-node-viewer" className="flex flex-col">
      <TitleRow
        data-precededby={precededBy}
        value={value?.title ?? 'Indexes'}
        expandable={false}
        expanded={true}
        variant={TextValueVariant.h2}
        usage={TitleRowUsage.DdlApiSection}
        {...titleRowDiffProps}
      />
      <LevelContext.Provider value={level + 1}>
        {indexViewerContexts.map(({ indexNode, titlePrecededBy, isLastInList }) => (
          isIndexNodeWithDiffs(indexNode) ? (
            <IndexNodeViewerWithDiffs
              key={indexNode.id}
              data-precededby={titlePrecededBy}
              isLastInList={isLastInList}
              hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
              node={indexNode}
            />
          ) : (
            <IndexNodeViewer
              key={indexNode.id}
              data-precededby={titlePrecededBy}
              isLastInList={isLastInList}
              node={indexNode}
            />
          )
        ))}
      </LevelContext.Provider>
    </div>
  )
}
