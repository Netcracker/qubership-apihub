import { X_AXIS_PADDING_ROWS_ASYNC_API } from '@apihub/components/shared-styles/tailwind-classnames'
import { getJavaApiChildNodes, isJavaApiSectionNode } from '@apihub/utils/javaapi/node-type-checkers'
import { buildJavaApiRowDiff, javaApiRowBackgroundClass } from '@apihub/utils/javaapi/row-diff'
import { JavaApiTreeNode } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/aliases'
import { JavaApiTreeNodeKinds } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/node-kind'
import { FC, useCallback, useMemo } from 'react'
import { DiffFloatingBadgeWrapper } from '../shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper'
import { TextValueVariant } from '../shared-components/TextValue/types'
import { TitleRow } from '../shared-components/TitleRow/TitleRow'
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from '../shared-components/WithPrecededByProps'
import { ChangeInfoRows } from './ChangeInfoRows'
import { JAVA_API_TYPE_KIND_TITLES } from './consts'
import { JavaElementIcon } from './JavaElementIcon'
import { SectionNodeViewer } from './SectionNodeViewer'
import { TypeReference } from './TypeReference'

type ClassNodeViewerProps = WithPrecededByProps & {
  node: JavaApiTreeNode<typeof JavaApiTreeNodeKinds.CLASS>
  noHeading?: boolean
}

export const ClassNodeViewer: FC<ClassNodeViewerProps> = (props) => {
  const { node, noHeading = false, [ATTRIBUTE_PRECEDED_BY]: precededBy = PrecededBy.ROOT } = props
  const value = node.value()
  const sectionNodes = getJavaApiChildNodes(node).filter(isJavaApiSectionNode)

  const titleContent = useCallback(() => (
    <div className="java-class-title flex flex-row items-center">
      {value && <JavaElementIcon kind={value.typeKind} />}
      <span>{value?.displayName}</span>
    </div>
  ), [value])

  const subheader = useCallback(() => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="title-row-subheader-value subheader text">
        {value ? JAVA_API_TYPE_KIND_TITLES[value.typeKind] : ''}
      </span>
    </div>
  ), [value])

  // the class row is highlighted the same way as its members
  const rowDiff = useMemo(() => buildJavaApiRowDiff(value?.compatibility), [value])

  if (!value) {
    return null
  }
  const headerPrecededBy = noHeading ? PrecededBy.ROOT : PrecededBy.PROPERTY_TABLE_HEADER_ROW

  const backgroundClass = javaApiRowBackgroundClass(rowDiff)
  return (
    <div data-testid="java-class-node-viewer" className="flex flex-col">
      <DiffFloatingBadgeWrapper diffType={rowDiff?.diffType} diffTypeCause={undefined}>
        <div className={`flex flex-col w-full ${backgroundClass}`.trim()}>
          {!noHeading && (
            <TitleRow
              data-precededby={precededBy}
              titleContent={titleContent}
              subheader={subheader}
              expandable={false}
              expanded={true}
              variant={TextValueVariant.h1}
            />
          )}
          <div
            data-precededby={headerPrecededBy}
            className={`property-table-subheader-row flex h-full ${X_AXIS_PADDING_ROWS_ASYNC_API}`}
          >
            <span className="property-table-subheader">
              {value.packageName}
              {value.enclosingClassName && (
                <>
                  {' · enclosed in '}
                  <TypeReference type={value.enclosingClassName} />
                </>
              )}
            </span>
          </div>
          <div className={`property-table-entry ${X_AXIS_PADDING_ROWS_ASYNC_API}`}>
            <ChangeInfoRows
              data-precededby={PrecededBy.PROPERTY_TABLE_SUBHEADER_ROW}
              compatibility={value.compatibility}
            />
          </div>
        </div>
      </DiffFloatingBadgeWrapper>
      {sectionNodes.map(sectionNode => (
        <SectionNodeViewer
          key={sectionNode.id}
          data-precededby={PrecededBy.PROPERTY_TABLE_SUBHEADER_ROW}
          node={sectionNode}
        />
      ))}
    </div>
  )
}
