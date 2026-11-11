import { LevelContext, useLevelContext } from '@apihub/contexts/LevelContext'
import { getJavaApiChildNodes, isJavaApiMemberNode } from '@apihub/utils/javaapi/node-type-checkers'
import { JavaApiTreeNode } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/aliases'
import { JavaApiTreeNodeKinds } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/node-kind'
import { FC } from 'react'
import { TextValueVariant } from '../shared-components/TextValue/types'
import { TitleRow } from '../shared-components/TitleRow/TitleRow'
import { TitleRowUsage } from '../shared-components/TitleRow/types'
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from '../shared-components/WithPrecededByProps'
import { MemberNodeViewer } from './MemberNodeViewer'

type SectionNodeViewerProps = WithPrecededByProps & {
  node: JavaApiTreeNode<typeof JavaApiTreeNodeKinds.SECTION>
}

export const SectionNodeViewer: FC<SectionNodeViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props
  const level = useLevelContext()
  const value = node.value()
  const memberNodes = getJavaApiChildNodes(node).filter(isJavaApiMemberNode)

  if (memberNodes.length === 0) {
    return null
  }
  return (
    <div data-testid="java-section-node-viewer" className="flex flex-col">
      <TitleRow
        data-precededby={precededBy}
        value={value?.title ?? ''}
        expandable={false}
        expanded={true}
        variant={TextValueVariant.h2}
        usage={TitleRowUsage.DdlApiSection}
      />
      <LevelContext.Provider value={level + 1}>
        {memberNodes.map(memberNode => (
          <MemberNodeViewer
            key={memberNode.id}
            data-precededby={PrecededBy.DDL_COLUMN_ROW}
            node={memberNode}
          />
        ))}
      </LevelContext.Provider>
    </div>
  )
}
