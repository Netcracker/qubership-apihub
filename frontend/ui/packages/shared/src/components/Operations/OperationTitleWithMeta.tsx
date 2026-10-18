/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { Box, Link, Typography } from '@mui/material'
import { NavLink } from 'react-router-dom'
import type { Path } from '@remix-run/router'
import type { Operation } from '../../entities/operations'
import { isAsyncApiOperation, isGraphQlOperation, isRestOperation } from '../../entities/operations'
import { OverflowTooltip } from '../OverflowTooltip'
import { TextWithOverflowTooltip } from '../TextWithOverflowTooltip'
import { AsyncApiActionChip } from './AsyncApiActionChip'
import { DeprecatedBadge } from './DeprecatedBadge'
import { GraphQlOperationTypeChip } from './GraphQlOperationTypeChip'
import { HttpMethodChip } from './HttpMethodChip'
import type { MethodType } from '../../entities/method-types'
import type { GraphQlOperationType } from '../../entities/graphql-operation-types'
import type { AsyncApiOperationType } from '../../entities/asyncapi-operation-types'
import { API_TYPE_ASYNCAPI, API_TYPE_GRAPHQL, API_TYPE_REST } from '../../entities/api-types'

export type OperationTypeMeta =
  | Readonly<{ apiType: typeof API_TYPE_REST; method: MethodType }>
  | Readonly<{ apiType: typeof API_TYPE_GRAPHQL; operationType: GraphQlOperationType }>
  | Readonly<{ apiType: typeof API_TYPE_ASYNCAPI; action: AsyncApiOperationType }>

type OperationTitleMeta = Readonly<{
  title: string
  subtitle: string
  operationType: OperationTypeMeta
}>

type OperationPathMetaProps = Readonly<{
  subtitle: string
  operationType: OperationTypeMeta
}>

const OperationTypeChip: FC<{ operationType: OperationTypeMeta }> = memo(({ operationType }) => {
  switch (operationType.apiType) {
    case API_TYPE_REST:
      return <HttpMethodChip method={operationType.method} data-testid="OperationPathChip"/>
    case API_TYPE_GRAPHQL:
      return <GraphQlOperationTypeChip operationType={operationType.operationType} data-testid="OperationPathChip"/>
    case API_TYPE_ASYNCAPI:
      return <AsyncApiActionChip action={operationType.action} data-testid="OperationPathChip"/>
  }
})

export function useOperationTitleMeta(operation: Operation): OperationTitleMeta {
  return useMemo(() => getOperationTitleMeta(operation), [operation])
}

export const OperationPathMeta: FC<OperationPathMetaProps> = memo<OperationPathMetaProps>(({
  subtitle,
  operationType,
}) => (
  <Box display="flex" alignItems="center" gap={1} data-testid="OperationPath">
    <OperationTypeChip operationType={operationType}/>
    <TextWithOverflowTooltip tooltipText={subtitle} variant="subtitle2" data-testid="OperationPathSubtitle">
      {subtitle}
    </TextWithOverflowTooltip>
  </Box>
))

OperationPathMeta.displayName = 'OperationPathMeta'

export type OperationTitleWithMetaProps = {
  operation: Operation
  link?: Partial<Path>
  onLinkClick?: () => void
  deprecated?: boolean
  openLinkInNewTab?: boolean
  onlyTitle?: boolean
}

// First Order Component //
export const OperationTitleWithMeta: FC<OperationTitleWithMetaProps> = memo<OperationTitleWithMetaProps>((
  {
    operation,
    link,
    onLinkClick,
    deprecated = false,
    openLinkInNewTab = false,
    onlyTitle = false,
  }) => {

  const { title, subtitle, operationType } = useOperationTitleMeta(operation)

  const titleNode = link
    ? <Typography noWrap variant="subtitle1">
      <Link
        component={NavLink}
        to={link}
        target={openLinkInNewTab ? '_blank' : '_self'}
        onClick={(event) => {
          event.stopPropagation()
          onLinkClick?.()
        }}
      >
        {title}
      </Link>
    </Typography>
    : <Typography noWrap variant="inherit">{title}</Typography>

  return (
    <Box display="flex" flexDirection="column" width="100%">
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        data-testid="OperationTitle"
      >
        <OverflowTooltip title={title}>
          {titleNode}
        </OverflowTooltip>

        {deprecated && <DeprecatedBadge/>}
      </Box>
      {!onlyTitle && <OperationPathMeta subtitle={subtitle} operationType={operationType}/>}
    </Box>
  )
})

function getOperationTitleMeta(operation: Operation): OperationTitleMeta {
  if (isRestOperation(operation)) {
    return {
      title: operation.title,
      subtitle: operation.path,
      operationType: { apiType: API_TYPE_REST, method: operation.method },
    }
  }
  if (isGraphQlOperation(operation)) {
    return {
      title: operation.title,
      subtitle: operation.method,
      operationType: { apiType: API_TYPE_GRAPHQL, operationType: operation.type },
    }
  }
  if (isAsyncApiOperation(operation)) {
    return {
      title: operation.title,
      subtitle: operation.channel,
      operationType: { apiType: API_TYPE_ASYNCAPI, action: operation.action },
    }
  }
  throw new Error('Operation must be either a REST, GraphQL, or AsyncAPI operation')
}
