import { buildJavaApiRowDiff, javaApiRowBackgroundClass } from '@apihub/utils/javaapi/row-diff'
import {
  JavaApiMemberKinds,
  JavaApiTypeKinds,
} from '@netcracker/qubership-apihub-next-data-model/model/javaapi/tree/node-value'
import { JavaApiTreeNode } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/aliases'
import { JavaApiTreeNodeKinds } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/node-kind'
import { FC, Fragment, useCallback, useMemo } from 'react'
import { DiffFloatingBadgeWrapper } from '../shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper'
import { TextValueVariant } from '../shared-components/TextValue/types'
import { TitleRow } from '../shared-components/TitleRow/TitleRow'
import { TitleRowUsage } from '../shared-components/TitleRow/types'
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from '../shared-components/WithPrecededByProps'
import { ChangeInfoRows } from './ChangeInfoRows'
import { JavaElementIcon } from './JavaElementIcon'
import { TypeReference } from './TypeReference'

type MemberNodeViewerProps = WithPrecededByProps & {
  node: JavaApiTreeNode<typeof JavaApiTreeNodeKinds.MEMBER>
}

export const MemberNodeViewer: FC<MemberNodeViewerProps> = (props) => {
  const {
    node,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props
  const value = node.value()

  // `name(Type, Type)` with linked parameter types; a nested class row links to the class itself
  const titleContent = useCallback(() => {
    if (!value) {
      return null
    }
    const iconKind = value.memberKind === JavaApiMemberKinds.NESTED_CLASS
      ? value.typeKind ?? JavaApiTypeKinds.CLASS
      : value.memberKind
    return (
      <div className="java-member-title flex flex-row items-center" title={value.signature.replaceAll('$', '.')}>
        <JavaElementIcon kind={iconKind} />
        <span className="java-member-signature">
          {value.className
            ? (
              <span className="java-member-name">
                <TypeReference type={value.className} />
              </span>
            )
            : <span className="java-member-name">{value.name}</span>}
          {value.parameterTypes && (
            <span className="java-member-parameters">
              (
              {value.parameterTypes.map((parameterType, position) => (
                <Fragment key={position}>
                  {position > 0 && ', '}
                  <TypeReference type={parameterType} />
                </Fragment>
              ))}
              )
            </span>
          )}
        </span>
      </div>
    )
  }, [value])

  // the field type or method return type
  const subheader = useCallback(() => (
    <div className="flex flex-wrap items-center gap-2">
      {value?.type && (
        <span className="title-row-subheader-value subheader text">
          <TypeReference type={value.type} />
        </span>
      )}
    </div>
  ), [value])

  // a changed element is highlighted like a DDL column: background by action, left line by severity
  const rowDiff = useMemo(() => buildJavaApiRowDiff(value?.compatibility), [value])

  if (!value) {
    return null
  }
  const backgroundClass = javaApiRowBackgroundClass(rowDiff)
  return (
    <DiffFloatingBadgeWrapper diffType={rowDiff?.diffType} diffTypeCause={undefined}>
      <div
        data-testid="java-member-node-viewer"
        className={`flex flex-col property-table-entry w-full ${backgroundClass}`.trim()}
      >
        <TitleRow
          data-precededby={precededBy}
          titleContent={titleContent}
          expandable={false}
          expanded={true}
          variant={TextValueVariant.body2}
          subheader={subheader}
          usage={TitleRowUsage.PropertyTableEntry}
        />
        <ChangeInfoRows compatibility={value.compatibility} />
      </div>
    </DiffFloatingBadgeWrapper>
  )
}
